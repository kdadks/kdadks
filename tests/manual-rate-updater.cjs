/**
 * Manual Exchange Rate Update Utility
 * Use this to manually update exchange rates or force daily updates
 */

const { createClient } = require('@supabase/supabase-js');

const config = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || 'your-supabase-url',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key'
};

class ManualRateUpdater {
  constructor() {
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
    this.API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';
    this.FALLBACK_API_URL = 'https://api.fxratesapi.com/latest';
  }

  async fetchRatesFromAPI(baseCurrency = 'INR') {
    const apis = [
      { url: `${this.API_BASE_URL}/${baseCurrency}`, name: 'Primary API' },
      { url: `${this.FALLBACK_API_URL}?base=${baseCurrency}`, name: 'Fallback API' }
    ];

    for (const api of apis) {
      try {
        console.log(`🌐 Fetching from ${api.name}...`);
        const response = await fetch(api.url);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.rates) {
          throw new Error('Invalid response format');
        }

        console.log(`✅ ${api.name} successful - ${Object.keys(data.rates).length} rates`);
        return data;
      } catch (error) {
        console.warn(`❌ ${api.name} failed: ${error.message}`);
        continue;
      }
    }

    throw new Error('All APIs failed');
  }

  async updateRates(forceUpdate = false) {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`🔄 Updating exchange rates for ${today}${forceUpdate ? ' (FORCED)' : ''}...`);

    try {
      // Check existing rates unless forcing update
      if (!forceUpdate) {
        const { count } = await this.supabase
          .from('exchange_rates')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);
        
        if (count > 0) {
          console.log(`📅 Rates for ${today} already exist (${count} records). Use --force to override.`);
          return { success: true, message: 'Rates already exist', updated: 0 };
        }
      }

      // Fetch fresh rates
      const ratesData = await this.fetchRatesFromAPI('INR');
      
      // Prepare batch data
      const ratesToInsert = [];
      const majorCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'JPY', 'CNY', 'CHF', 'NZD'];
      
      // Add INR to other currencies
      for (const [currency, rate] of Object.entries(ratesData.rates)) {
        if (currency !== 'INR' && typeof rate === 'number' && rate > 0) {
          ratesToInsert.push({
            base_currency: 'INR',
            target_currency: currency,
            rate: rate,
            date: today,
            source: 'manual-update'
          });
        }
      }

      // Add inverse rates for major currencies (other to INR)
      for (const currency of majorCurrencies) {
        if (ratesData.rates[currency] && ratesData.rates[currency] > 0) {
          const inverseRate = 1 / ratesData.rates[currency];
          ratesToInsert.push({
            base_currency: currency,
            target_currency: 'INR',
            rate: inverseRate,
            date: today,
            source: 'manual-update'
          });
        }
      }

      if (ratesToInsert.length === 0) {
        throw new Error('No valid rates to insert');
      }

      console.log(`📊 Preparing to insert ${ratesToInsert.length} exchange rate records...`);

      // Batch insert with conflict resolution
      const { error } = await this.supabase
        .from('exchange_rates')
        .upsert(ratesToInsert, {
          onConflict: 'base_currency,target_currency,date',
          ignoreDuplicates: false
        });

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      console.log(`✅ Successfully updated ${ratesToInsert.length} exchange rates for ${today}`);
      
      // Show sample rates
      const sampleRates = ratesToInsert
        .filter(r => r.target_currency === 'INR')
        .slice(0, 5);
      
      console.log('📋 Sample rates updated:');
      sampleRates.forEach(rate => {
        console.log(`   1 ${rate.base_currency} = ${rate.rate.toFixed(4)} INR`);
      });

      return { 
        success: true, 
        message: 'Update completed', 
        updated: ratesToInsert.length,
        date: today 
      };

    } catch (error) {
      console.error('❌ Update failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async checkRatesCoverage() {
    console.log('📊 Checking Exchange Rates Coverage...\n');
    
    const today = new Date().toISOString().split('T')[0];
    const majorCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'JPY', 'CNY'];
    
    try {
      // Get today's rates
      const { data: todayRates } = await this.supabase
        .from('exchange_rates')
        .select('base_currency, target_currency, rate')
        .eq('date', today);

      console.log(`📅 Rates available for ${today}: ${todayRates?.length || 0}`);
      
      if (todayRates && todayRates.length > 0) {
        // Check coverage for major currencies to INR
        console.log('\n💱 Major Currency → INR Coverage:');
        for (const currency of majorCurrencies) {
          const rate = todayRates.find(r => r.base_currency === currency && r.target_currency === 'INR');
          if (rate) {
            console.log(`✅ ${currency} → INR: ${rate.rate.toFixed(4)}`);
          } else {
            console.log(`❌ ${currency} → INR: Missing`);
          }
        }
        
        // Check coverage for INR to major currencies
        console.log('\n💱 INR → Major Currency Coverage:');
        for (const currency of majorCurrencies) {
          const rate = todayRates.find(r => r.base_currency === 'INR' && r.target_currency === currency);
          if (rate) {
            console.log(`✅ INR → ${currency}: ${rate.rate.toFixed(4)}`);
          } else {
            console.log(`❌ INR → ${currency}: Missing`);
          }
        }
      } else {
        console.log('❌ No rates found for today');
      }

      // Get latest available rates
      const { data: latestRates } = await this.supabase
        .from('exchange_rates')
        .select('date')
        .order('date', { ascending: false })
        .limit(1);

      if (latestRates && latestRates.length > 0) {
        console.log(`\n📈 Latest rates available: ${latestRates[0].date}`);
      }

      return todayRates || [];
    } catch (error) {
      console.error('❌ Coverage check failed:', error.message);
      return [];
    }
  }

  async cleanOldRates(daysToKeep = 90) {
    console.log(`🧹 Cleaning old exchange rates (keeping last ${daysToKeep} days)...`);
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
      
      const { count } = await this.supabase
        .from('exchange_rates')
        .delete()
        .lt('date', cutoffDateStr);

      console.log(`✅ Cleaned ${count || 0} old exchange rate records (before ${cutoffDateStr})`);
      return { success: true, deleted: count || 0, cutoffDate: cutoffDateStr };
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const updater = new ManualRateUpdater();

  console.log('🔧 MANUAL EXCHANGE RATE UPDATER');
  console.log('='.repeat(35));

  switch (command) {
    case 'update':
      const forceUpdate = args.includes('--force');
      await updater.updateRates(forceUpdate);
      break;
      
    case 'check':
      await updater.checkRatesCoverage();
      break;
      
    case 'clean':
      const days = parseInt(args[1]) || 90;
      await updater.cleanOldRates(days);
      break;
      
    default:
      console.log('📖 Available Commands:');
      console.log('   node manual-rate-updater.js update [--force]');
      console.log('   node manual-rate-updater.js check');
      console.log('   node manual-rate-updater.js clean [days]');
      console.log('');
      console.log('Examples:');
      console.log('   node manual-rate-updater.js update           # Update if no rates for today');
      console.log('   node manual-rate-updater.js update --force   # Force update even if rates exist');
      console.log('   node manual-rate-updater.js check            # Check current coverage');
      console.log('   node manual-rate-updater.js clean 30         # Keep only last 30 days');
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ManualRateUpdater };
