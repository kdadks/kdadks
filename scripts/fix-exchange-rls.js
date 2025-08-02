// Test script to check RLS status and apply fix
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.log('Required environment variables:');
  console.log('- VITE_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixExchangeRatesRLS() {
  console.log('🔍 Checking exchange_rates table RLS status...');
  
  try {
    // 1. Check if table exists and RLS status
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('check_table_rls', { table_name: 'exchange_rates' })
      .single();
    
    if (tableError && !tableError.message.includes('function check_table_rls')) {
      console.error('❌ Error checking table:', tableError);
    }
    
    // 2. Try to query existing policies
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'exchange_rates');
    
    console.log('📋 Current RLS policies for exchange_rates:', policies?.length || 0);
    
    // 3. Test insert permission with current user
    console.log('🧪 Testing insert permission...');
    const { data: testInsert, error: insertError } = await supabase
      .from('exchange_rates')
      .insert({
        base_currency: 'TEST',
        target_currency: 'TEST',
        rate: 1.0,
        date: '2025-01-01'
      })
      .select();
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message);
      console.log('🔧 Applying RLS fix...');
      
      // Read and execute the RLS fix script
      const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-exchange-rates-rls.sql'), 'utf8');
      const statements = sqlScript.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log('📝 Executing:', statement.trim().substring(0, 60) + '...');
          const { error } = await supabase.rpc('exec_sql', { sql: statement.trim() });
          if (error) {
            console.error('❌ SQL Error:', error);
          } else {
            console.log('✅ Success');
          }
        }
      }
      
      // Clean up test record
      await supabase
        .from('exchange_rates')
        .delete()
        .eq('base_currency', 'TEST')
        .eq('target_currency', 'TEST');
      
    } else {
      console.log('✅ Insert permission working correctly');
      // Clean up test record
      await supabase
        .from('exchange_rates')
        .delete()
        .eq('id', testInsert[0].id);
    }
    
    // 4. Test the exchange rate service
    console.log('🧪 Testing exchange rate service...');
    const { data: testRates, error: ratesError } = await supabase
      .from('exchange_rates')
      .select('*')
      .limit(5);
    
    if (ratesError) {
      console.error('❌ Failed to read exchange rates:', ratesError);
    } else {
      console.log('✅ Exchange rates read successfully:', testRates?.length || 0, 'records');
    }
    
    console.log('🎉 Exchange rates RLS check completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Alternative simpler approach: directly execute the SQL
async function directSQLFix() {
  console.log('🔧 Applying direct SQL fix for exchange_rates RLS...');
  
  const sqlCommands = [
    "ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;",
    
    "DROP POLICY IF EXISTS \"exchange_rates_select_policy\" ON exchange_rates;",
    "DROP POLICY IF EXISTS \"exchange_rates_insert_policy\" ON exchange_rates;", 
    "DROP POLICY IF EXISTS \"exchange_rates_update_policy\" ON exchange_rates;",
    
    "CREATE POLICY \"exchange_rates_select_policy\" ON exchange_rates FOR SELECT TO authenticated USING (true);",
    "CREATE POLICY \"exchange_rates_insert_policy\" ON exchange_rates FOR INSERT TO authenticated WITH CHECK (true);",
    "CREATE POLICY \"exchange_rates_update_policy\" ON exchange_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);",
    
    "GRANT SELECT, INSERT, UPDATE ON exchange_rates TO authenticated;",
    "GRANT ALL ON exchange_rates TO service_role;"
  ];
  
  for (const sql of sqlCommands) {
    try {
      console.log('📝 Executing:', sql);
      const { error } = await supabase.rpc('sql', { query: sql });
      if (error) {
        console.error('❌ Error:', error.message);
      } else {
        console.log('✅ Success');
      }
    } catch (err) {
      console.error('❌ Exception:', err.message);
    }
  }
  
  console.log('🎉 Direct SQL fix completed!');
}

// Run the fix
directSQLFix().catch(console.error);
