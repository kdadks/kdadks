const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://evezqllekdbazgkjwwjy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2ZXpxbGxla2RiYXpna2p3d2p5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI5NDg4MTQsImV4cCI6MjA0ODUyNDgxNH0.dPUbM4N2v0ErmBWDRGdJo5Qam8TKe1qPZmNvvmJcR3g';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUKCurrency() {
  try {
    console.log('🔍 Testing UK country and currency data...');
    
    // Test 1: Get all countries
    const { data: allCountries, error: allError } = await supabase
      .from('countries')
      .select('*')
      .order('name');
    
    if (allError) {
      console.error('❌ Error fetching countries:', allError);
      return;
    }
    
    console.log('📊 Total countries in database:', allCountries.length);
    
    // Test 2: Find UK specifically
    const ukCountries = allCountries.filter(country => 
      country.name.toLowerCase().includes('kingdom') || 
      country.code === 'GBR' ||
      country.code === 'UK' ||
      country.code === 'GB'
    );
    
    console.log('🇬🇧 UK country data:', ukCountries);
    
    // Test 3: Get UK by exact name
    const { data: ukByName, error: ukError } = await supabase
      .from('countries')
      .select('*')
      .eq('name', 'United Kingdom')
      .single();
      
    if (ukError) {
      console.error('❌ Error fetching UK by name:', ukError);
    } else {
      console.log('✅ UK by name:', ukByName);
    }
    
    // Test 4: Test customer creation with UK
    if (ukByName) {
      console.log('🧪 Testing customer creation with UK...');
      
      const testCustomer = {
        company_name: 'Test UK Company',
        contact_person: 'John Smith',
        email: 'test@uk.com',
        phone: '+44-123-456-7890',
        address_line1: '123 Test Street',
        city: 'London',
        state: 'England',
        postal_code: 'SW1A 1AA',
        country_id: ukByName.id,
        gstin: '',
        pan: '',
        credit_limit: 0,
        payment_terms: 30
      };
      
      const { data: createdCustomer, error: createError } = await supabase
        .from('customers')
        .insert(testCustomer)
        .select(`
          *,
          country:countries(*)
        `)
        .single();
        
      if (createError) {
        console.error('❌ Error creating test customer:', createError);
      } else {
        console.log('✅ Test customer created:', {
          id: createdCustomer.id,
          name: createdCustomer.company_name,
          country_id: createdCustomer.country_id,
          country: createdCustomer.country
        });
        
        // Clean up - delete test customer
        await supabase
          .from('customers')
          .delete()
          .eq('id', createdCustomer.id);
          
        console.log('🧹 Test customer cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUKCurrency();
