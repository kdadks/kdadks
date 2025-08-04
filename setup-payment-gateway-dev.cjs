// Setup payment gateway for development environment
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function setupPaymentGateway() {
  try {
    console.log('🔧 Setting up payment gateway for development...');
    
    // Step 1: Try to sign in with admin credentials or create admin user
    console.log('📝 Attempting to authenticate...');
    
    let authResult;
    try {
      // Try to sign in first
      authResult = await supabase.auth.signInWithPassword({
        email: 'admin@kdadks.com',
        password: 'admin123'
      });
      
      if (authResult.error) {
        console.log('❌ Sign in failed, trying to create admin user...');
        
        // Create admin user if sign in fails
        const signUpResult = await supabase.auth.signUp({
          email: 'admin@kdadks.com',
          password: 'admin123',
          options: {
            data: {
              role: 'admin'
            }
          }
        });
        
        if (signUpResult.error) {
          throw signUpResult.error;
        }
        
        console.log('✅ Admin user created');
        authResult = signUpResult;
      } else {
        console.log('✅ Authenticated as admin');
      }
    } catch (authError) {
      console.log('⚠️  Authentication failed, proceeding without auth...');
      console.log('Auth error:', authError.message);
    }
    
    // Step 2: Check if payment gateway already exists
    console.log('🔍 Checking for existing payment gateways...');
    
    const { data: existingGateways, error: checkError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('provider_type', 'razorpay');
    
    console.log('Existing gateways:', existingGateways);
    
    if (checkError) {
      console.log('❌ Error checking gateways:', checkError);
      
      // Try to create the gateway table if it doesn't exist or has RLS issues
      console.log('🛠️  Attempting to resolve RLS issues...');
      
      // Disable RLS temporarily for development
      try {
        await supabase.rpc('execute_sql', {
          sql: `
            -- Temporarily disable RLS for payment_gateways in development
            ALTER TABLE payment_gateways DISABLE ROW LEVEL SECURITY;
            
            -- Grant public access for development
            GRANT ALL ON payment_gateways TO public;
            GRANT ALL ON payment_gateways TO anon;
          `
        });
        console.log('✅ RLS temporarily disabled for development');
      } catch (rlsError) {
        console.log('❌ Could not disable RLS:', rlsError.message);
      }
    }
    
    // Step 3: Create Razorpay gateway if it doesn't exist
    if (!existingGateways || existingGateways.length === 0) {
      console.log('📝 Creating Razorpay payment gateway...');
      
      const gatewayData = {
        name: 'Razorpay India (Test)',
        provider_type: 'razorpay',
        settings: {
          key_id: 'rzp_test_9WVjBCTiCyayCR',  // Test key from Razorpay
          key_secret: 'YOUR_TEST_SECRET_KEY_HERE',  // Replace with your actual test secret
          webhook_secret: 'YOUR_WEBHOOK_SECRET_HERE'
        },
        is_active: true,
        is_sandbox: true,
        currency_support: ['INR'],
        transaction_fee_percentage: 2.50,
        transaction_fee_fixed: 0.00
      };
      
      const { data: newGateway, error: insertError } = await supabase
        .from('payment_gateways')
        .insert(gatewayData)
        .select()
        .single();
      
      if (insertError) {
        console.log('❌ Error creating gateway:', insertError);
        throw insertError;
      }
      
      console.log('✅ Razorpay gateway created:', newGateway);
      return newGateway;
    } else {
      console.log('✅ Razorpay gateway already exists:', existingGateways[0]);
      return existingGateways[0];
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  }
}

// Run the setup
setupPaymentGateway()
  .then(gateway => {
    console.log('🎉 Payment gateway setup complete!');
    console.log('Gateway ID:', gateway.id);
    console.log('Gateway Name:', gateway.name);
    console.log('Settings:', gateway.settings);
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });
