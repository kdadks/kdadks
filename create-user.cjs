require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUser() {
  console.log('=== Creating Test User ===');
  
  const testEmail = 'admin@kdadks.com';
  const testPassword = 'admin123';
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
    });
    
    if (error) {
      console.log(`❌ User creation failed: ${error.message}`);
    } else {
      console.log(`✅ User created successfully!`);
      console.log(`User ID: ${data.user?.id}`);
      console.log(`Email: ${data.user?.email}`);
      console.log(`Confirmation required: ${!data.user?.email_confirmed_at}`);
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
  }
}

async function checkDatabase() {
  console.log('\n=== Checking Database Tables ===');
  
  // Check payment_gateways without auth
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('id, name, type, is_active')
      .limit(5);
      
    if (error) {
      console.log(`❌ Payment gateways error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Payment gateways accessible: ${data.length} records`);
      data.forEach(gateway => {
        console.log(`  - ${gateway.name} (${gateway.type}, active: ${gateway.is_active})`);
      });
    }
  } catch (error) {
    console.log(`❌ Exception checking gateways: ${error.message}`);
  }
  
  // Check payment_requests without auth
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('id, title, amount, status')
      .limit(5);
      
    if (error) {
      console.log(`❌ Payment requests error: ${error.message} (Code: ${error.code})`);
    } else {
      console.log(`✅ Payment requests accessible: ${data.length} records`);
    }
  } catch (error) {
    console.log(`❌ Exception checking requests: ${error.message}`);
  }
}

async function main() {
  await checkDatabase();
  await createTestUser();
}

main().catch(console.error);
