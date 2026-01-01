import { supabase, isSupabaseConfigured } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
import { exchangeRateService } from './exchangeRateService';
import type {
  Country,
  CompanySettings,
  InvoiceSettings,
  TermsTemplate,
  Customer,
  Product,
  Invoice,
  Payment,
  CreateInvoiceData,
  CreateCustomerData,
  CreateProductData,
  CreateCompanySettingsData,
  CreateInvoiceSettingsData,
  UpdateCompanySettingsData,
  UpdateInvoiceSettingsData,
  InvoiceStats,
  InvoiceFilters,
  CustomerFilters,
  ProductFilters,
  PaginatedResponse
} from '../types/invoice';

class InvoiceService {
  /**
   * Calculate the current financial year based on the financial year start month
   * @param fyStartMonth - The month when financial year starts (1-12, default: 4 for April)
   * @param currentDate - The current date (default: new Date())
   * @returns Financial year string in format "YYYY-YY" (e.g., "2024-25")
   */
  private calculateFinancialYear(fyStartMonth: number = 4, currentDate: Date = new Date()): string {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    if (currentMonth >= fyStartMonth) {
      // We're in the second half of the financial year
      return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
    } else {
      // We're in the first half of the financial year
      return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
    }
  }

  /**
   * Check if we're at the start of a new financial year
   * @param currentFY - Current financial year from settings
   * @param calculatedFY - Calculated financial year based on current date
   * @returns true if it's a new financial year, false otherwise
   */
  private isNewFinancialYear(currentFY: string | null, calculatedFY: string): boolean {
    return currentFY !== calculatedFY;
  }
  // Countries
  async getCountries(): Promise<Country[]> {
    if (!isSupabaseConfigured) {
      throw new Error('Database is not configured. Please contact the administrator.');
    }
    
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async getCountryById(id: string): Promise<Country | null> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings[]> {
    const { data, error } = await supabase
      .from('company_settings')
      .select(`
        *,
        country:countries(*)
      `)
      .eq('is_active', true)
      .order('is_default', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }

  async getDefaultCompanySettings(): Promise<CompanySettings | null> {
    const { data, error } = await supabase
      .from('company_settings')
      .select(`
        *,
        country:countries(*)
      `)
      .eq('is_default', true)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateCompanySettings(id: string, settings: UpdateCompanySettingsData): Promise<CompanySettings> {
    const { data, error } = await supabase
      .from('company_settings')
      .update(settings)
      .eq('id', id)
      .select(`
        *,
        country:countries(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createCompanySettings(settings: CreateCompanySettingsData): Promise<CompanySettings> {
    const { data, error } = await supabase
      .from('company_settings')
      .insert({
        ...settings,
        is_active: true,
        is_default: settings.is_default || false
      })
      .select(`
        *,
        country:countries(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCompanySettings(id: string): Promise<void> {
    const { error } = await supabase
      .from('company_settings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Invoice Settings
  async getInvoiceSettings(): Promise<InvoiceSettings | null> {
    const { data, error } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updateInvoiceSettings(id: string, settings: UpdateInvoiceSettingsData): Promise<InvoiceSettings> {
    const { data, error } = await supabase
      .from('invoice_settings')
      .update(settings)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async createInvoiceSettings(settings: CreateInvoiceSettingsData): Promise<InvoiceSettings> {
    const { data, error } = await supabase
      .from('invoice_settings')
      .insert({
        ...settings,
        is_active: true,
        current_number: 1
      })
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteInvoiceSettings(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoice_settings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  // Terms Templates
  async getTermsTemplates(): Promise<TermsTemplate[]> {
    const { data, error } = await supabase
      .from('terms_templates')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  async createTermsTemplate(template: Omit<TermsTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<TermsTemplate> {
    const { data, error } = await supabase
      .from('terms_templates')
      .insert(template)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateTermsTemplate(id: string, template: Partial<TermsTemplate>): Promise<TermsTemplate> {
    const { data, error } = await supabase
      .from('terms_templates')
      .update(template)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteTermsTemplate(id: string): Promise<void> {
    const { error } = await supabase
      .from('terms_templates')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Customers
  async getCustomers(filters?: CustomerFilters, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Customer>> {
    let query = supabase
      .from('customers')
      .select(`
        *,
        country:countries(*)
      `, { count: 'exact' });

    if (filters) {
      if (filters.search) {
        query = query.or(`company_name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      if (filters.country_id) {
        query = query.eq('country_id', filters.country_id);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  async getCustomerById(id: string): Promise<Customer | null> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        country:countries(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createCustomer(customer: CreateCustomerData): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select(`
        *,
        country:countries(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateCustomer(id: string, customer: Partial<CreateCustomerData>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select(`
        *,
        country:countries(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Products
  async getProducts(filters?: ProductFilters, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Product>> {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' });

    if (filters) {
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,product_code.ilike.%${filters.search}%`);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('name')
      .range(from, to);
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createProduct(product: CreateProductData): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, product: Partial<CreateProductData>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);
    
    if (error) throw error;
  }

  // Invoice Number Generation
  async previewInvoiceNumber(): Promise<string> {
    const settings = await this.getInvoiceSettings();
    if (!settings) throw new Error('Invoice settings not found');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate current financial year
    const fyStartMonth = settings.financial_year_start_month || 4; // Default to April
    const currentFinancialYear = this.calculateFinancialYear(fyStartMonth, currentDate);
    
    let nextSequentialNumber = settings.current_number;
    
    // Check if there are any invoices in the database
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const actualInvoiceCount = invoiceCount || 0; // Handle null case
    
    console.log(`🔍 Preview - Database state:`, {
      invoiceCount: actualInvoiceCount,
      settingsCurrentNumber: settings.current_number,
      currentFinancialYear,
      settingsFinancialYear: settings.current_financial_year
    });
    
    // If no invoices exist, reset to 1
    if (actualInvoiceCount === 0) {
      nextSequentialNumber = 1;
      console.log(`🔄 Preview: No invoices found in database - would reset sequential number to 1`);
    }
    // Check if we need to reset the counter for new financial year (only if reset_annually is enabled)
    else if (settings.reset_annually && this.isNewFinancialYear(settings.current_financial_year, currentFinancialYear)) {
      // New financial year detected - would reset the sequential number
      nextSequentialNumber = 1;
      console.log(`🔄 Preview: New financial year detected: ${settings.current_financial_year} → ${currentFinancialYear}`);
      console.log(`📊 Preview: Would reset sequential number from ${settings.current_number} to 1`);
    }
    // Check if settings counter is ahead of actual invoice count (possible data inconsistency)
    else if (actualInvoiceCount > 0 && settings.current_number > actualInvoiceCount + 1) {
      // Settings counter is ahead, sync it to actual count + 1
      nextSequentialNumber = actualInvoiceCount + 1;
      console.log(`⚠️ Preview: Settings counter (${settings.current_number}) ahead of invoice count (${actualInvoiceCount}), syncing to ${nextSequentialNumber}`);
    }

    // Generate preview number based on format (without saving to database)
    let previewNumber = settings.number_format;
    
    // Handle different format patterns
    previewNumber = previewNumber.replace(/PREFIX/g, settings.invoice_prefix);
    previewNumber = previewNumber.replace(/YYYY/g, currentYear.toString());
    previewNumber = previewNumber.replace(/MM/g, currentMonth.toString().padStart(2, '0'));
    
    // Handle dynamic number padding: 3 digits until reaching 1000, then 4+ digits
    const numberStr = nextSequentialNumber < 1000 
      ? nextSequentialNumber.toString().padStart(3, '0')
      : nextSequentialNumber.toString();
    
    // Handle different number padding patterns with dynamic logic
    previewNumber = previewNumber.replace(/####/g, numberStr);
    previewNumber = previewNumber.replace(/###/g, numberStr);
    previewNumber = previewNumber.replace(/NNNN/g, numberStr);
    previewNumber = previewNumber.replace(/NNN/g, numberStr);
    
    if (settings.invoice_suffix) {
      previewNumber = previewNumber.replace(/SUFFIX/g, settings.invoice_suffix);
    }

    console.log(`👀 Preview invoice number: ${previewNumber} (FY: ${currentFinancialYear}, Number: ${nextSequentialNumber}, Reset: ${settings.reset_annually}, InvoiceCount: ${invoiceCount})`);
    
    return previewNumber;
  }

  /**
   * Generate next invoice number without updating database settings
   * Used for uniqueness checking before final save
   */
  async generateNextInvoiceNumber(): Promise<string> {
    const settings = await this.getInvoiceSettings();
    if (!settings) throw new Error('Invoice settings not found');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate current financial year
    const fyStartMonth = settings.financial_year_start_month || 4; // Default to April
    const currentFinancialYear = this.calculateFinancialYear(fyStartMonth, currentDate);
    
    let nextSequentialNumber = settings.current_number;
    
    // Check if there are any invoices in the database
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const actualInvoiceCount = invoiceCount || 0; // Handle null case
    
    // If no invoices exist, reset to 1
    if (actualInvoiceCount === 0) {
      nextSequentialNumber = 1;
      console.log(`🔄 Generate: No invoices found in database - would use sequential number 1`);
    }
    // Check if we need to reset the counter for new financial year (only if reset_annually is enabled)
    else if (settings.reset_annually && this.isNewFinancialYear(settings.current_financial_year, currentFinancialYear)) {
      // New financial year detected - would reset the sequential number
      nextSequentialNumber = 1;
      console.log(`🔄 Generate: New financial year detected: ${settings.current_financial_year} → ${currentFinancialYear}`);
      console.log(`📊 Generate: Would reset sequential number from ${settings.current_number} to 1`);
    }
    // Check if settings counter is ahead of actual invoice count (possible data inconsistency)
    else if (actualInvoiceCount > 0 && settings.current_number > actualInvoiceCount + 1) {
      // Settings counter is ahead, sync it to actual count + 1
      nextSequentialNumber = actualInvoiceCount + 1;
      console.log(`⚠️ Generate: Settings counter (${settings.current_number}) ahead of invoice count (${actualInvoiceCount}), syncing to ${nextSequentialNumber}`);
    }

    // Generate invoice number based on format (without updating database)
    let invoiceNumber = settings.number_format;
    
    // Handle different format patterns
    invoiceNumber = invoiceNumber.replace(/PREFIX/g, settings.invoice_prefix);
    invoiceNumber = invoiceNumber.replace(/YYYY/g, currentYear.toString());
    invoiceNumber = invoiceNumber.replace(/MM/g, currentMonth.toString().padStart(2, '0'));
    
    // Handle dynamic number padding: 3 digits until reaching 1000, then 4 digits
    const numberStr = nextSequentialNumber < 1000 
      ? nextSequentialNumber.toString().padStart(3, '0')
      : nextSequentialNumber.toString();
    
    // Handle different number padding patterns with dynamic logic
    invoiceNumber = invoiceNumber.replace(/####/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/###/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/NNNN/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/NNN/g, numberStr);
    
    if (settings.invoice_suffix) {
      invoiceNumber = invoiceNumber.replace(/SUFFIX/g, settings.invoice_suffix);
    }

    console.log(`🔢 Generated next invoice number (no DB update): ${invoiceNumber} (FY: ${currentFinancialYear}, Number: ${nextSequentialNumber}, InvoiceCount: ${actualInvoiceCount})`);
    
    return invoiceNumber;
  }

  async generateInvoiceNumber(): Promise<string> {
    const settings = await this.getInvoiceSettings();
    if (!settings) throw new Error('Invoice settings not found');

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate current financial year
    const fyStartMonth = settings.financial_year_start_month || 4; // Default to April
    const currentFinancialYear = this.calculateFinancialYear(fyStartMonth, currentDate);
    
    let nextSequentialNumber = settings.current_number;
    
    // Check if there are any invoices in the database
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const actualInvoiceCount = invoiceCount || 0; // Handle null case
    
    console.log(`🔍 Generate - Database state:`, {
      invoiceCount: actualInvoiceCount,
      settingsCurrentNumber: settings.current_number,
      currentFinancialYear,
      settingsFinancialYear: settings.current_financial_year
    });
    
    // If no invoices exist, reset to 1
    if (actualInvoiceCount === 0) {
      nextSequentialNumber = 1;
      console.log(`🔄 No invoices found in database - resetting sequential number to 1`);
    }
    // Check if we need to reset the counter for new financial year (only if reset_annually is enabled)
    else if (settings.reset_annually && this.isNewFinancialYear(settings.current_financial_year, currentFinancialYear)) {
      // New financial year detected - reset the sequential number
      nextSequentialNumber = 1;
      console.log(`🔄 New financial year detected: ${settings.current_financial_year} → ${currentFinancialYear}`);
      console.log(`📊 Resetting sequential number from ${settings.current_number} to 1 (Financial Year Start: ${fyStartMonth === 4 ? 'April' : `Month ${fyStartMonth}`})`);
    }
    // Check if settings counter is ahead of actual invoice count (possible data inconsistency)
    else if (actualInvoiceCount > 0 && settings.current_number > actualInvoiceCount + 1) {
      // Settings counter is ahead, sync it to actual count + 1
      nextSequentialNumber = actualInvoiceCount + 1;
      console.log(`⚠️ Generate: Settings counter (${settings.current_number}) ahead of invoice count (${actualInvoiceCount}), syncing to ${nextSequentialNumber}`);
    }

    // Generate invoice number based on format
    let invoiceNumber = settings.number_format;
    
    // Handle different format patterns
    invoiceNumber = invoiceNumber.replace(/PREFIX/g, settings.invoice_prefix);
    invoiceNumber = invoiceNumber.replace(/YYYY/g, currentYear.toString());
    invoiceNumber = invoiceNumber.replace(/MM/g, currentMonth.toString().padStart(2, '0'));
    
    // Handle dynamic number padding: 3 digits until reaching 1000, then 4 digits
    const numberStr = nextSequentialNumber < 1000 
      ? nextSequentialNumber.toString().padStart(3, '0')
      : nextSequentialNumber.toString();
    
    // Handle different number padding patterns with dynamic logic
    invoiceNumber = invoiceNumber.replace(/####/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/###/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/NNNN/g, numberStr);
    invoiceNumber = invoiceNumber.replace(/NNN/g, numberStr);
    
    if (settings.invoice_suffix) {
      invoiceNumber = invoiceNumber.replace(/SUFFIX/g, settings.invoice_suffix);
    }

    // Update current number and current financial year in database
    // This ensures the next invoice gets the correct incremented number
    await supabase
      .from('invoice_settings')
      .update({ 
        current_number: nextSequentialNumber + 1, // Set to next number for the next invoice
        current_financial_year: currentFinancialYear // Store current financial year for future comparison
      })
      .eq('id', settings.id);

    console.log(`📋 Generated and reserved invoice number: ${invoiceNumber} (FY: ${currentFinancialYear}, Next#: ${nextSequentialNumber + 1}, Reset: ${settings.reset_annually}, InvoiceCount: ${invoiceCount})`);
    
    return invoiceNumber;
  }

  // Invoices
  async getInvoices(filters?: InvoiceFilters, page: number = 1, perPage: number = 20): Promise<PaginatedResponse<Invoice>> {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        company_settings:company_settings(*),
        invoice_items:invoice_items(
          *,
          product:products(*)
        ),
        payments:payments(*)
      `, { count: 'exact' });

    if (filters) {
      if (filters.search) {
        query = query.or(`invoice_number.ilike.%${filters.search}%`);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.payment_status) {
        query = query.eq('payment_status', filters.payment_status);
      }
      if (filters.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters.date_from) {
        query = query.gte('invoice_date', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('invoice_date', filters.date_to);
      }
    }

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return {
      data: data || [],
      count: count || 0,
      page,
      per_page: perPage,
      total_pages: Math.ceil((count || 0) / perPage)
    };
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(
          *,
          country:countries(*)
        ),
        company_settings:company_settings(
          *,
          country:countries(*)
        ),
        invoice_items:invoice_items(
          *,
          product:products(*)
        ),
        payments:payments(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createInvoice(invoiceData: CreateInvoiceData, invoiceNumber?: string): Promise<Invoice> {
    let finalInvoiceNumber: string;
    
    if (invoiceNumber) {
      // If invoice number is provided, use it (this means the caller has already reserved it)
      finalInvoiceNumber = invoiceNumber;
      console.log('📝 Using provided invoice number:', finalInvoiceNumber);
    } else {
      // If no invoice number provided, generate and reserve one
      finalInvoiceNumber = await this.generateInvoiceNumber();
      console.log('🔢 Generated new invoice number:', finalInvoiceNumber);
    }
    
    const companySettings = await this.getDefaultCompanySettings();
    
    if (!companySettings) {
      throw new Error('Default company settings not found');
    }

    // Get current user for created_by field
    const currentUser = await simpleAuth.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get customer to determine currency
    const customer = await this.getCustomerById(invoiceData.customer_id);
    let currencyCode = 'INR'; // Default fallback
    
    console.log('💱 Invoice currency determination:', {
      customerId: invoiceData.customer_id,
      customer: customer ? {
        id: customer.id,
        name: customer.company_name || customer.contact_person,
        country_id: customer.country_id,
        country: customer.country
      } : null
    });
    
    if (customer && customer.country) {
      currencyCode = customer.country.currency_code;
      console.log('✅ Using customer country currency:', {
        countryCode: customer.country.code,
        currencyCode: customer.country.currency_code,
        currencySymbol: customer.country.currency_symbol
      });
    } else {
      console.log('⚠️ No customer country found, using default INR');
    }

    // Calculate totals in original currency
    let subtotal = 0;
    let taxAmount = 0;

    invoiceData.items.forEach(item => {
      let lineTotal = 0;

      // For service-based items: resource_count × quantity (months) × billable_hours × unit_price (rate/hour)
      if (item.is_service_item && item.billable_hours) {
        const resourceCount = item.resource_count || 1;
        lineTotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
      } else {
        // For product-based items: quantity × unit_price
        lineTotal = item.quantity * item.unit_price;
      }

      const itemTax = (lineTotal * item.tax_rate) / 100;
      subtotal += lineTotal;
      taxAmount += itemTax;
    });

    // Calculate discount
    let discountAmount = 0;
    if (invoiceData.discount_type && invoiceData.discount_value) {
      const discountValue = Number(invoiceData.discount_value);
      if (invoiceData.discount_type === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    // Recalculate tax on discounted subtotal
    const discountedSubtotal = subtotal - discountAmount;
    const averageTaxRate = taxAmount > 0 && subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
    const adjustedTaxAmount = (discountedSubtotal * averageTaxRate) / 100;

    const totalAmount = discountedSubtotal + adjustedTaxAmount;

    // Get exchange rate and convert to INR
    const invoiceDate = invoiceData.invoice_date.split('T')[0]; // Get date part only
    let exchangeRate = 1.0;
    let inrSubtotal = subtotal;
    let inrTaxAmount = adjustedTaxAmount;
    let inrTotalAmount = totalAmount;

    if (currencyCode !== 'INR') {
      console.log('🔄 Converting currency to INR:', {
        originalCurrency: currencyCode,
        originalAmount: totalAmount,
        invoiceDate
      });

      try {
        // Use enhanced database-first exchange rate service
        const serviceRate = await exchangeRateService.getExchangeRate(currencyCode, 'INR', invoiceDate);
        
        if (serviceRate && serviceRate > 0) {
          // Validate rate to prevent backward conversion
          if (serviceRate < 10 && ['EUR', 'USD', 'GBP'].includes(currencyCode)) {
            console.warn(`🚨 Exchange rate ${serviceRate} seems too low for ${currencyCode} → INR, this may be incorrect`);
            throw new Error(`Suspicious exchange rate: ${serviceRate}`);
          }
          
          exchangeRate = serviceRate;
          console.log(`✅ Using database exchange rate: 1 ${currencyCode} = ${exchangeRate} INR`);
          
          // Convert amounts to INR using the exchange rate service
          inrSubtotal = await exchangeRateService.convertToINR(subtotal, currencyCode, invoiceDate);
          inrTaxAmount = await exchangeRateService.convertToINR(adjustedTaxAmount, currencyCode, invoiceDate);
          inrTotalAmount = await exchangeRateService.convertToINR(totalAmount, currencyCode, invoiceDate);
          
          console.log('✅ Currency conversion completed via database:', {
            exchangeRate,
            original: { subtotal, taxAmount, totalAmount, currency: currencyCode },
            inr: { inrSubtotal, inrTaxAmount, inrTotalAmount }
          });
        } else {
          throw new Error('Exchange rate service returned null or invalid rate');
        }

      } catch (error) {
        console.error('❌ Currency conversion failed:', error);
        // The enhanced exchange rate service already has emergency fallbacks
        // so this should not happen, but if it does, we need to handle it
        throw new Error(`Currency conversion failed for ${currencyCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('💾 Creating invoice with multi-currency support:', {
      invoiceNumber: finalInvoiceNumber,
      customerId: invoiceData.customer_id,
      originalCurrency: currencyCode,
      originalTotal: totalAmount,
      exchangeRate,
      inrTotal: inrTotalAmount,
      createdBy: currentUser.id
    });

    // Create invoice with multi-currency support
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: finalInvoiceNumber,
        customer_id: invoiceData.customer_id,
        company_settings_id: companySettings.id,
        // Project details
        project_title: invoiceData.project_title,
        estimated_time: invoiceData.estimated_time,
        company_contact_name: invoiceData.company_contact_name,
        company_contact_email: invoiceData.company_contact_email,
        company_contact_phone: invoiceData.company_contact_phone,
        // Invoice dates
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        // Original currency amounts (for display and PDF generation)
        subtotal,
        discount_type: invoiceData.discount_type || null,
        discount_value: invoiceData.discount_value || 0,
        discount_amount: discountAmount,
        tax_amount: adjustedTaxAmount,
        total_amount: totalAmount,
        currency_code: currencyCode,
        // Multi-currency fields
        original_currency_code: currencyCode,
        original_subtotal: subtotal,
        original_tax_amount: adjustedTaxAmount,
        original_total_amount: totalAmount,
        exchange_rate: exchangeRate,
        exchange_rate_date: invoiceDate,
        inr_subtotal: inrSubtotal,
        inr_tax_amount: inrTaxAmount,
        inr_total_amount: inrTotalAmount,
        // Quote reference
        created_from_quote_id: invoiceData.created_from_quote_id || null,
        quote_reference: invoiceData.quote_reference || null,
        // Other fields
        notes: invoiceData.notes,
        terms_conditions: invoiceData.terms_conditions,
        created_by: currentUser.id
      })
      .select('*')
      .single();

    if (invoiceError) throw invoiceError;

    console.log('✅ Invoice created successfully:', {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      currencyCode: invoice.currency_code,
      originalTotal: invoice.original_total_amount,
      inrTotal: invoice.inr_total_amount,
      exchangeRate: invoice.exchange_rate
    });

    // Create invoice items with multi-currency support
    const itemsWithCalculations = await Promise.all(invoiceData.items.map(async (item, index) => {
      let lineTotal = 0;

      // For service-based items: resource_count × quantity (months) × billable_hours × unit_price (rate/hour)
      if (item.is_service_item && item.billable_hours) {
        const resourceCount = item.resource_count || 1;
        lineTotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
      } else {
        // For product-based items: quantity × unit_price
        lineTotal = item.quantity * item.unit_price;
      }

      const itemTaxAmount = (lineTotal * item.tax_rate) / 100;
      
      // Convert item amounts to INR
      let inrUnitPrice = item.unit_price;
      let inrLineTotal = lineTotal;
      let inrItemTaxAmount = itemTaxAmount;

      if (currencyCode !== 'INR') {
        inrUnitPrice = await exchangeRateService.convertToINR(item.unit_price, currencyCode, invoiceDate);
        inrLineTotal = await exchangeRateService.convertToINR(lineTotal, currencyCode, invoiceDate);
        inrItemTaxAmount = await exchangeRateService.convertToINR(itemTaxAmount, currencyCode, invoiceDate);
      }
      
      console.log(`📦 Processing item ${index + 1} with multi-currency:`, {
        product_id: item.product_id || 'NULL/UNDEFINED',
        item_name: item.item_name,
        original: { unit_price: item.unit_price, line_total: lineTotal, tax_amount: itemTaxAmount },
        inr: { unit_price: inrUnitPrice, line_total: inrLineTotal, tax_amount: inrItemTaxAmount }
      });
      
      // Ensure product_id is handled correctly (null for undefined)
      const processedItem = {
        invoice_id: invoice.id,
        product_id: item.product_id || null,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        // Original currency amounts
        unit_price: item.unit_price,
        line_total: lineTotal,
        tax_rate: item.tax_rate,
        tax_amount: itemTaxAmount,
        // Multi-currency fields
        original_unit_price: item.unit_price,
        original_line_total: lineTotal,
        original_tax_amount: itemTaxAmount,
        inr_unit_price: inrUnitPrice,
        inr_line_total: inrLineTotal,
        inr_tax_amount: inrItemTaxAmount,
        // Service-based billing fields
        billable_hours: item.billable_hours || null,
        resource_count: item.resource_count || null,
        is_service_item: item.is_service_item || false,
        // Other fields
        hsn_code: item.hsn_code || null
      };
      
      return processedItem;
    }));

    console.log('💾 Inserting invoice items with multi-currency:', {
      invoiceId: invoice.id,
      itemCount: itemsWithCalculations.length
    });

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithCalculations);

    if (itemsError) {
      console.error('❌ Error inserting invoice items:', {
        error: itemsError,
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        code: itemsError.code
      });
      throw itemsError;
    }

    console.log('✅ Invoice items inserted successfully with multi-currency support');

    // Automatically fix currency conversion after creating the invoice
    await this.fixInvoiceCurrencyConversion(invoice.id);

    // Return complete invoice with relations
    return this.getInvoiceById(invoice.id) as Promise<Invoice>;
  }

  async updateInvoice(id: string, invoiceData: Partial<CreateInvoiceData>): Promise<Invoice> {
    console.log('🔧 updateInvoice started:', { id, invoiceData });
    
    try {
      // First update the basic invoice fields
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_id: invoiceData.customer_id,
          invoice_date: invoiceData.invoice_date,
          due_date: invoiceData.due_date,
          // Project details
          project_title: invoiceData.project_title,
          estimated_time: invoiceData.estimated_time,
          company_contact_name: invoiceData.company_contact_name,
          company_contact_email: invoiceData.company_contact_email,
          company_contact_phone: invoiceData.company_contact_phone,
          // Discount fields
          discount_type: invoiceData.discount_type || null,
          discount_value: invoiceData.discount_value || 0,
          // Additional info
          notes: invoiceData.notes,
          terms_conditions: invoiceData.terms_conditions,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();
      
      if (invoiceError) {
        console.error('❌ Invoice update error:', invoiceError);
        throw invoiceError;
      }
      
      console.log('✅ Invoice basic fields updated:', invoice);

      // If items are provided, update them
      if (invoiceData.items && invoiceData.items.length > 0) {
        console.log('🔄 Updating invoice items, count:', invoiceData.items.length);
        
        // Get customer to determine currency for multi-currency conversion
        const customer = await this.getCustomerById(invoice.customer_id);
        let currencyCode = 'INR'; // Default fallback
        
        if (customer && customer.country) {
          currencyCode = customer.country.currency_code;
          console.log('✅ Using customer country currency for update:', {
            countryCode: customer.country.code,
            currencyCode: customer.country.currency_code,
            currencySymbol: customer.country.currency_symbol
          });
        } else {
          console.log('⚠️ No customer country found for update, using default INR');
        }
        
        // Delete existing invoice items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', id);
        
        if (deleteError) {
          console.error('❌ Delete existing items error:', {
            error: deleteError,
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint,
            code: deleteError.code,
            invoiceId: id
          });
          throw new Error(`Failed to delete existing invoice items: ${deleteError.message || JSON.stringify(deleteError)}`);
        }
        
        console.log('🗑️ Existing items deleted');

        // Calculate totals and prepare new items with multi-currency support
        let subtotal = 0;
        let taxAmount = 0;
        const invoiceDate = invoiceData.invoice_date?.split('T')[0] || invoice.invoice_date?.split('T')[0];

        console.log('📋 Processing invoice items with multi-currency:', {
          itemCount: invoiceData.items.length,
          currencyCode,
          invoiceDate,
          items: invoiceData.items.map((item, index) => ({
            index,
            item_name: item.item_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            product_id: item.product_id,
            hasDescription: !!item.description,
            hasUnit: !!item.unit,
            hasHsnCode: !!item.hsn_code
          }))
        });

        // Get exchange rate for currency conversion
        let exchangeRate = 1.0;
        if (currencyCode !== 'INR') {
          try {
            const serviceRate = await exchangeRateService.getExchangeRate(currencyCode, 'INR', invoiceDate);
            
            if (serviceRate && serviceRate > 0) {
              // Validate rate to prevent backward conversion
              if (serviceRate < 10 && ['EUR', 'USD', 'GBP'].includes(currencyCode)) {
                console.warn(`🚨 Exchange rate ${serviceRate} seems too low for ${currencyCode} → INR during update`);
                throw new Error(`Suspicious exchange rate: ${serviceRate}`);
              }
              
              exchangeRate = serviceRate;
              console.log(`✅ Using database exchange rate for update: 1 ${currencyCode} = ${exchangeRate} INR`);
            } else {
              throw new Error('Exchange rate service returned null or invalid rate');
            }
          } catch (error) {
            console.error('❌ Currency conversion failed during update:', error);
            throw new Error(`Currency conversion failed for ${currencyCode}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }

        // Create invoice items with multi-currency support
        const itemsWithCalculations = await Promise.all(invoiceData.items.map(async (item, index) => {
          let lineTotal = 0;

          // For service-based items: resource_count × quantity (months) × billable_hours × unit_price (rate/hour)
          if (item.is_service_item && item.billable_hours) {
            const resourceCount = item.resource_count || 1;
            lineTotal = resourceCount * item.quantity * item.billable_hours * item.unit_price;
          } else {
            // For product-based items: quantity × unit_price
            lineTotal = item.quantity * item.unit_price;
          }

          const itemTaxAmount = (lineTotal * item.tax_rate) / 100;
          subtotal += lineTotal;
          taxAmount += itemTaxAmount;
          
          // Convert item amounts to INR
          let inrUnitPrice = item.unit_price;
          let inrLineTotal = lineTotal;
          let inrItemTaxAmount = itemTaxAmount;

          if (currencyCode !== 'INR') {
            inrUnitPrice = await exchangeRateService.convertToINR(item.unit_price, currencyCode, invoiceDate);
            inrLineTotal = await exchangeRateService.convertToINR(lineTotal, currencyCode, invoiceDate);
            inrItemTaxAmount = await exchangeRateService.convertToINR(itemTaxAmount, currencyCode, invoiceDate);
          }
          
          console.log(`� Processing update item ${index + 1} with multi-currency:`, {
            product_id: item.product_id || 'NULL/UNDEFINED',
            item_name: item.item_name,
            original: { unit_price: item.unit_price, line_total: lineTotal, tax_amount: itemTaxAmount },
            inr: { unit_price: inrUnitPrice, line_total: inrLineTotal, tax_amount: inrItemTaxAmount }
          });

          return {
            invoice_id: id,
            product_id: item.product_id || null,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            // Original currency amounts
            unit_price: item.unit_price,
            line_total: lineTotal,
            tax_rate: item.tax_rate,
            tax_amount: itemTaxAmount,
            // Multi-currency fields
            original_unit_price: item.unit_price,
            original_line_total: lineTotal,
            original_tax_amount: itemTaxAmount,
            inr_unit_price: inrUnitPrice,
            inr_line_total: inrLineTotal,
            inr_tax_amount: inrItemTaxAmount,
            // Service-based billing fields
            billable_hours: item.billable_hours || null,
            resource_count: item.resource_count || null,
            is_service_item: item.is_service_item || false,
            // Other fields
            hsn_code: item.hsn_code || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        }));

        console.log('💾 Inserting new items with multi-currency support:', { 
          itemCount: itemsWithCalculations.length, 
          subtotal, 
          taxAmount,
          currencyCode,
          exchangeRate
        });

        // Insert new invoice items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(itemsWithCalculations);
        
        if (itemsError) {
          console.error('❌ Insert new items error:', {
            error: itemsError,
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint,
            code: itemsError.code,
            invoiceItems: itemsWithCalculations
          });
          throw new Error(`Failed to insert invoice items: ${itemsError.message || JSON.stringify(itemsError)}`);
        }
        
        console.log('✅ New items inserted successfully with multi-currency support');

        // Calculate discount
        let discountAmount = 0;
        if (invoiceData.discount_type && invoiceData.discount_value) {
          const discountValue = Number(invoiceData.discount_value);
          if (invoiceData.discount_type === 'percentage') {
            discountAmount = (subtotal * discountValue) / 100;
          } else {
            discountAmount = discountValue;
          }
        }

        // Recalculate tax on discounted subtotal
        const discountedSubtotal = subtotal - discountAmount;
        const averageTaxRate = taxAmount > 0 && subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
        const adjustedTaxAmount = (discountedSubtotal * averageTaxRate) / 100;

        // Convert totals to INR for multi-currency support
        const totalAmount = discountedSubtotal + adjustedTaxAmount;
        let inrSubtotal = subtotal;
        let inrTaxAmount = adjustedTaxAmount;
        let inrTotalAmount = totalAmount;

        if (currencyCode !== 'INR') {
          inrSubtotal = await exchangeRateService.convertToINR(subtotal, currencyCode, invoiceDate);
          inrTaxAmount = await exchangeRateService.convertToINR(adjustedTaxAmount, currencyCode, invoiceDate);
          inrTotalAmount = await exchangeRateService.convertToINR(totalAmount, currencyCode, invoiceDate);
          
          console.log('✅ Currency conversion completed for invoice update:', {
            exchangeRate,
            original: { subtotal, taxAmount, totalAmount, currency: currencyCode },
            inr: { inrSubtotal, inrTaxAmount, inrTotalAmount }
          });
        }

        // Update invoice totals with multi-currency support
        console.log('🧮 Updating invoice totals with multi-currency:', { 
          subtotal, 
          taxAmount, 
          totalAmount,
          currencyCode,
          exchangeRate,
          inrSubtotal,
          inrTaxAmount,
          inrTotalAmount
        });
        
        const { error: totalsError } = await supabase
          .from('invoices')
          .update({
            // Original currency amounts (for display and PDF generation)
            subtotal,
            discount_type: invoiceData.discount_type || null,
            discount_value: invoiceData.discount_value || 0,
            discount_amount: discountAmount,
            tax_amount: adjustedTaxAmount,
            total_amount: totalAmount,
            currency_code: currencyCode,
            // Multi-currency fields
            original_currency_code: currencyCode,
            original_subtotal: subtotal,
            original_tax_amount: adjustedTaxAmount,
            original_total_amount: totalAmount,
            exchange_rate: exchangeRate,
            exchange_rate_date: invoiceDate,
            inr_subtotal: inrSubtotal,
            inr_tax_amount: inrTaxAmount,
            inr_total_amount: inrTotalAmount,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (totalsError) {
          console.error('❌ Update totals error:', totalsError);
          throw totalsError;
        }
        
        console.log('✅ Invoice totals updated with multi-currency support');
      }

      // Return the complete updated invoice with all relations
      console.log('🔍 Fetching complete updated invoice');
      const { data: updatedInvoice, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(
            *,
            country:countries(*)
          ),
          company_settings:company_settings(
            *,
            country:countries(*)
          ),
          invoice_items:invoice_items(
            *,
            product:products(*)
          ),
          payments:payments(*)
        `)
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('❌ Fetch updated invoice error:', fetchError);
        throw fetchError;
      }
      
      // Automatically fix currency conversion after updating the invoice
      await this.fixInvoiceCurrencyConversion(id);
      
      console.log('✅ Invoice update completed successfully');
      return updatedInvoice;
    } catch (error) {
      console.error('❌ updateInvoice failed:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        invoiceId: id,
        invoiceData
      });
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Update invoice failed: ${JSON.stringify(error)}`);
      }
    }
  }

  async updateInvoiceStatus(id: string, status: Invoice['status'], paymentStatus?: Invoice['payment_status']): Promise<Invoice> {
    const updateData: { status: Invoice['status']; payment_status?: Invoice['payment_status']; updated_at: string } = { 
      status, 
      updated_at: new Date().toISOString() 
    };
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        customer:customers(
          *,
          country:countries(*)
        ),
        company_settings:company_settings(
          *,
          country:countries(*)
        ),
        invoice_items:invoice_items(
          *,
          product:products(*)
        ),
        payments:payments(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  }

  async deleteInvoice(id: string): Promise<void> {
    // Soft delete: update status to cancelled instead of hard delete
    // This preserves data integrity and audit trails
    const { error } = await supabase
      .from('invoices')
      .update({ 
        status: 'cancelled', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) throw error;
  }

  async duplicateInvoice(id: string): Promise<Invoice> {
    // Get the original invoice with all its items
    const originalInvoice = await this.getInvoiceById(id);
    if (!originalInvoice) {
      throw new Error('Invoice not found');
    }

    // Create new invoice data
    const newInvoiceData: CreateInvoiceData = {
      customer_id: originalInvoice.customer_id,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: originalInvoice.due_date || '',
      notes: originalInvoice.notes || '',
      terms_conditions: originalInvoice.terms_conditions || '',
      items: originalInvoice.invoice_items?.map(item => ({
        product_id: item.product_id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        hsn_code: item.hsn_code
      })) || []
    };

    // Create the new invoice
    return await this.createInvoice(newInvoiceData);
  }

  // Payments
  async createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert(payment)
      .select('*')
      .single();
    
    if (error) throw error;

    // Update invoice payment status
    const invoice = await this.getInvoiceById(payment.invoice_id);
    if (invoice) {
      const totalPaid = (invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0) + payment.amount;
      let paymentStatus: Invoice['payment_status'] = 'pending';
      
      if (totalPaid >= invoice.total_amount) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await this.updateInvoiceStatus(payment.invoice_id, 'sent', paymentStatus);
    }

    return data;
  }

  // Dashboard Statistics
  async getInvoiceStats(): Promise<InvoiceStats> {
    console.log('📊 Starting getInvoiceStats calculation...');
    
    // Always try the database view first, but prepare for fallback
    const { data: multicurrencyStats, error: viewError } = await supabase
      .from('invoice_stats_multicurrency')
      .select('*')
      .single();
    
    if (viewError) {
      console.warn('📋 Multi-currency stats view not available, using fallback calculation:', viewError.message);
    } else {
      console.log('✅ Multi-currency view data retrieved:', multicurrencyStats);
    }
    
    // Always fetch raw invoice data for verification and fallback
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('status, payment_status, total_amount, inr_total_amount, original_currency_code, invoice_date');
    
    if (invoicesError) {
      console.error('❌ Failed to fetch invoices for stats:', invoicesError);
      throw invoicesError;
    }

    console.log(`📊 Processing ${invoices?.length || 0} invoices for stats calculation`);

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate fallback stats using raw invoice data with INR amounts
    const fallbackStats = {
      total_invoices: invoices?.length || 0,
      draft_invoices: invoices?.filter(i => i.status === 'draft').length || 0,
      sent_invoices: invoices?.filter(i => i.status === 'sent').length || 0,
      paid_invoices: invoices?.filter(i => i.payment_status === 'paid' && i.status !== 'cancelled').length || 0,
      overdue_invoices: invoices?.filter(i => i.status === 'overdue').length || 0,
      cancelled_invoices: invoices?.filter(i => i.status === 'cancelled').length || 0,
      
      // All calculations now use INR amounts for consistency
      total_revenue: invoices?.filter(i => i.payment_status === 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      pending_amount: invoices?.filter(i => i.payment_status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      this_month_revenue: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && i.status !== 'cancelled' &&
               invoiceDate.getMonth() === currentMonth && 
               invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      this_year_revenue: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && i.status !== 'cancelled' && invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      
      // Multi-currency calculations (INR) - with fallback to original amounts
      total_revenue_inr: invoices?.filter(i => i.payment_status === 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      pending_amount_inr: invoices?.filter(i => i.payment_status !== 'paid' && i.status !== 'cancelled').reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      this_month_revenue_inr: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && i.status !== 'cancelled' &&
               invoiceDate.getMonth() === currentMonth && 
               invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0,
      this_year_revenue_inr: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && i.status !== 'cancelled' && invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + (i.inr_total_amount || i.total_amount || 0), 0) || 0
    };

    console.log('💰 Calculated fallback stats:', {
      pending_amount_inr: fallbackStats.pending_amount_inr,
      total_revenue_inr: fallbackStats.total_revenue_inr,
      total_invoices: fallbackStats.total_invoices,
      paid_invoices: fallbackStats.paid_invoices,
      cancelled_invoices: fallbackStats.cancelled_invoices
    });

    // If view is not available or unreliable, use fallback calculation
    if (viewError || !multicurrencyStats) {
      console.log('🔄 Using fallback stats calculation');
      const stats: InvoiceStats = {
        ...fallbackStats,
        // Ensure multi-currency fields are properly set
        currency_breakdown: {}
      };
      return stats;
    }

    // If view is available, use it but verify pending amount calculation
    console.log('🔍 Comparing view vs fallback pending amounts:', {
      viewPending: multicurrencyStats.pending_amount_inr,
      fallbackPending: fallbackStats.pending_amount_inr,
      difference: Math.abs((multicurrencyStats.pending_amount_inr || 0) - fallbackStats.pending_amount_inr)
    });

    // Use fallback calculation for pending amount if there's a significant difference
    const useFallbackPending = Math.abs((multicurrencyStats.pending_amount_inr || 0) - fallbackStats.pending_amount_inr) > 1000;
    
    if (useFallbackPending) {
      console.warn('⚠️ Large difference detected in pending amounts, using fallback calculation');
    }

    const stats: InvoiceStats = {
      total_invoices: multicurrencyStats.total_invoices || fallbackStats.total_invoices,
      draft_invoices: multicurrencyStats.draft_invoices || fallbackStats.draft_invoices,
      sent_invoices: multicurrencyStats.sent_invoices || fallbackStats.sent_invoices,
      paid_invoices: multicurrencyStats.paid_invoices || fallbackStats.paid_invoices,
      overdue_invoices: multicurrencyStats.overdue_invoices || fallbackStats.overdue_invoices,
      cancelled_invoices: multicurrencyStats.cancelled_invoices || fallbackStats.cancelled_invoices,
      
      // Use INR amounts as primary amounts for dashboard
      total_revenue: multicurrencyStats.total_revenue_inr || fallbackStats.total_revenue_inr,
      pending_amount: useFallbackPending ? fallbackStats.pending_amount_inr : (multicurrencyStats.pending_amount_inr || fallbackStats.pending_amount_inr),
      this_month_revenue: multicurrencyStats.this_month_revenue_inr || fallbackStats.this_month_revenue_inr,
      this_year_revenue: multicurrencyStats.this_year_revenue_inr || fallbackStats.this_year_revenue_inr,
      
      // Multi-currency specific fields
      total_revenue_inr: multicurrencyStats.total_revenue_inr || fallbackStats.total_revenue_inr,
      pending_amount_inr: useFallbackPending ? fallbackStats.pending_amount_inr : (multicurrencyStats.pending_amount_inr || fallbackStats.pending_amount_inr),
      this_month_revenue_inr: multicurrencyStats.this_month_revenue_inr || fallbackStats.this_month_revenue_inr,
      currency_breakdown: multicurrencyStats.currency_breakdown || {}
    };

    console.log('✅ Final stats calculated:', {
      pending_amount: stats.pending_amount,
      pending_amount_inr: stats.pending_amount_inr,
      total_revenue_inr: stats.total_revenue_inr,
      usedFallbackForPending: useFallbackPending
    });

    return stats;
  }

  // Exchange rate management methods
  async updateExchangeRates(forceUpdate: boolean = false): Promise<boolean> {
    return await exchangeRateService.updateExchangeRates(forceUpdate);
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string, date?: string): Promise<number | null> {
    return await exchangeRateService.getExchangeRate(fromCurrency, toCurrency, date);
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string, date?: string) {
    return await exchangeRateService.convertCurrency(amount, fromCurrency, toCurrency, date);
  }

  async convertToINR(amount: number, fromCurrency: string, date?: string): Promise<number> {
    return await exchangeRateService.convertToINR(amount, fromCurrency, date);
  }

  async getAvailableCurrencies() {
    return await exchangeRateService.getAvailableCurrencies();
  }

  /**
   * Fix currency conversion for a specific invoice
   * This method should be called after saving/updating an invoice to ensure correct INR amounts
   */
  async fixInvoiceCurrencyConversion(invoiceId: string): Promise<boolean> {
    try {
      console.log(`🔧 Fixing currency conversion for invoice ${invoiceId}...`);
      
      // Get the invoice
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('id, currency_code, original_currency_code, total_amount, subtotal, tax_amount, inr_total_amount, inr_subtotal, inr_tax_amount, invoice_date')
        .eq('id', invoiceId)
        .single();
        
      if (error || !invoice) {
        console.error('❌ Failed to fetch invoice for currency fix:', error);
        return false;
      }
      
      const currencyCode = invoice.original_currency_code || invoice.currency_code || 'INR';
      
      // If already INR or INR amounts already exist and seem correct, skip
      if (currencyCode === 'INR') {
        if (!invoice.inr_total_amount || invoice.inr_total_amount !== invoice.total_amount) {
          await supabase
            .from('invoices')
            .update({
              inr_total_amount: invoice.total_amount,
              inr_subtotal: invoice.subtotal,
              inr_tax_amount: invoice.tax_amount,
              original_currency_code: 'INR',
              exchange_rate: 1.0,
              exchange_rate_date: invoice.invoice_date
            })
            .eq('id', invoiceId);
          console.log(`✅ Fixed INR invoice ${invoiceId}`);
        }
        return true;
      }
      
      // For non-INR currencies, check if conversion is needed
      if (invoice.inr_total_amount && invoice.inr_total_amount > 10) {
        console.log(`✅ Invoice ${invoiceId} already has valid INR conversion`);
        return true;
      }
      
      // Need to convert to INR
      console.log(`🔄 Converting ${currencyCode} to INR for invoice ${invoiceId}`);
      
      // Use fallback rates for reliability - Updated with current market rates (Aug 2025)
      const fallbackRates: { [key: string]: number } = {
        'USD': 83.0,      // 1 USD = 83.0 INR
        'GBP': 105.0,     // 1 GBP = 105.0 INR  
        'EUR': 101.15,    // 1 EUR = 101.15 INR (updated from 90.0)
        'AUD': 55.0,      // 1 AUD = 55.0 INR
        'CAD': 61.0,      // 1 CAD = 61.0 INR
        'SGD': 62.0,      // 1 SGD = 62.0 INR
        'AED': 22.5,      // 1 AED = 22.5 INR
        'SAR': 22.0,      // 1 SAR = 22.0 INR
        'JPY': 0.56,      // 1 JPY = 0.56 INR
        'CNY': 11.5       // 1 CNY = 11.5 INR
      };
      
      const exchangeRate = fallbackRates[currencyCode] || 1.0;
      const inrTotalAmount = Math.round((invoice.total_amount * exchangeRate) * 100) / 100;
      const inrSubtotal = Math.round((invoice.subtotal * exchangeRate) * 100) / 100;
      const inrTaxAmount = Math.round((invoice.tax_amount * exchangeRate) * 100) / 100;
      
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          original_currency_code: currencyCode,
          original_total_amount: invoice.total_amount,
          original_subtotal: invoice.subtotal,
          original_tax_amount: invoice.tax_amount,
          inr_total_amount: inrTotalAmount,
          inr_subtotal: inrSubtotal,
          inr_tax_amount: inrTaxAmount,
          exchange_rate: exchangeRate,
          exchange_rate_date: invoice.invoice_date
        })
        .eq('id', invoiceId);
        
      if (updateError) {
        console.error(`❌ Failed to update invoice ${invoiceId} with INR amounts:`, updateError);
        return false;
      }
      
      console.log(`✅ Fixed invoice ${invoiceId}: ${currencyCode} ${invoice.total_amount} → INR ${inrTotalAmount} (rate: ${exchangeRate})`);
      return true;
    } catch (error) {
      console.error(`❌ Currency fix failed for invoice ${invoiceId}:`, error);
      return false;
    }
  }

  /**
   * Fix missing INR amounts for existing invoices
   * This method should be called to update invoices that were created before multi-currency support
   */
  async fixMissingINRAmounts(): Promise<{ updated: number; errors: string[] }> {
    console.log('🔧 Starting to fix missing INR amounts for existing invoices...');

    try {
      // Check authentication first
      const currentUser = await simpleAuth.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get all invoices with missing INR amounts or where INR amount seems incorrect
      console.log('📋 Fetching invoices that need INR amount fixes...');
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, currency_code, original_currency_code, total_amount, original_total_amount, inr_total_amount, subtotal, original_subtotal, inr_subtotal, tax_amount, original_tax_amount, inr_tax_amount, invoice_date, exchange_rate')
        .or('inr_total_amount.is.null,and(currency_code.neq.INR,inr_total_amount.lt.10),and(currency_code.neq.INR,inr_total_amount.eq.total_amount)');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        console.log('✅ No invoices need INR amount fixes');
        return { updated: 0, errors: [] };
      }

      console.log(`📊 Found ${invoices.length} invoices that need INR amount fixes`);

      let updated = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          const currencyCode = invoice.original_currency_code || invoice.currency_code;
          
          if (currencyCode === 'INR') {
            // For INR invoices, INR amount should equal original amount
            console.log(`💰 Fixing INR invoice ${invoice.id}`);
            const { error: updateError } = await supabase
              .from('invoices')
              .update({
                inr_total_amount: invoice.original_total_amount || invoice.total_amount,
                inr_subtotal: invoice.original_subtotal || invoice.subtotal,
                inr_tax_amount: invoice.original_tax_amount || invoice.tax_amount,
                exchange_rate: 1.0
              })
              .eq('id', invoice.id);

            if (updateError) {
              console.error(`❌ Failed to update INR invoice ${invoice.id}:`, updateError);
              throw updateError;
            }
            updated++;
            console.log(`✅ Fixed INR invoice ${invoice.id}`);
          } else {
            // For non-INR invoices, convert to INR using exchange rate service
            const totalAmount = invoice.original_total_amount || invoice.total_amount;
            const subtotal = invoice.original_subtotal || invoice.subtotal;
            const taxAmount = invoice.original_tax_amount || invoice.tax_amount;

            console.log(`🔄 Converting ${currencyCode} amounts to INR for invoice ${invoice.id}`);

            try {
              const exchangeRate = await exchangeRateService.getExchangeRate(currencyCode, 'INR', invoice.invoice_date) || 1.0;
              const inrTotalAmount = await exchangeRateService.convertToINR(totalAmount, currencyCode, invoice.invoice_date);
              const inrSubtotal = await exchangeRateService.convertToINR(subtotal, currencyCode, invoice.invoice_date);
              const inrTaxAmount = await exchangeRateService.convertToINR(taxAmount, currencyCode, invoice.invoice_date);

              console.log(`💱 Conversion results: ${currencyCode} ${totalAmount} -> INR ${inrTotalAmount} (rate: ${exchangeRate})`);

              const { error: updateError } = await supabase
                .from('invoices')
                .update({
                  original_currency_code: currencyCode,
                  original_total_amount: totalAmount,
                  original_subtotal: subtotal,
                  original_tax_amount: taxAmount,
                  inr_total_amount: inrTotalAmount,
                  inr_subtotal: inrSubtotal,
                  inr_tax_amount: inrTaxAmount,
                  exchange_rate: exchangeRate,
                  exchange_rate_date: invoice.invoice_date
                })
                .eq('id', invoice.id);

              if (updateError) {
                console.error(`❌ Failed to update non-INR invoice ${invoice.id}:`, updateError);
                throw updateError;
              }
              updated++;
              console.log(`✅ Fixed non-INR invoice ${invoice.id}: ${currencyCode} ${totalAmount} -> INR ${inrTotalAmount} (rate: ${exchangeRate})`);
            } catch (conversionError) {
              console.warn(`⚠️ Conversion failed for invoice ${invoice.id}, using fallback (rate=1.0)`);
              // Fallback: use 1:1 conversion if exchange rate service fails
              const { error: updateError } = await supabase
                .from('invoices')
                .update({
                  original_currency_code: currencyCode,
                  original_total_amount: totalAmount,
                  original_subtotal: subtotal,
                  original_tax_amount: taxAmount,
                  inr_total_amount: totalAmount, // Fallback 1:1
                  inr_subtotal: subtotal,
                  inr_tax_amount: taxAmount,
                  exchange_rate: 1.0,
                  exchange_rate_date: invoice.invoice_date
                })
                .eq('id', invoice.id);

              if (updateError) throw updateError;
              updated++;
              console.log(`✅ Fixed invoice ${invoice.id} with fallback conversion`);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to fix invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 INR amount fix completed: ${updated} invoices updated, ${errors.length} errors`);
      return { updated, errors };
    } catch (error) {
      console.error('💥 Failed to fix missing INR amounts:', error);
      throw error;
    }
  }

  /**
   * Quick fix for missing INR amounts using fallback exchange rates
   * This is a simpler version that doesn't rely on external APIs
   */
  async quickFixMissingINRAmounts(): Promise<{ updated: number; errors: string[] }> {
    console.log('🔧 Starting quick fix for missing INR amounts using fallback rates...');

    try {
      // Check authentication first
      const currentUser = await simpleAuth.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Simple fallback exchange rates (approximate values)
      const fallbackRates: { [key: string]: number } = {
        'USD': 83.0,
        'GBP': 105.0,
        'EUR': 90.0,
        'AUD': 55.0,
        'CAD': 61.0,
        'SGD': 62.0,
        'AED': 22.5,
        'SAR': 22.0,
        'JPY': 0.56,
        'CNY': 11.5,
        'INR': 1.0
      };

      // Get all invoices with missing or incorrect INR amounts
      console.log('📋 Fetching invoices that need INR amount fixes...');
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, currency_code, original_currency_code, total_amount, original_total_amount, inr_total_amount, subtotal, original_subtotal, inr_subtotal, tax_amount, original_tax_amount, inr_tax_amount, invoice_date')
        .or('inr_total_amount.is.null,and(currency_code.neq.INR,inr_total_amount.lt.10),and(currency_code.neq.INR,inr_total_amount.eq.total_amount)');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        console.log('✅ No invoices need INR amount fixes');
        return { updated: 0, errors: [] };
      }

      console.log(`📊 Found ${invoices.length} invoices that need INR amount fixes`);

      let updated = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          const currencyCode = invoice.original_currency_code || invoice.currency_code || 'INR';
          const totalAmount = invoice.original_total_amount || invoice.total_amount;
          const subtotal = invoice.original_subtotal || invoice.subtotal;
          const taxAmount = invoice.original_tax_amount || invoice.tax_amount;

          const exchangeRate = fallbackRates[currencyCode] || 1.0;
          const inrTotalAmount = totalAmount * exchangeRate;
          const inrSubtotal = subtotal * exchangeRate;
          const inrTaxAmount = taxAmount * exchangeRate;

          console.log(`💱 Converting ${currencyCode} ${totalAmount} -> INR ${inrTotalAmount} (rate: ${exchangeRate})`);

          const { error: updateError } = await supabase
            .from('invoices')
            .update({
              original_currency_code: currencyCode,
              original_total_amount: totalAmount,
              original_subtotal: subtotal,
              original_tax_amount: taxAmount,
              inr_total_amount: Math.round(inrTotalAmount * 100) / 100, // Round to 2 decimal places
              inr_subtotal: Math.round(inrSubtotal * 100) / 100,
              inr_tax_amount: Math.round(inrTaxAmount * 100) / 100,
              exchange_rate: exchangeRate,
              exchange_rate_date: invoice.invoice_date
            })
            .eq('id', invoice.id);

          if (updateError) {
            console.error(`❌ Failed to update invoice ${invoice.id}:`, updateError);
            throw updateError;
          }
          
          updated++;
          console.log(`✅ Fixed invoice ${invoice.id}: ${currencyCode} ${totalAmount} -> INR ${Math.round(inrTotalAmount * 100) / 100}`);
        } catch (error) {
          const errorMsg = `Failed to fix invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Quick fix completed: ${updated} invoices updated, ${errors.length} errors`);
      return { updated, errors };
    } catch (error) {
      console.error('💥 Failed to quick fix missing INR amounts:', error);
      throw error;
    }
  }

  /**
   * Force fix ALL invoices with currency conversion (more aggressive)
   * This will recalculate INR amounts for all non-INR invoices regardless of current state
   */
  async forceFixAllCurrencyConversions(): Promise<{ updated: number; errors: string[] }> {
    console.log('🔧 Starting FORCE fix for ALL invoice currency conversions...');

    try {
      // Check authentication first
      const currentUser = await simpleAuth.getCurrentUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Simple fallback exchange rates (approximate values)
      const fallbackRates: { [key: string]: number } = {
        'USD': 83.0,
        'GBP': 105.0,
        'EUR': 90.0,
        'AUD': 55.0,
        'CAD': 61.0,
        'SGD': 62.0,
        'AED': 22.5,
        'SAR': 22.0,
        'JPY': 0.56,
        'CNY': 11.5,
        'INR': 1.0
      };

      // Get ALL invoices to force fix them
      console.log('📋 Fetching ALL invoices for force currency fix...');
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, currency_code, original_currency_code, total_amount, original_total_amount, inr_total_amount, subtotal, original_subtotal, inr_subtotal, tax_amount, original_tax_amount, inr_tax_amount, invoice_date');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) {
        console.log('✅ No invoices found');
        return { updated: 0, errors: [] };
      }

      console.log(`📊 Found ${invoices.length} invoices for force currency fix`);

      let updated = 0;
      const errors: string[] = [];

      for (const invoice of invoices) {
        try {
          const currencyCode = invoice.original_currency_code || invoice.currency_code || 'INR';
          const totalAmount = invoice.original_total_amount || invoice.total_amount;
          const subtotal = invoice.original_subtotal || invoice.subtotal;
          const taxAmount = invoice.original_tax_amount || invoice.tax_amount;

          console.log(`🔄 Force fixing invoice ${invoice.id}: ${currencyCode} ${totalAmount}`);

          if (currencyCode === 'INR') {
            // For INR invoices, INR amount should equal original amount
            const { error: updateError } = await supabase
              .from('invoices')
              .update({
                original_currency_code: 'INR',
                original_total_amount: totalAmount,
                original_subtotal: subtotal,
                original_tax_amount: taxAmount,
                inr_total_amount: totalAmount,
                inr_subtotal: subtotal,
                inr_tax_amount: taxAmount,
                exchange_rate: 1.0,
                exchange_rate_date: invoice.invoice_date
              })
              .eq('id', invoice.id);

            if (updateError) {
              console.error(`❌ Failed to update INR invoice ${invoice.id}:`, updateError);
              throw updateError;
            }
            console.log(`✅ Force fixed INR invoice ${invoice.id}: INR ${totalAmount}`);
          } else {
            // For non-INR invoices, convert using fallback rates
            const exchangeRate = fallbackRates[currencyCode] || 1.0;
            const inrTotalAmount = totalAmount * exchangeRate;
            const inrSubtotal = subtotal * exchangeRate;
            const inrTaxAmount = taxAmount * exchangeRate;

            const { error: updateError } = await supabase
              .from('invoices')
              .update({
                original_currency_code: currencyCode,
                original_total_amount: totalAmount,
                original_subtotal: subtotal,
                original_tax_amount: taxAmount,
                inr_total_amount: Math.round(inrTotalAmount * 100) / 100,
                inr_subtotal: Math.round(inrSubtotal * 100) / 100,
                inr_tax_amount: Math.round(inrTaxAmount * 100) / 100,
                exchange_rate: exchangeRate,
                exchange_rate_date: invoice.invoice_date
              })
              .eq('id', invoice.id);

            if (updateError) {
              console.error(`❌ Failed to update invoice ${invoice.id}:`, updateError);
              throw updateError;
            }
            console.log(`✅ Force fixed invoice ${invoice.id}: ${currencyCode} ${totalAmount} -> INR ${Math.round(inrTotalAmount * 100) / 100} (rate: ${exchangeRate})`);
          }
          
          updated++;
        } catch (error) {
          const errorMsg = `Failed to force fix invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error('❌', errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`🎉 Force fix completed: ${updated} invoices updated, ${errors.length} errors`);
      return { updated, errors };
    } catch (error) {
      console.error('💥 Failed to force fix currency conversions:', error);
      throw error;
    }
  }

  /**
   * Create invoice(s) from a quote with optional split capability
   * @param quoteId - The quote ID to convert
   * @param splitOptions - Optional array of item indices for each invoice (for split invoices)
   * @returns Array of created invoice IDs and numbers
   */
  async createInvoicesFromQuote(
    quoteId: string,
    splitOptions?: { itemIndices: number[]; dueDate?: string }[]
  ): Promise<{ invoiceId: string; invoiceNumber: string }[]> {
    // Import quoteService to avoid circular dependency
    const { quoteService } = await import('./quoteService');

    const quote = await quoteService.getQuoteById(quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    if (quote.status === 'converted') {
      throw new Error('Quote has already been converted to an invoice');
    }

    if (!quote.quote_items || quote.quote_items.length === 0) {
      throw new Error('Quote has no items to convert');
    }

    const invoiceSettings = await this.getInvoiceSettings();
    const dueDays = invoiceSettings?.due_days || 30;

    const invoices: { invoiceId: string; invoiceNumber: string }[] = [];

    // If no split options provided, create a single invoice with all items
    if (!splitOptions || splitOptions.length === 0) {
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + dueDays);

      const invoiceData: CreateInvoiceData = {
        customer_id: quote.customer_id,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: defaultDueDate.toISOString().split('T')[0],
        // Copy project details from quote
        project_title: quote.project_title,
        estimated_time: quote.estimated_time,
        company_contact_name: quote.company_contact_name,
        company_contact_email: quote.company_contact_email,
        company_contact_phone: quote.company_contact_phone,
        // Copy discount
        discount_type: quote.discount_type,
        discount_value: quote.discount_value,
        // Quote reference
        created_from_quote_id: quote.id,
        quote_reference: quote.quote_number,
        // Additional info
        notes: quote.notes || `Generated from Quote: ${quote.quote_number}`,
        terms_conditions: quote.terms_conditions || '',
        items: quote.quote_items.map(item => ({
          product_id: item.product_id,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          hsn_code: item.hsn_code,
          billable_hours: item.billable_hours,
          resource_count: item.resource_count,
          is_service_item: item.is_service_item
        }))
      };

      const invoice = await this.createInvoice(invoiceData);
      invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number
      });
    } else {
      // Create multiple invoices (split invoice functionality)
      for (let i = 0; i < splitOptions.length; i++) {
        const option = splitOptions[i];
        const itemIndices = option.itemIndices;

        if (itemIndices.length === 0) {
          continue; // Skip empty splits
        }

        const selectedItems = itemIndices
          .filter(idx => idx >= 0 && idx < quote.quote_items!.length)
          .map(idx => quote.quote_items![idx]);

        if (selectedItems.length === 0) {
          continue; // Skip if no valid items
        }

        const splitDueDate = option.dueDate || (() => {
          const date = new Date();
          date.setDate(date.getDate() + dueDays);
          return date.toISOString().split('T')[0];
        })();

        const invoiceData: CreateInvoiceData = {
          customer_id: quote.customer_id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: splitDueDate,
          // Copy project details from quote
          project_title: quote.project_title,
          estimated_time: quote.estimated_time,
          company_contact_name: quote.company_contact_name,
          company_contact_email: quote.company_contact_email,
          company_contact_phone: quote.company_contact_phone,
          // Note: Discount is not applied to split invoices for accuracy
          // Quote reference
          created_from_quote_id: quote.id,
          quote_reference: `${quote.quote_number} (Split ${i + 1}/${splitOptions.length})`,
          // Additional info
          notes: quote.notes || `Generated from Quote: ${quote.quote_number} - Part ${i + 1} of ${splitOptions.length}`,
          terms_conditions: quote.terms_conditions || '',
          items: selectedItems.map(item => ({
            product_id: item.product_id,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            hsn_code: item.hsn_code,
            billable_hours: item.billable_hours,
            resource_count: item.resource_count,
            is_service_item: item.is_service_item
          }))
        };

        const invoice = await this.createInvoice(invoiceData);
        invoices.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number
        });
      }
    }

    // Update quote status to converted
    await supabase
      .from('quotes')
      .update({
        status: 'converted',
        converted_to_invoice_id: invoices[0].invoiceId, // Reference the first invoice
        converted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    return invoices;
  }
}

export const invoiceService = new InvoiceService();
