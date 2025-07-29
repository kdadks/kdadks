import { supabase } from '../config/supabase';

class DatabaseInitializer {
  async checkTables() {
    console.log('🔍 Checking database tables...');
    
    const tables = [
      'countries',
      'company_settings', 
      'invoice_settings',
      'terms_templates',
      'customers',
      'products',
      'invoices',
      'invoice_items',
      'payments'
    ];

    const results = [];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          results.push({ table, status: 'missing', error: error.message });
        } else {
          results.push({ table, status: 'exists', count: data?.length || 0 });
        }
      } catch (err) {
        results.push({ table, status: 'error', error: (err as Error).message });
      }
    }

    return results;
  }

  async initializeTestData() {
    console.log('🚀 Initializing test data...');
    
    try {
      // Check if countries table has data
      const { data: countries } = await supabase.from('countries').select('id').limit(1);
      
      if (!countries || countries.length === 0) {
        console.log('⚠️ No countries found. Please run the database schema and seed SQL files first.');
        console.log('📝 Instructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Run the content from src/database/schema.sql');
        console.log('4. Run the content from src/database/seed-data.sql');
        return false;
      }

      // Get default company settings
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('*')
        .eq('is_default', true)
        .single();

      if (!companySettings) {
        console.log('⚠️ No default company settings found. Please run the seed data SQL file.');
        return false;
      }

      // Get invoice settings
      const { data: invoiceSettings } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (!invoiceSettings) {
        console.log('⚠️ No invoice settings found. Please run the seed data SQL file.');
        return false;
      }

      console.log('✅ Database tables are properly initialized!');
      console.log('📊 Summary:');
      console.log(`  - Company: ${companySettings.company_name}`);
      console.log(`  - Invoice Prefix: ${invoiceSettings.invoice_prefix}`);
      console.log(`  - Current FY: ${invoiceSettings.current_financial_year}`);
      console.log(`  - Next Invoice Number: ${invoiceSettings.current_number}`);

      return true;
    } catch (error) {
      console.error('❌ Error initializing data:', error);
      return false;
    }
  }

  async getSystemStatus() {
    console.log('📋 Getting system status...');
    
    try {
      const tableResults = await this.checkTables();
      const dataInitialized = await this.initializeTestData();

      return {
        tables: tableResults,
        dataInitialized,
        recommendations: this.getRecommendations(tableResults, dataInitialized)
      };
    } catch (error) {
      console.error('❌ Error getting system status:', error);
      return {
        tables: [],
        dataInitialized: false,
        error: (error as Error).message
      };
    }
  }

  private getRecommendations(tableResults: Array<{ table: string; status: string; error?: string }>, dataInitialized: boolean): string[] {
    const recommendations = [];

    const missingTables = tableResults.filter(t => t.status === 'missing');
    if (missingTables.length > 0) {
      recommendations.push(
        `🔧 Missing tables: ${missingTables.map(t => t.table).join(', ')}. Run schema.sql in Supabase.`
      );
    }

    if (!dataInitialized) {
      recommendations.push(
        '🔧 Initialize seed data by running seed-data.sql in Supabase SQL Editor.'
      );
    }

    const errorTables = tableResults.filter(t => t.status === 'error');
    if (errorTables.length > 0) {
      recommendations.push(
        `⚠️ Table errors detected. Check Supabase configuration and permissions.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ System is ready! You can start creating invoices.');
    }

    return recommendations;
  }
}

export const dbInitializer = new DatabaseInitializer();

// Export function for easy use in console
export async function checkInvoiceSystem() {
  const status = await dbInitializer.getSystemStatus();
  console.log('\n' + '='.repeat(50));
  console.log('📋 INVOICE SYSTEM STATUS REPORT');
  console.log('='.repeat(50));
  
  console.log('\n📊 Database Tables:');
  status.tables.forEach(table => {
    const icon = table.status === 'exists' ? '✅' : table.status === 'missing' ? '❌' : '⚠️';
    console.log(`  ${icon} ${table.table}: ${table.status}`);
  });

  console.log('\n💡 Recommendations:');
  (status.recommendations || []).forEach(rec => {
    console.log(`  ${rec}`);
  });
  
  console.log('\n' + '='.repeat(50));
  return status;
}
