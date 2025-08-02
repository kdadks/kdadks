import React, { useState } from 'react';
import { exchangeRateService } from '../../services/exchangeRateService';

export const ExchangeRateDebugger: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const testExchangeRateService = async () => {
    setIsLoading(true);
    setResult('🔄 Testing exchange rate service...\n');
    
    try {
      // Test 1: Database health
      setResult(prev => prev + '\n📊 Checking database health...\n');
      const health = await exchangeRateService.getDatabaseHealth();
      setResult(prev => prev + `✅ Database health: ${JSON.stringify(health, null, 2)}\n`);
      
      // Test 2: Try to fetch current rates from APIs
      setResult(prev => prev + '\n🌐 Testing API connectivity...\n');
      try {
        const rates = await exchangeRateService.fetchCurrentRates('INR');
        setResult(prev => prev + `✅ API fetch successful!\n`);
        setResult(prev => prev + `📊 Sample rates: EUR=${rates.rates.EUR}, USD=${rates.rates.USD}\n`);
        
        // Test 3: Try to update database (this will test RLS policies)
        setResult(prev => prev + '\n� Testing database update (RLS policies)...\n');
        const updateSuccess = await exchangeRateService.updateExchangeRates(true);
        setResult(prev => prev + `${updateSuccess ? '✅' : '❌'} Database update: ${updateSuccess ? 'SUCCESS' : 'FAILED'}\n`);
        
        if (updateSuccess) {
          setResult(prev => prev + '\n🎉 All tests completed successfully!\n');
          setResult(prev => prev + '💡 Exchange rate service is working correctly.\n');
        } else {
          setResult(prev => prev + '\n⚠️ Database update failed - this may be an RLS policy issue.\n');
          setResult(prev => prev + '🔧 Run the RLS fix script in your Supabase SQL Editor.\n');
        }
        
      } catch (apiError) {
        setResult(prev => prev + `\n❌ API Error: ${apiError instanceof Error ? apiError.message : String(apiError)}\n`);
        
        // Still test database update even if API fails
        setResult(prev => prev + '\n💾 Testing database update with emergency fallback...\n');
        try {
          const updateSuccess = await exchangeRateService.updateExchangeRates(true);
          setResult(prev => prev + `${updateSuccess ? '✅' : '❌'} Database update: ${updateSuccess ? 'SUCCESS' : 'FAILED'}\n`);
        } catch (dbError) {
          setResult(prev => prev + `\n❌ Database Error: ${dbError instanceof Error ? dbError.message : String(dbError)}\n`);
          
          if (dbError instanceof Error && dbError.message.includes('row-level security')) {
            setResult(prev => prev + '\n🚨 RLS POLICY ERROR DETECTED!\n');
            setResult(prev => prev + '📋 The exchange_rates table has RLS enabled but no insert policy.\n');
            setResult(prev => prev + '🔧 SOLUTION: Run the IMMEDIATE_RLS_FIX.sql script in Supabase.\n');
            setResult(prev => prev + '📂 Location: /IMMEDIATE_RLS_FIX.sql in your project root.\n');
          }
        }
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setResult(prev => prev + `\n❌ Error: ${errorMsg}\n`);
      console.error('Exchange rate test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Exchange Rate Service Debugger</h3>
        <button
          onClick={testExchangeRateService}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Service'}
        </button>
      </div>
      
      {result && (
        <div className="bg-black text-green-400 p-3 rounded font-mono text-sm max-h-96 overflow-y-auto whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  );
};

export default ExchangeRateDebugger;
