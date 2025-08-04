// Setup Razorpay Payment Gateway in Database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function setupRazorpayGateway() {
  try {
    console.log('🚀 Setting up Razorpay payment gateway...');
    
    // First, check if Razorpay gateway already exists
    const { data: existing, error: checkError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider_type', 'razorpay')
      .maybeSingle();
    
    if (checkError) {
      throw checkError;
    }
    
    if (existing) {
      console.log('✅ Razorpay gateway already exists:', existing.name);
      console.log('📋 Current settings:', existing.settings);
      return existing;
    }
    
    // Insert new Razorpay gateway with test credentials
    const { data, error } = await supabase
      .from('payment_gateways')
      .insert({
        name: 'Razorpay India (Test)',
        provider_type: 'razorpay',
        settings: {
          key_id: 'rzp_test_9WVjBCTiCyayCR',  // Test key from Razorpay docs
          key_secret: 'rzp_test_REPLACE_WITH_YOUR_SECRET', // You need to replace this
          webhook_secret: 'whsec_REPLACE_WITH_WEBHOOK_SECRET'
        },
        is_active: true,  // Enable it for testing
        is_sandbox: true, // Mark as test environment
        currency_support: ['INR'],
        transaction_fee_percentage: 2.50,
        transaction_fee_fixed: 0.00
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Razorpay gateway created successfully!');
    console.log('📋 Gateway details:');
    console.log('   ID:', data.id);
    console.log('   Name:', data.name);
    console.log('   Active:', data.is_active);
    console.log('   Sandbox:', data.is_sandbox);
    console.log('   Key ID:', data.settings.key_id);
    
    console.log('\n⚠️  IMPORTANT: You need to update the key_secret with your actual Razorpay test secret key!');
    console.log('   1. Go to https://dashboard.razorpay.com/app/keys');
    console.log('   2. Copy your test Key Secret');
    console.log('   3. Update the settings in Supabase dashboard or via another script');
    
    return data;
    
  } catch (error) {
    console.error('❌ Error setting up Razorpay gateway:', error);
    process.exit(1);
  }
}

async function main() {
  const gateway = await setupRazorpayGateway();
  
  // Test fetching the gateway
  console.log('\n🔍 Testing gateway retrieval...');
  
  try {
    const { data: testGateway, error: testError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider_type', 'razorpay')
      .eq('is_active', true)
      .single();
    
    if (testError) {
      throw testError;
    }
    
    console.log('✅ Gateway retrieval test successful!');
    console.log('📋 Retrieved gateway:', {
      id: testGateway.id,
      name: testGateway.name,
      provider_type: testGateway.provider_type,
      is_active: testGateway.is_active,
      key_id: testGateway.settings.key_id
    });
    
  } catch (error) {
    console.error('❌ Gateway retrieval test failed:', error);
  }
  
  console.log('\n🎉 Setup complete!');
}

main();
