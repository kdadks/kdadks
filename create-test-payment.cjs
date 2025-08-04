// Create Test Payment Request
// This script creates a test payment request that can be used to test the complete flow

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestPayment() {
  console.log('🧪 CREATING TEST PAYMENT REQUEST');
  console.log('=' .repeat(50));

  try {
    // Create a new payment request for testing
    const { data: newRequest, error: createError } = await supabase
      .from('payment_requests')
      .insert({
        invoice_id: null,
        gateway_id: '671aa2b3-2b58-43b4-9252-9500b676af41', // Real Razorpay gateway
        amount: 99, // ₹99 for testing
        currency: 'INR',
        description: 'Test Payment - Database Flow Fix',
        status: 'pending',
        customer_email: 'test@kdadks.com',
        customer_phone: '+919876543210',
        customer_name: 'Test Customer - Flow Fix',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating payment request:', createError);
      return;
    }

    console.log('✅ Test payment request created successfully!');
    console.log('📋 Payment Details:');
    console.log(`   ID: ${newRequest.id}`);
    console.log(`   Amount: ₹${newRequest.amount}`);
    console.log(`   Status: ${newRequest.status}`);
    console.log(`   Description: ${newRequest.description}`);
    
    console.log('\n🔗 Payment URL:');
    console.log(`   http://localhost:3002/payment/checkout/${newRequest.id}`);
    
    console.log('\n📋 Test Instructions:');
    console.log('1. Open the payment URL in your browser');
    console.log('2. Fill in customer information');
    console.log('3. Select Razorpay as payment method');
    console.log('4. Complete the payment using test card: 4111 1111 1111 1111');
    console.log('5. Check the database to verify all data is captured');
    
    console.log('\n🔍 Database Check Query:');
    console.log(`SELECT pr.id, pr.status, pr.gateway_order_id, pr.gateway_payment_id, pr.completed_at,`);
    console.log(`       pt.status as tx_status, pt.gateway_transaction_id, pt.payment_method, pt.processed_at`);
    console.log(`FROM payment_requests pr`);
    console.log(`LEFT JOIN payment_transactions pt ON pt.payment_request_id = pr.id`);
    console.log(`WHERE pr.id = '${newRequest.id}';`);

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

createTestPayment().then(() => {
  console.log('\n🏁 Test payment created');
  process.exit(0);
});
