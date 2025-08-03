require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestEnvironment() {
  console.log('=== Setting Up Test Environment ===');
  
  try {
    // Just try to access the database without authentication first
    console.log('=== Testing Database Access (No Auth) ===');
    
    const { data: noAuthGateways, error: noAuthGatewayError } = await supabase
      .from('payment_gateways')
      .select('*');
      
    if (noAuthGatewayError) {
      console.log(`❌ Gateway access error (no auth): ${noAuthGatewayError.message}`);
      
      // If the error is about authentication, let's try creating sample data anyway
      if (noAuthGatewayError.message.includes('row-level security') || noAuthGatewayError.message.includes('permission')) {
        console.log('🔒 Database requires authentication - that\'s expected with RLS');
      }
    } else {
      console.log(`✅ Payment gateways accessible without auth: ${noAuthGateways.length} records`);
    }
    
    // Try with the user we created earlier
    console.log('\n=== Testing with Previous User ===');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@kdadks.com',
      password: 'admin123'
    });
    
    if (loginError) {
      console.log(`❌ Login failed: ${loginError.message}`);
      return false;
    }
    
    console.log(`✅ Login successful: ${loginData.user.email}`);
    
    // Now test payment gateway access
    console.log('\n=== Testing Payment Gateway Access ===');
    
    const { data: gateways, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*');
      
    if (gatewayError) {
      console.log(`❌ Gateway access error: ${gatewayError.message}`);
      
      // If no data exists, let's create some sample gateways
      console.log('\n=== Creating Sample Payment Gateways ===');
      
      const sampleGateways = [
        {
          name: 'Razorpay',
          provider_type: 'razorpay',
          is_active: true,
          is_sandbox: true,
          currency_support: ['INR', 'USD'],
          transaction_fee_percentage: 2.5,
          transaction_fee_fixed: 0,
          settings: {
            api_key: 'test_key_123',
            secret_key: 'test_secret_456'
          }
        },
        {
          name: 'Stripe',
          provider_type: 'stripe',
          is_active: true,
          is_sandbox: true,
          currency_support: ['USD', 'EUR', 'GBP'],
          transaction_fee_percentage: 2.9,
          transaction_fee_fixed: 0.30,
          settings: {
            publishable_key: 'pk_test_123',
            secret_key: 'sk_test_456'
          }
        },
        {
          name: 'PayPal',
          provider_type: 'paypal',
          is_active: false,
          is_sandbox: true,
          currency_support: ['USD', 'EUR', 'GBP', 'INR'],
          transaction_fee_percentage: 3.5,
          transaction_fee_fixed: 0,
          settings: {
            client_id: 'paypal_client_123',
            client_secret: 'paypal_secret_456'
          }
        }
      ];
      
      for (const gateway of sampleGateways) {
        const { data: created, error: createError } = await supabase
          .from('payment_gateways')
          .insert(gateway)
          .select()
          .single();
          
        if (createError) {
          console.log(`❌ Failed to create ${gateway.name}: ${createError.message}`);
        } else {
          console.log(`✅ Created gateway: ${gateway.name} (ID: ${created.id})`);
        }
      }
      
      // Try accessing gateways again
      const { data: newGateways, error: newGatewayError } = await supabase
        .from('payment_gateways')
        .select('*');
        
      if (newGatewayError) {
        console.log(`❌ Still can't access gateways: ${newGatewayError.message}`);
      } else {
        console.log(`✅ Successfully created and accessed ${newGateways.length} gateways`);
      }
      
    } else {
      console.log(`✅ Payment gateways accessible: ${gateways.length} records`);
      gateways.forEach(gateway => {
        console.log(`  - ${gateway.name} (${gateway.provider_type}, active: ${gateway.is_active})`);
      });
    }
    
    // Test payment request access
    console.log('\n=== Testing Payment Request Access ===');
    
    const { data: requests, error: requestError } = await supabase
      .from('payment_requests')
      .select('*')
      .limit(5);
      
    if (requestError) {
      console.log(`❌ Payment request access error: ${requestError.message}`);
    } else {
      console.log(`✅ Payment requests accessible: ${requests.length} records`);
    }
    
    await supabase.auth.signOut();
    console.log('✅ Test environment setup complete');
    return true;
    
  } catch (error) {
    console.log(`❌ Setup error: ${error.message}`);
    return false;
  }
}

setupTestEnvironment();
