require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  console.log('=== Inspecting Table Schemas ===');
  
  // Try to get payment_gateways with all columns
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log(`❌ Payment gateways error: ${error.message}`);
    } else {
      console.log(`✅ Payment gateways schema:`);
      if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
        console.log('Sample record:', data[0]);
      } else {
        console.log('No records found');
      }
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
  }
  
  // Try to get payment_requests with all columns
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log(`❌ Payment requests error: ${error.message}`);
    } else {
      console.log(`✅ Payment requests schema:`);
      if (data.length > 0) {
        console.log('Columns:', Object.keys(data[0]).join(', '));
        console.log('Sample record:', data[0]);
      } else {
        console.log('No records found');
      }
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
  }
}

async function testWithLogin() {
  console.log('\n=== Testing with Login ===');
  
  try {
    // Try to login with the user we just created
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@kdadks.com',
      password: 'admin123'
    });
    
    if (error) {
      console.log(`❌ Login failed: ${error.message}`);
      return;
    }
    
    console.log(`✅ Login successful! User: ${data.user.email}`);
    
    // Now test access to tables
    console.log('\n--- Testing Authenticated Access ---');
    
    const { data: gateways, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*');
      
    if (gatewayError) {
      console.log(`❌ Gateway access failed: ${gatewayError.message}`);
    } else {
      console.log(`✅ Gateway access successful: ${gateways.length} records`);
      if (gateways.length > 0) {
        console.log('Sample gateway:', gateways[0]);
      }
    }
    
    await supabase.auth.signOut();
    
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
  }
}

async function main() {
  await inspectTables();
  await testWithLogin();
}

main().catch(console.error);
