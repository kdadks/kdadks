/**
 * Netlify Scheduled Function — runs on the 1st of every month at 00:05 UTC.
 * Finds all active subscriptions whose next_billing_date is today or overdue,
 * generates a DRAFT invoice for each using the existing invoice format,
 * then advances next_billing_date by one billing cycle.
 *
 * Invoices are stored with status = 'draft' and must be manually sent by the admin.
 */

const { createClient } = require('@supabase/supabase-js');

let fetch;
try { fetch = require('node-fetch'); } catch { fetch = globalThis.fetch; }

exports.handler = async (event) => {
  // Allow both scheduled invocations and manual triggers (for testing)
  if (event.type !== 'scheduled' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return { statusCode: 500, body: 'Missing Supabase credentials' };
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const today = new Date().toISOString().split('T')[0];
  console.log(`[subscription-invoices] Running for date: ${today}`);

  try {
    // 1. Fetch due active subscriptions
    const { data: dueSubscriptions, error: subError } = await supabase
      .from('customer_subscriptions')
      .select(`
        id,
        customer_id,
        plan_id,
        billing_interval,
        next_billing_date,
        notes,
        customer:customers(
          id, company_name, contact_person, email,
          country:countries(currency_code)
        ),
        plan:subscription_plans(
          id, name, description, price, currency_code, billing_interval, plan_type
        )
      `)
      .eq('status', 'active')
      .lte('next_billing_date', today);

    if (subError) throw subError;

    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      console.log('[subscription-invoices] No subscriptions due today.');
      return { statusCode: 200, body: JSON.stringify({ generated: 0, message: 'No subscriptions due' }) };
    }

    console.log(`[subscription-invoices] Found ${dueSubscriptions.length} due subscription(s).`);

    // 2. Fetch default company settings
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (companyError || !companySettings) {
      throw new Error('Default company settings not found');
    }

    // 3. Fetch invoice settings for number generation
    const { data: invoiceSettings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !invoiceSettings) {
      throw new Error('Invoice settings not found');
    }

    const results = { generated: 0, skipped: 0, errors: [] };

    for (const sub of dueSubscriptions) {
      try {
        const plan = sub.plan;
        const customer = sub.customer;

        if (!plan || !customer) {
          console.warn(`[subscription-invoices] Skipping sub ${sub.id}: missing plan or customer`);
          results.skipped++;
          continue;
        }

        // Determine billing currency: use plan's currency (may differ from customer's default)
        const currencyCode = plan.currency_code || 'INR';

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber(supabase, invoiceSettings);

        // Build line item description
        const billingPeriod = formatBillingPeriod(sub.next_billing_date, plan.billing_interval);
        const itemName = `${plan.name} Subscription`;
        const itemDescription = `${plan.plan_type.charAt(0).toUpperCase() + plan.plan_type.slice(1)} plan — ${billingPeriod}`;

        // Create the invoice as draft (status = 'draft', admin must send manually)
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            invoice_number: invoiceNumber,
            customer_id: sub.customer_id,
            company_settings_id: companySettings.id,
            subscription_id: sub.id,
            invoice_date: today,
            due_date: addDays(today, invoiceSettings.due_days || 30),
            // Amounts
            subtotal: plan.price,
            discount_amount: 0,
            discount_value: 0,
            tax_amount: 0,
            total_amount: plan.price,
            currency_code: currencyCode,
            // INR columns (same as original if already INR)
            original_currency_code: currencyCode,
            original_subtotal: plan.price,
            original_tax_amount: 0,
            original_total_amount: plan.price,
            inr_subtotal: currencyCode === 'INR' ? plan.price : null,
            inr_tax_amount: currencyCode === 'INR' ? 0 : null,
            inr_total_amount: currencyCode === 'INR' ? plan.price : null,
            exchange_rate: currencyCode === 'INR' ? 1.0 : null,
            exchange_rate_date: today,
            // Status — draft so admin sends manually
            status: 'draft',
            payment_status: 'pending',
            // Notes from the subscription
            notes: sub.notes
              ? `Subscription auto-invoice. Note: ${sub.notes}`
              : 'Subscription auto-invoice. Please review before sending.',
            created_by: 'system',
          })
          .select('id')
          .single();

        if (invoiceError) throw invoiceError;

        // Insert the single line item
        const { error: itemError } = await supabase.from('invoice_items').insert({
          invoice_id: invoice.id,
          item_name: itemName,
          description: itemDescription,
          quantity: 1,
          unit: 'month',
          unit_price: plan.price,
          line_total: plan.price,
          tax_rate: 0,
          tax_amount: 0,
          original_unit_price: plan.price,
          original_line_total: plan.price,
          original_tax_amount: 0,
          inr_unit_price: currencyCode === 'INR' ? plan.price : null,
          inr_line_total: currencyCode === 'INR' ? plan.price : null,
          inr_tax_amount: currencyCode === 'INR' ? 0 : null,
          is_service_item: false,
        });

        if (itemError) throw itemError;

        // Advance next_billing_date
        const nextDate = advanceBillingDate(sub.next_billing_date, plan.billing_interval);
        const { error: updateError } = await supabase
          .from('customer_subscriptions')
          .update({
            next_billing_date: nextDate,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sub.id);

        if (updateError) throw updateError;

        console.log(
          `[subscription-invoices] Created draft invoice ${invoiceNumber} for customer ${customer.company_name || customer.contact_person} (sub: ${sub.id})`
        );
        results.generated++;
      } catch (err) {
        const msg = `Failed for sub ${sub.id}: ${err instanceof Error ? err.message : String(err)}`;
        console.error(`[subscription-invoices] ${msg}`);
        results.errors.push(msg);
      }
    }

    console.log(`[subscription-invoices] Done. Generated: ${results.generated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
    return {
      statusCode: 200,
      body: JSON.stringify(results),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[subscription-invoices] Fatal error: ${message}`);
    return { statusCode: 500, body: JSON.stringify({ error: message }) };
  }
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function generateInvoiceNumber(supabase, settings) {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');

  // Count existing invoices to determine next sequential number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true });

  const seq = (count || 0) + 1;
  const numStr = seq < 1000 ? seq.toString().padStart(3, '0') : seq.toString();

  let num = settings.number_format || 'YYYY-MM-####';
  num = num.replace(/PREFIX/g, settings.invoice_prefix || 'INV');
  num = num.replace(/YYYY/g, year.toString());
  num = num.replace(/MM/g, month);
  num = num.replace(/####/g, numStr);
  num = num.replace(/###/g, numStr);
  num = num.replace(/NNNN/g, numStr);
  num = num.replace(/NNN/g, numStr);
  if (settings.invoice_suffix) {
    num = num.replace(/SUFFIX/g, settings.invoice_suffix);
  }

  // Update the counter in invoice_settings
  await supabase
    .from('invoice_settings')
    .update({ current_number: seq + 1 })
    .eq('id', settings.id);

  return num;
}

function advanceBillingDate(fromDate, interval) {
  const d = new Date(fromDate);
  if (interval === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d.toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatBillingPeriod(billingDate, interval) {
  const d = new Date(billingDate);
  if (interval === 'monthly') {
    return d.toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  const end = new Date(billingDate);
  end.setFullYear(end.getFullYear() + 1);
  return `${d.getFullYear()}–${end.getFullYear()}`;
}
