// Example usage of the Invoice System
// This file demonstrates how to use the invoice service

import { invoiceService } from '../services/invoiceService';
import { checkInvoiceSystem } from '../database/initializer';

// Example 1: Check system status
export async function checkSystem() {
  console.log('📋 Checking Invoice System Status...');
  const status = await checkInvoiceSystem();
  return status;
}

// Example 2: Create a sample customer
export async function createSampleCustomer() {
  try {
    // First get India country ID
    const countries = await invoiceService.getCountries();
    const india = countries.find(c => c.code === 'IND');
    
    if (!india) {
      throw new Error('India not found in countries list');
    }

    const customerData = {
      company_name: 'Sample Tech Solutions Pvt Ltd',
      contact_person: 'John Doe',
      email: 'john@sampletech.com',
      phone: '+91-9876543210',
      address_line1: 'Plot No. 123, Tech Park',
      address_line2: 'Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postal_code: '201301',
      country_id: india.id,
      gstin: '09ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      credit_limit: 100000,
      payment_terms: 30
    };

    const customer = await invoiceService.createCustomer(customerData);
    console.log('✅ Sample customer created:', customer.company_name);
    return customer;
  } catch (error) {
    console.error('❌ Error creating customer:', error);
    throw error;
  }
}

// Example 3: Create a sample product
export async function createSampleProduct() {
  try {
    const productData = {
      name: 'Website Development Service',
      description: 'Complete website development with modern design and responsive layout',
      product_code: 'WEB-DEV-001',
      category: 'IT Services',
      unit_price: 50000,
      unit: 'project',
      tax_rate: 18.00,
      hsn_code: '998314'
    };

    const product = await invoiceService.createProduct(productData);
    console.log('✅ Sample product created:', product.name);
    return product;
  } catch (error) {
    console.error('❌ Error creating product:', error);
    throw error;
  }
}

// Example 4: Create a sample invoice
export async function createSampleInvoice(customerId: string, productId: string) {
  try {
    const invoiceData = {
      customer_id: customerId,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      notes: 'Thank you for your business!',
      terms_conditions: 'Payment is due within 30 days of invoice date.',
      items: [
        {
          product_id: productId,
          description: 'Website Development Service - Complete e-commerce website',
          quantity: 1,
          unit: 'project',
          unit_price: 50000,
          tax_rate: 18.00,
          hsn_code: '998314'
        },
        {
          description: 'Domain Registration and Setup',
          quantity: 1,
          unit: 'year',
          unit_price: 2000,
          tax_rate: 18.00,
          hsn_code: '998314'
        }
      ]
    };

    const invoice = await invoiceService.createInvoice(invoiceData);
    console.log('✅ Sample invoice created:', invoice.invoice_number);
    console.log(`📄 Total Amount: ₹${invoice.total_amount.toLocaleString()}`);
    return invoice;
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    throw error;
  }
}

// Example 5: Get invoice statistics
export async function getInvoiceStatistics() {
  try {
    const stats = await invoiceService.getInvoiceStats();
    console.log('📊 Invoice Statistics:');
    console.log(`  Total Invoices: ${stats.total_invoices}`);
    console.log(`  Total Revenue: ₹${stats.total_revenue.toLocaleString()}`);
    console.log(`  Pending Amount: ₹${stats.pending_amount.toLocaleString()}`);
    console.log(`  This Month Revenue: ₹${stats.this_month_revenue.toLocaleString()}`);
    return stats;
  } catch (error) {
    console.error('❌ Error getting statistics:', error);
    throw error;
  }
}

// Example 6: Complete demo setup
export async function runCompleteDemo() {
  console.log('🚀 Running Complete Invoice System Demo...\n');
  
  try {
    // Step 1: Check system
    console.log('Step 1: Checking system status...');
    await checkSystem();
    
    // Step 2: Create sample customer
    console.log('\nStep 2: Creating sample customer...');
    const customer = await createSampleCustomer();
    
    // Step 3: Create sample product
    console.log('\nStep 3: Creating sample product...');
    const product = await createSampleProduct();
    
    // Step 4: Create sample invoice
    console.log('\nStep 4: Creating sample invoice...');
    const invoice = await createSampleInvoice(customer.id, product.id);
    
    // Step 5: Get statistics
    console.log('\nStep 5: Getting updated statistics...');
    await getInvoiceStatistics();
    
    console.log('\n✅ Demo completed successfully!');
    console.log('🎉 Your invoice system is ready for use!');
    
    return {
      customer,
      product,
      invoice
    };
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

// Helper function to format currency
export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency
  }).format(amount);
}

// Helper function to format date
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Export for easy console usage
(window as unknown as { invoiceDemo: unknown }).invoiceDemo = {
  checkSystem,
  createSampleCustomer,
  createSampleProduct,
  createSampleInvoice,
  getInvoiceStatistics,
  runCompleteDemo,
  formatCurrency,
  formatDate,
  invoiceService
};

console.log('💡 Invoice Demo Functions Available:');
console.log('  - invoiceDemo.checkSystem()');
console.log('  - invoiceDemo.runCompleteDemo()');
console.log('  - invoiceDemo.invoiceService (full API access)');
