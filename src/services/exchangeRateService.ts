import { supabase, isSupabaseConfigured } from '../config/supabase';
import type { ExchangeRateApiResponse, CurrencyConversion } from '../types/invoice';

class ExchangeRateService {
  private readonly API_BASE_URL = 'https://api.exchangerate-api.com/v4/latest';
  private readonly FALLBACK_API_URL = 'https://api.fxratesapi.com/latest';
  private readonly BACKUP_API_URL = 'https://api.fixer.io/latest';
  private readonly LIVE_API_URL = 'https://api.currencyapi.com/v3/latest'; // More accurate rates
  private readonly XE_COMPATIBLE_API = 'https://v6.exchangerate-api.com/v6/latest'; // XE.com compatible
  
  // Enhanced fallback rates (updated to current market values - Aug 2025)
  private readonly EMERGENCY_FALLBACK_RATES: { [key: string]: number } = {
    'USD': 83.15,     // 1 USD = 83.15 INR
    'GBP': 116.05,    // 1 GBP = 116.05 INR (updated from xe.com)
    'EUR': 101.147,   // 1 EUR = 101.147 INR (updated from xe.com - was 101.15)
    'AUD': 55.30,     // 1 AUD = 55.30 INR
    'CAD': 61.20,     // 1 CAD = 61.20 INR
    'SGD': 62.10,     // 1 SGD = 62.10 INR
    'AED': 22.60,     // 1 AED = 22.60 INR
    'SAR': 22.15,     // 1 SAR = 22.15 INR
    'JPY': 0.57,      // 1 JPY = 0.57 INR
    'CNY': 11.60,     // 1 CNY = 11.60 INR
    'CHF': 93.20,     // 1 CHF = 93.20 INR
    'NZD': 50.80,     // 1 NZD = 50.80 INR
  };

  /**
   * Get exchange rate directly from database for specific date
   */
  private async getDatabaseRate(fromCurrency: string, toCurrency: string, date: string): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate')
        .eq('base_currency', fromCurrency)
        .eq('target_currency', toCurrency)
        .eq('date', date)
        .single();

      if (error || !data) {
        return null;
      }

