// Test file to verify invoice number generation is working correctly
import { invoiceService } from '../services/invoiceService';

export async function testInvoiceNumberGeneration() {
  console.log('🧪 Testing Invoice Number Generation Logic...');
  
  try {
    // Test 1: Preview invoice number without incrementing counter
    console.log('\n📋 Test 1: Preview invoice number (no DB increment)');
    const previewNumber1 = await invoiceService.previewInvoiceNumber();
    console.log(`Preview: ${previewNumber1}`);
    
    // Test 2: Preview again - should show same number (counter not incremented)
    console.log('\n📋 Test 2: Preview again (should be same number)');
    const previewNumber2 = await invoiceService.previewInvoiceNumber();
    console.log(`Preview: ${previewNumber2}`);
    console.log(`✅ Numbers match: ${previewNumber1 === previewNumber2}`);
    
    // Test 3: Actually generate a number (this should increment counter)
    console.log('\n📋 Test 3: Generate actual invoice number (increments DB)');
    const actualNumber1 = await invoiceService.generateInvoiceNumber();
    console.log(`Actual: ${actualNumber1}`);
    
    // Test 4: Preview should now show next number
    console.log('\n📋 Test 4: Preview should now show next number');
    const previewNumber3 = await invoiceService.previewInvoiceNumber();
    console.log(`Preview: ${previewNumber3}`);
    
    // Test 5: Generate another actual number
    console.log('\n📋 Test 5: Generate another actual number');
    const actualNumber2 = await invoiceService.generateInvoiceNumber();
    console.log(`Actual: ${actualNumber2}`);
    
    console.log('\n📊 Summary:');
    console.log(`First preview: ${previewNumber1}`);
    console.log(`Second preview: ${previewNumber2} (should match first)`);
    console.log(`First actual: ${actualNumber1} (should match previews)`);
    console.log(`Third preview: ${previewNumber3} (should be next number)`);
    console.log(`Second actual: ${actualNumber2} (should match third preview)`);
    
    console.log('\n🎉 Invoice number generation test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Test current settings
export async function testInvoiceSettings() {
  console.log('\n⚙️  Testing Invoice Settings...');
  
  try {
    const settings = await invoiceService.getInvoiceSettings();
    if (settings) {
      console.log('Current Settings:');
      console.log(`  Prefix: ${settings.invoice_prefix}`);
      console.log(`  Format: ${settings.number_format}`);
      console.log(`  Current Number: ${settings.current_number}`);
      console.log(`  Current Period: ${settings.current_financial_year}`);
      console.log(`  Reset Annually: ${settings.reset_annually}`);
    } else {
      console.log('No invoice settings found');
    }
  } catch (error) {
    console.error('❌ Settings test failed:', error);
  }
}
