// Create Test Invoice for Payment Request Testing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestInvoice() {
  console.log('🧪 CREATING TEST INVOICE FOR PAYMENT REQUEST');
  console.log('=' .repeat(60));

  try {
    // First, get a customer to associate with the invoice
    let { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .limit(1);

    if (customerError || !customers || customers.length === 0) {
      console.log('📝 Creating test customer first...');
      const { data: newCustomer, error: createCustomerError } = await supabase
        .from('customers')
        .insert({
          company_name: 'Test Customer Ltd',
          contact_person: 'John Doe',
          email: 'test.customer@example.com',
          phone: '+919876543210'
        })
        .select()
        .single();

      if (createCustomerError) {
        console.error('❌ Failed to create customer:', createCustomerError);
        return;
      }

      customers = [newCustomer];
      console.log('✅ Test customer created:', newCustomer.company_name);
    }

    const customer = customers[0];

    // Get company settings
    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('*')
      .single();

    if (!companySettings) {
      console.error('❌ No company settings found. Please set up company information first.');
      return;
    }

    // Generate invoice number
    const invoiceNumber = `TEST-INV-${Date.now()}`;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        company_id: companySettings.id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        currency_code: 'INR',
        exchange_rate: 1.0,
        subtotal: 1000.00,
        tax_amount: 180.00, // 18% GST
        total_amount: 1180.00,
        inr_total_amount: 1180.00,
        status: 'sent', // Set to sent so it can receive payment requests
        payment_status: 'unpaid',
        notes: 'Test invoice for payment request functionality testing',
        terms_and_conditions: 'Payment due within 30 days'
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ Failed to create invoice:', invoiceError);
      return;
    }

    console.log('✅ Test invoice created successfully!');
    console.log('📋 Invoice Details:');
    console.log(`   Invoice Number: ${invoice.invoice_number}`);
    console.log(`   Customer: ${customer.company_name}`);
    console.log(`   Customer Email: ${customer.email}`);
    console.log(`   Amount: ₹${invoice.total_amount}`);
    console.log(`   Status: ${invoice.status}`);
    console.log(`   Payment Status: ${invoice.payment_status}`);

    // Create invoice items
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .limit(1)
      .single();

    let productId = product?.id;
    if (!product) {
      console.log('📦 Creating test product...');
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: 'Test Service',
          description: 'Test service for invoice testing',
          unit_price: 1000.00,
          currency: 'INR',
          tax_rate: 18,
          hsn_code: '998311',
          unit: 'service'
        })
        .select()
        .single();

      if (productError) {
        console.warn('⚠️ Could not create product:', productError);
      } else {
        productId = newProduct.id;
        console.log('✅ Test product created');
      }
    }

    if (productId) {
      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          product_id: productId,
          description: 'Test Service',
          quantity: 1,
          unit_price: 1000.00,
          tax_rate: 18,
          line_total: 1000.00,
          tax_amount: 180.00
        });

      if (itemError) {
        console.warn('⚠️ Could not create invoice item:', itemError);
      } else {
        console.log('✅ Invoice item created');
      }
    }

    console.log('\n🎯 TESTING INSTRUCTIONS:');
    console.log('1. Open the admin dashboard: http://localhost:3002/admin');
    console.log('2. Go to Invoice Management → Invoices tab');
    console.log(`3. Find invoice: ${invoice.invoice_number}`);
    console.log('4. Click the 💳 (Create Payment Request) button');
    console.log('5. Check your console/network logs for payment request creation');
    console.log('6. Verify payment request and payment link are created in database');

    console.log('\n🔍 Database Verification Queries:');
    console.log(`-- Check payment requests for this invoice:`);
    console.log(`SELECT * FROM payment_requests WHERE invoice_id = '${invoice.id}';`);
    console.log(`-- Check payment links:`);
    console.log(`SELECT * FROM payment_links WHERE payment_request_id IN (SELECT id FROM payment_requests WHERE invoice_id = '${invoice.id}');`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createTestInvoice().then(() => {
  console.log('\n🏁 Test invoice creation completed');
  process.exit(0);
});
