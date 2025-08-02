// Updated test script with the new API endpoints
async function testExchangeAPIs() {
  const apis = [
    'https://api.exchangerate-api.com/v4/latest/INR',
    'https://api.fxratesapi.com/latest?base=INR',
    'https://open.er-api.com/v6/latest/INR',
    'https://api.exchangerate.host/latest?base=INR',
    'https://api.currencyapi.com/v3/latest?apikey=FREE&base_currency=INR',
    'https://v6.exchangerate-api.com/v6/latest/INR'
  ];
  
  console.log('🧪 Testing Updated ExchangeRate API connectivity...\n');
  
  for (const [index, url] of apis.entries()) {
    try {
      console.log(`${index + 1}. Testing: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'KDADKS-Test/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS - Status: ${response.status}`);
        console.log(`   📊 Sample data: EUR=${data.rates?.EUR || data.data?.EUR?.value || 'N/A'}, USD=${data.rates?.USD || data.data?.USD?.value || 'N/A'}\n`);
      } else {
        console.log(`   ❌ HTTP ERROR - Status: ${response.status} ${response.statusText}\n`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ NETWORK ERROR - ${errorMsg}\n`);
    }
  }
  
  console.log('🔚 Updated API connectivity test completed.');
}

testExchangeAPIs().catch(console.error);