      return parseFloat(data.rate);
    } catch (error) {
      console.error(`Error fetching database rate for ${fromCurrency}→${toCurrency} on ${date}:`, error);
      return null;
    }
  }

  /**
   * Get recent exchange rate from database (within specified days)
   */
  private async getRecentDatabaseRate(fromCurrency: string, toCurrency: string, withinDays: number = 7): Promise<number | null> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - withinDays);
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('rate, date')
        .eq('base_currency', fromCurrency)
        .eq('target_currency', toCurrency)
        .gte('date', dateThreshold.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return parseFloat(data.rate);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get emergency fallback rate when all else fails
   */
  private getEmergencyFallbackRate(fromCurrency: string, toCurrency: string): number | null {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    // Direct rate available
    if (fromCurrency !== 'INR' && toCurrency === 'INR') {
      return this.EMERGENCY_FALLBACK_RATES[fromCurrency] || null;
    }

    // Inverse rate calculation
    if (fromCurrency === 'INR' && toCurrency !== 'INR') {
      const inverseRate = this.EMERGENCY_FALLBACK_RATES[toCurrency];
      return inverseRate ? (1 / inverseRate) : null;
    }

    // Cross rate calculation via INR
    if (fromCurrency !== 'INR' && toCurrency !== 'INR') {
      const fromToINR = this.EMERGENCY_FALLBACK_RATES[fromCurrency];
      const toToINR = this.EMERGENCY_FALLBACK_RATES[toCurrency];
      
      if (fromToINR && toToINR) {
        return fromToINR / toToINR;
      }
    }

    return null;
  }

  /**
   * Get exchange rate from database with smart fallback
   * This is the primary method that should be used for all conversions
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string, date?: string): Promise<number | null> {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    if (!isSupabaseConfigured) {
      console.warn('Database not configured, using emergency fallback rates');
      return this.getEmergencyFallbackRate(fromCurrency, toCurrency);
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      // Primary: Try direct conversion from database
      console.log(`🔍 Checking database for ${fromCurrency} → ${toCurrency} on ${targetDate}`);
      
      const directRate = await this.getDatabaseRate(fromCurrency, toCurrency, targetDate);
      if (directRate) {
        console.log(`✅ Found direct rate in database: 1 ${fromCurrency} = ${directRate} ${toCurrency}`);
        return directRate;
      }

      // Secondary: Try inverse conversion if direct not found
      const inverseRate = await this.getDatabaseRate(toCurrency, fromCurrency, targetDate);
      if (inverseRate && inverseRate !== 0) {
        const calculatedRate = 1 / inverseRate;
        console.log(`✅ Found inverse rate in database: 1 ${toCurrency} = ${inverseRate} ${fromCurrency}, calculated: 1 ${fromCurrency} = ${calculatedRate} ${toCurrency}`);
        return calculatedRate;
      }

      // Tertiary: Try via INR conversion (most common scenario)
      if (fromCurrency !== 'INR' && toCurrency !== 'INR') {
        const fromToINR = await this.getDatabaseRate(fromCurrency, 'INR', targetDate);
        const inrToTarget = await this.getDatabaseRate('INR', toCurrency, targetDate);
        
        if (fromToINR && inrToTarget) {
          const crossRate = fromToINR * inrToTarget;
          console.log(`✅ Found cross rate via INR: ${fromCurrency} → INR (${fromToINR}) → ${toCurrency} (${inrToTarget}) = ${crossRate}`);
          return crossRate;
        }
      }

      // Quaternary: Check for recent rates (within 7 days)
      console.log(`🔍 No rate found for ${targetDate}, checking recent rates...`);
      const recentRate = await this.getRecentDatabaseRate(fromCurrency, toCurrency, 7);
      if (recentRate) {
        console.log(`⏰ Found recent rate (within 7 days): 1 ${fromCurrency} = ${recentRate} ${toCurrency}`);
        return recentRate;
      }

      // Last resort: Try to update rates and check again
      console.log(`🔄 No recent rates found, attempting to update exchange rates...`);
      const updateSuccess = await this.updateExchangeRates(false);
      
      if (updateSuccess) {
        const freshRate = await this.getDatabaseRate(fromCurrency, toCurrency, targetDate);
        if (freshRate) {
          console.log(`✅ Found fresh rate after update: 1 ${fromCurrency} = ${freshRate} ${toCurrency}`);
          return freshRate;
        }
      }

    } catch (error) {
      console.error('Database exchange rate lookup failed:', error);
    }

    // Emergency fallback
    console.warn(`⚠️ Using emergency fallback rate for ${fromCurrency} → ${toCurrency}`);
    return this.getEmergencyFallbackRate(fromCurrency, toCurrency);
  }
  
  /**
   * Fetch current exchange rates from external API with multiple fallbacks
   * @param baseCurrency - Base currency (default: INR)
   * @returns Exchange rates object
   */
  async fetchCurrentRates(baseCurrency: string = 'INR'): Promise<ExchangeRateApiResponse> {
    // Enhanced API list with more accurate sources (closer to xe.com rates)
    const apis = [
      { 
        url: `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, 
        name: 'ExchangeRate-API (High Accuracy)',
        transform: (data: any) => data
      },
      { 
        url: `https://api.currencyapi.com/v3/latest?apikey=FREE&base_currency=${baseCurrency}`, 
        name: 'CurrencyAPI (Premium Source)',
        transform: (data: any) => ({ base: baseCurrency, rates: data.data || {} })
      },
      { 
        url: `https://v6.exchangerate-api.com/v6/latest/${baseCurrency}`, 
        name: 'ExchangeRate-API v6 (XE Compatible)',
        transform: (data: any) => data
      },
      { 
        url: `https://api.fxratesapi.com/latest?base=${baseCurrency}`, 
        name: 'FX Rates API',
        transform: (data: any) => data
      },
      { 
        url: `https://api.exchangeratesapi.io/v1/latest?base=${baseCurrency}&access_key=FREE`, 
        name: 'ExchangeRatesAPI.io',
        transform: (data: any) => data
      }
    ];

    console.log(`🌐 Fetching exchange rates with ${baseCurrency} as base currency from ${apis.length} sources...`);

    // Try to get more accurate rates first
    for (const api of apis) {
      try {
        console.log(`🌐 Fetching live rates from ${api.name}...`);
        const response = await fetch(api.url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'KDADKS-Invoice-System/1.0',
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }
        
        const rawData = await response.json();
        const data: ExchangeRateApiResponse = api.transform ? api.transform(rawData) : rawData;
        
        if (!data.rates) {
          throw new Error('Invalid response format from exchange rate API - no rates object');
        }

        // Validate that we have major currencies with reasonable rates
        const majorCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];
        const validRates = majorCurrencies.filter(currency => {
          const rate = data.rates[currency];
          return rate && typeof rate === 'number' && rate > 0;
        });

        if (validRates.length < 3) {
          throw new Error(`Insufficient major currency rates found. Only got: ${validRates.join(', ')}`);
        }

        // Log rates for debugging
        console.log(`✅ Successfully fetched live rates from ${api.name}`);
        console.log(`📊 Key rates: GBP=${data.rates.GBP}, EUR=${data.rates.EUR}, USD=${data.rates.USD}`);
        
        // Special logging for EUR rate comparison
        if (data.rates.EUR) {
          console.log(`💱 EUR rate fetched: ${data.rates.EUR} (xe.com shows ~101.147)`);
        }
        
        return data;
      } catch (error) {
        console.warn(`❌ ${api.name} failed:`, error instanceof Error ? error.message : error);
        continue;
      }
    }

    throw new Error('All exchange rate APIs failed. Please try again later.');
  }
  
  /**
   * Update exchange rates in database with smart batch processing
   * @param forceUpdate - Force update even if rates exist for today
   * @returns boolean indicating success
   */
  async updateExchangeRates(forceUpdate: boolean = false): Promise<boolean> {
    if (!isSupabaseConfigured) {
      console.warn('Database not configured, skipping exchange rate update');
      return false;
    }

    const today = new Date().toISOString().split('T')[0];
    
    try {
      // Check if we already have rates for today (unless forcing update)
      if (!forceUpdate) {
        const { count } = await supabase
          .from('exchange_rates')
          .select('*', { count: 'exact', head: true })
          .eq('date', today);
        
        if (count && count > 0) {
          console.log(`📅 Exchange rates for ${today} already exist. Skipping update.`);
          return true;
        }
      }

      console.log(`🔄 ${forceUpdate ? 'Force updating' : 'Updating'} exchange rates for ${today}...`);

      // Fetch rates with INR as base currency (what we need for invoicing)
      const ratesData = await this.fetchCurrentRates('INR');
      
      // Log some key rates for verification against xe.com
      console.log(`📊 Key rates fetched: GBP=${ratesData.rates.GBP}, EUR=${ratesData.rates.EUR}, USD=${ratesData.rates.USD}`);
      console.log(`🔍 XE.com comparison: EUR should be ~101.147, fetched=${ratesData.rates.EUR}`);
      console.log(`🔍 XE.com comparison: GBP should be ~116.047, fetched=${ratesData.rates.GBP}`);
      
      // Prepare batch insert data
      const ratesToInsert: any[] = [];
      
      for (const [currency, rate] of Object.entries(ratesData.rates)) {
        if (currency !== 'INR' && typeof rate === 'number') {
          ratesToInsert.push({
            base_currency: 'INR',
            target_currency: currency,
            rate: rate,
            date: today,
            source: forceUpdate ? 'manual-update' : 'api-automated-update'
          });
        }
      }

      // Also add major currencies to INR conversions (inverse rates)
      const majorCurrencies = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'SAR', 'JPY', 'CNY'];
      
      for (const currency of majorCurrencies) {
        if (ratesData.rates[currency] && ratesData.rates[currency] !== 0) {
          const inverseRate = 1 / ratesData.rates[currency];
          ratesToInsert.push({
            base_currency: currency,
            target_currency: 'INR',
            rate: inverseRate,
            date: today,
            source: forceUpdate ? 'manual-update' : 'api-automated-update'
          });
        }
      }

      if (ratesToInsert.length === 0) {
        console.warn('No valid exchange rates to insert');
        return false;
      }

      // Log specific rates being inserted
      const gbpToInr = ratesToInsert.find(r => r.base_currency === 'GBP' && r.target_currency === 'INR');
      const eurToInr = ratesToInsert.find(r => r.base_currency === 'EUR' && r.target_currency === 'INR');
      const usdToInr = ratesToInsert.find(r => r.base_currency === 'USD' && r.target_currency === 'INR');
      
      console.log(`💱 Inserting key rates: GBP→INR=${gbpToInr?.rate}, EUR→INR=${eurToInr?.rate}, USD→INR=${usdToInr?.rate}`);

      // Batch insert with upsert (handle conflicts)
      const { error } = await supabase
        .from('exchange_rates')
        .upsert(ratesToInsert, {
          onConflict: 'base_currency,target_currency,date',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed to update exchange rates:', error);
        return false;
      }

      console.log(`✅ Successfully updated ${ratesToInsert.length} exchange rates for ${today}`);
      
      if (forceUpdate) {
        console.log(`🚀 Manual update completed! Latest GBP rate: ${gbpToInr?.rate || 'N/A'}`);
      }
      
      return true;

    } catch (error) {
      console.error('Failed to update exchange rates:', error);
      return false;
    }
  }

  /**
   * Schedule daily exchange rate updates
   * This should be called on application startup
   */
  async scheduleDailyUpdates(): Promise<void> {
    console.log('📅 Setting up daily exchange rate update schedule...');
    
    // Calculate milliseconds until next 00:01 UTC
    const now = new Date();
    const nextUpdate = new Date();
    nextUpdate.setUTCHours(0, 1, 0, 0); // 00:01 UTC
    
    // If we've passed today's update time, schedule for tomorrow
    if (now >= nextUpdate) {
      nextUpdate.setUTCDate(nextUpdate.getUTCDate() + 1);
    }
    
    const msUntilUpdate = nextUpdate.getTime() - now.getTime();
    
    console.log(`⏰ Next exchange rate update scheduled for: ${nextUpdate.toISOString()}`);
    console.log(`⏱️ Time until next update: ${Math.round(msUntilUpdate / 1000 / 60)} minutes`);
    
    // Set initial timeout
    setTimeout(() => {
      this.performDailyUpdate();
      
      // Set up daily interval (24 hours)
      setInterval(() => {
        this.performDailyUpdate();
      }, 24 * 60 * 60 * 1000);
      
    }, msUntilUpdate);
  }

  /**
   * Perform daily update with error handling and retry logic
   */
  private async performDailyUpdate(): Promise<void> {
    console.log('🌅 Performing daily exchange rate update...');
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        const success = await this.updateExchangeRates(true);
        if (success) {
          console.log('✅ Daily exchange rate update completed successfully');
          return;
        }
      } catch (error) {
        console.error(`❌ Daily update attempt ${retryCount + 1} failed:`, error);
      }
      
      retryCount++;
      if (retryCount < maxRetries) {
        // Wait 5 minutes before retry
        console.log(`⏳ Retrying in 5 minutes... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
    
    console.error('❌ All daily update attempts failed. Manual intervention may be required.');
  }

  /**
   * Convert currency using database rates with validation
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<CurrencyConversion | null> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
    
    if (!rate) {
      return null;
    }

    // Validate rate for major currencies to prevent backward conversion
    if (toCurrency === 'INR' && ['EUR', 'USD', 'GBP'].includes(fromCurrency)) {
      if (rate < 50) {
        console.warn(`🚨 Suspicious rate detected: 1 ${fromCurrency} = ${rate} INR (too low)`);
        return null;
      }
    }

    const convertedAmount = Math.round((amount * rate) * 100) / 100;

    return {
      original_amount: amount,
      from_currency: fromCurrency,
      converted_amount: convertedAmount,
      to_currency: toCurrency,
      exchange_rate: rate,
      conversion_date: date || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Convert any currency to INR (most common use case)
   */
  async convertToINR(amount: number, fromCurrency: string, date?: string): Promise<number> {
    if (fromCurrency === 'INR') {
      return amount;
    }
    
    const conversion = await this.convertCurrency(amount, fromCurrency, 'INR', date);
    
    if (conversion && conversion.converted_amount > 0) {
      // Additional validation for major currencies
      if (['EUR', 'USD', 'GBP'].includes(fromCurrency)) {
        const conversionRatio = conversion.converted_amount / amount;
        if (conversionRatio < 10) {
          console.warn(`🚨 Backward conversion detected: ${amount} ${fromCurrency} → ${conversion.converted_amount} INR (ratio: ${conversionRatio})`);
          
          // Use emergency fallback
          const fallbackRate = this.getEmergencyFallbackRate(fromCurrency, 'INR');
          if (fallbackRate) {
            const fallbackAmount = Math.round((amount * fallbackRate) * 100) / 100;
            console.log(`💡 Using emergency fallback: ${amount} ${fromCurrency} → ${fallbackAmount} INR (rate: ${fallbackRate})`);
            return fallbackAmount;
          }
        }
      }
      return conversion.converted_amount;
    }
    
    // Last resort: emergency fallback
    console.warn(`Could not convert ${amount} ${fromCurrency} to INR, using emergency fallback`);
    const fallbackRate = this.getEmergencyFallbackRate(fromCurrency, 'INR');
    
    if (fallbackRate) {
      const fallbackAmount = Math.round((amount * fallbackRate) * 100) / 100;
      console.log(`💡 Emergency fallback: ${amount} ${fromCurrency} → ${fallbackAmount} INR (rate: ${fallbackRate})`);
      return fallbackAmount;
    }
    
    return amount; // Return original amount as last resort
  }

  /**
   * Get available currencies from database
   */
  async getAvailableCurrencies(): Promise<{currency: string; rate: number; date: string}[]> {
    if (!isSupabaseConfigured) {
      return [];
    }
    
    try {
      const { data } = await supabase
        .from('exchange_rates')
        .select('target_currency, rate, date')
        .eq('base_currency', 'INR')
        .order('date', { ascending: false });
      
      if (!data) return [];
      
      // Get latest rate for each currency
      const latestRates = new Map<string, {rate: number; date: string}>();
      
      for (const record of data) {
        if (!latestRates.has(record.target_currency)) {
          latestRates.set(record.target_currency, {
            rate: record.rate,
            date: record.date
          });
        }
      }
      
      return Array.from(latestRates.entries()).map(([currency, info]) => ({
        currency,
        rate: info.rate,
        date: info.date
      }));
    } catch (error) {
      console.error('Error getting available currencies:', error);
      return [];
    }
  }

  /**
   * Get database health and coverage information
   */
  async getDatabaseHealth(): Promise<{
    total_rates: number;
    latest_update: string;
    currencies_covered: string[];
    missing_today: string[];
  }> {
    if (!isSupabaseConfigured) {
      return {
        total_rates: 0,
        latest_update: 'N/A',
        currencies_covered: [],
        missing_today: []
      };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get total rates
      const { count: totalRates } = await supabase
        .from('exchange_rates')
        .select('*', { count: 'exact', head: true });

      // Get latest update
      const { data: latestData } = await supabase
        .from('exchange_rates')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      // Get currencies covered today
      const { data: todayRates } = await supabase
        .from('exchange_rates')
        .select('target_currency')
        .eq('date', today)
        .eq('base_currency', 'INR');

      const currenciesToday = todayRates?.map(r => r.target_currency) || [];
      const expectedCurrencies = Object.keys(this.EMERGENCY_FALLBACK_RATES);
      const missingToday = expectedCurrencies.filter(curr => !currenciesToday.includes(curr));

      return {
        total_rates: totalRates || 0,
        latest_update: latestData?.date || 'N/A',
        currencies_covered: currenciesToday,
        missing_today: missingToday
      };
    } catch (error) {
      console.error('Error getting database health:', error);
      return {
        total_rates: 0,
        latest_update: 'Error',
        currencies_covered: [],
        missing_today: []
      };
    }
  }

  /**
   * Initialize service (called on app startup)
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Exchange Rate Service...');
    
    try {
      // Check database health
      const health = await this.getDatabaseHealth();
      console.log('📊 Database Health:', health);
      
      // Update rates if missing for today
      if (health.missing_today.length > 0) {
        console.log('🔄 Missing rates for today, updating...');
        await this.updateExchangeRates(false);
      }
      
      // Schedule daily updates
      await this.scheduleDailyUpdates();
      
      console.log('✅ Exchange Rate Service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Exchange Rate Service initialization had issues:', error);
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
