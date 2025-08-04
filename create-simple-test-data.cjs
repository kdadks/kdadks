// Create Simple Test Data for Invoice Payment Request
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Use the service role key to bypass RLS for testing
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
// Use service key if available to bypass RLS
const adminSupabase = serviceKey ? createClient(supabaseUrl, serviceKey) : supabase;

async function createSimpleTestData() {
  console.log('🧪 CREATING SIMPLE TEST DATA FOR INVOICE PAYMENT REQUEST');
  console.log('=' .repeat(70));

  try {
    // Create minimal customer using admin client
    console.log('📝 Creating test customer...');
    const { data: customer, error: customerError } = await adminSupabase
      .from('customers')
      .upsert({
        id: 'test-customer-' + Date.now(),
        company_name: 'Test Customer Ltd',
        contact_person: 'John Doe',
        email: 'test.customer@example.com',
        phone: '+919876543210'
      }, { onConflict: 'email' })
      .select()
      .single();

    if (customerError) {
      console.error('❌ Customer creation failed:', customerError);
      console.log('🔄 Trying to find existing customer...');
      
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('*')
        .limit(1)
        .single();
        
      if (existingCustomer) {
        console.log('✅ Using existing customer:', existingCustomer.company_name);
        customer = existingCustomer;
      } else {
        console.error('❌ No customers available. Please create one through the admin panel first.');
        return;
      }
    } else {
      console.log('✅ Test customer created:', customer.company_name);
    }

    // Create minimal company settings if not exists
    console.log('🏢 Checking company settings...');
    let { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (!companySettings) {
      console.log('📝 Creating basic company settings...');
      const { data: newCompanySettings, error: companyError } = await adminSupabase
        .from('company_settings')
        .upsert({
          id: 'default-company',
          company_name: 'KDADKS Service Private Limited',
          email: 'kdadks@outlook.com',
          phone: '+91 7982303199',
          address: 'Lucknow, India',
          currency: 'INR',
          tax_rate: 18
        })
        .select()
        .single();

      if (companyError) {
        console.error('❌ Company settings creation failed:', companyError);
        console.log('ℹ️ Using default values...');
        companySettings = {
          id: 'default-company',
          company_name: 'KDADKS Service Private Limited'
        };
      } else {
        companySettings = newCompanySettings;
        console.log('✅ Company settings created');
      }
    } else {
      console.log('✅ Company settings found');
    }

    // Create test invoice
    console.log('📄 Creating test invoice...');
    const invoiceNumber = `TEST-${Date.now()}`;
    
    const { data: invoice, error: invoiceError } = await adminSupabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        company_id: companySettings.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency_code: 'INR',
        exchange_rate: 1.0,
        subtotal: 1000.00,
        tax_amount: 180.00,
        total_amount: 1180.00,
        inr_total_amount: 1180.00,
        status: 'sent',
        payment_status: 'unpaid',
        notes: 'Test invoice for payment request functionality',
        terms_and_conditions: 'Payment due within 30 days'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Invoice creation failed:', invoiceError);
      return;
    }

    console.log('✅ Test invoice created successfully!');
    console.log('\n📋 Test Data Summary:');
    console.log(`   Customer: ${customer.company_name} (${customer.email})`);
    console.log(`   Invoice: ${invoice.invoice_number}`);
    console.log(`   Amount: ₹${invoice.total_amount}`);
    console.log(`   Status: ${invoice.status} / ${invoice.payment_status}`);

    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('1. Open admin dashboard: http://localhost:3002/admin');
    console.log('2. Navigate to Invoice Management');
    console.log('3. Look for the Invoices tab/section');
    console.log(`4. Find invoice: ${invoice.invoice_number}`);
    console.log('5. Click the 💳 (Create Payment Request) button');
    console.log('6. Check browser console for logs');
    console.log('7. Verify email is sent (check console output)');

    console.log('\n🔍 Payment Request Verification:');
    console.log('After clicking the payment request button, check:');
    console.log('- Browser console for success/error messages');
    console.log('- Network tab for email sending requests');
    console.log('- Database for payment_requests and payment_links records');

    console.log('\n💾 Database Check Queries:');
    console.log(`-- Payment requests for this invoice:`);
    console.log(`SELECT * FROM payment_requests WHERE invoice_id = '${invoice.id}';`);
    console.log(`-- Payment links:`);
    console.log(`SELECT * FROM payment_links WHERE payment_request_id IN (SELECT id FROM payment_requests WHERE invoice_id = '${invoice.id}');`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createSimpleTestData().then(() => {
  console.log('\n🏁 Test data creation completed');
  process.exit(0);
});
