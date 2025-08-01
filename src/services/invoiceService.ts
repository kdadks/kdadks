import { supabase, isSupabaseConfigured } from '../config/supabase';
import { simpleAuth } from '../utils/simpleAuth';
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

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    invoiceData.items.forEach(item => {
      const lineTotal = item.quantity * item.unit_price;
      const itemTax = (lineTotal * item.tax_rate) / 100;
      subtotal += lineTotal;
      taxAmount += itemTax;
    });

    const totalAmount = subtotal + taxAmount;

    console.log('💾 Creating invoice with currency:', {
      invoiceNumber: finalInvoiceNumber,
      customerId: invoiceData.customer_id,
      currencyCode,
      totalAmount,
      createdBy: currentUser.id // Use user ID instead of email
    });

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: finalInvoiceNumber,
        customer_id: invoiceData.customer_id,
        company_settings_id: companySettings.id,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency_code: currencyCode, // Use customer's currency
        notes: invoiceData.notes,
        terms_conditions: invoiceData.terms_conditions,
        created_by: currentUser.id // Use current user's UUID
      })
      .select('*')
      .single();

    if (invoiceError) throw invoiceError;

    console.log('✅ Invoice created successfully:', {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      currencyCode: invoice.currency_code,
      totalAmount: invoice.total_amount
    });

    // Create invoice items
    const itemsWithCalculations = invoiceData.items.map((item, index) => {
      const lineTotal = item.quantity * item.unit_price;
      const itemTaxAmount = (lineTotal * item.tax_rate) / 100;
      
      console.log(`📦 Processing item ${index + 1}:`, {
        product_id: item.product_id || 'NULL/UNDEFINED',
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        hsn_code: item.hsn_code || 'NULL/UNDEFINED',
        lineTotal,
        itemTaxAmount
      });
      
      // Ensure product_id is handled correctly (null for undefined)
      const processedItem = {
        invoice_id: invoice.id,
        product_id: item.product_id || null, // Convert undefined to null for database
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: lineTotal,
        tax_rate: item.tax_rate,
        tax_amount: itemTaxAmount,
        hsn_code: item.hsn_code || null // Convert undefined to null for database
      };
      
      console.log(`📝 Processed item ${index + 1} for database:`, {
        product_id: processedItem.product_id,
        item_name: processedItem.item_name,
        hsn_code: processedItem.hsn_code
      });
      
      return processedItem;
    });

    // Validate data before insertion
    console.log('🔍 Validating items before insertion:', {
      totalItems: itemsWithCalculations.length,
      validation: itemsWithCalculations.map((item, index) => ({
        index: index + 1,
        hasInvoiceId: !!item.invoice_id,
        hasItemName: !!item.item_name,
        hasDescription: !!item.description,
        productIdType: typeof item.product_id,
        productIdValue: item.product_id,
        hsnCodeType: typeof item.hsn_code,
        hsnCodeValue: item.hsn_code,
        quantityType: typeof item.quantity,
        unitPriceType: typeof item.unit_price
      }))
    });

    console.log('💾 Inserting invoice items:', {
      invoiceId: invoice.id,
      itemCount: itemsWithCalculations.length,
      items: itemsWithCalculations.map((item, index) => ({
        index: index + 1,
        product_id: item.product_id,
        item_name: item.item_name,
        description: item.description,
        hsn_code: item.hsn_code,
        line_total: item.line_total,
        tax_rate: item.tax_rate
      })),
      fullItemsData: itemsWithCalculations
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
        code: itemsError.code,
        itemsData: itemsWithCalculations.map(item => ({
          product_id: item.product_id,
          item_name: item.item_name,
          hsn_code: item.hsn_code,
          description: item.description
        }))
      });
      throw itemsError;
    }

    console.log('✅ Invoice items inserted successfully');

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

        // Calculate totals and prepare new items
        let subtotal = 0;
        let taxAmount = 0;

        console.log('📋 Processing invoice items:', {
          itemCount: invoiceData.items.length,
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

        const invoiceItems = invoiceData.items.map(item => {
          const lineTotal = item.quantity * item.unit_price;
          const lineTax = (lineTotal * item.tax_rate) / 100;
          subtotal += lineTotal;
          taxAmount += lineTax;

          return {
            invoice_id: id,
            product_id: item.product_id || null,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate,
            hsn_code: item.hsn_code || null,
            line_total: lineTotal,
            tax_amount: lineTax,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        });

        console.log('💾 Inserting new items with totals:', { 
          itemCount: invoiceItems.length, 
          subtotal, 
          taxAmount,
          preparedItems: invoiceItems.map((item, index) => ({
            index,
            invoice_id: item.invoice_id,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
            tax_amount: item.tax_amount,
            product_id: item.product_id,
            unit: item.unit,
            hsn_code: item.hsn_code
          }))
        });

        // Insert new invoice items
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(invoiceItems);
        
        if (itemsError) {
          console.error('❌ Insert new items error:', {
            error: itemsError,
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint,
            code: itemsError.code,
            invoiceItems
          });
          throw new Error(`Failed to insert invoice items: ${itemsError.message || JSON.stringify(itemsError)}`);
        }
        
        console.log('✅ New items inserted successfully');

        // Update invoice totals
        const total = subtotal + taxAmount;
        console.log('🧮 Updating invoice totals:', { subtotal, taxAmount, total });
        
        const { error: totalsError } = await supabase
          .from('invoices')
          .update({
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
        
        if (totalsError) {
          console.error('❌ Update totals error:', totalsError);
          throw totalsError;
        }
        
        console.log('✅ Invoice totals updated');
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
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('status, payment_status, total_amount, invoice_date');
    
    if (error) throw error;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const stats: InvoiceStats = {
      total_invoices: invoices?.length || 0,
      draft_invoices: invoices?.filter(i => i.status === 'draft').length || 0,
      sent_invoices: invoices?.filter(i => i.status === 'sent').length || 0,
      paid_invoices: invoices?.filter(i => i.payment_status === 'paid').length || 0,
      overdue_invoices: invoices?.filter(i => i.status === 'overdue').length || 0,
      total_revenue: invoices?.filter(i => i.payment_status === 'paid').reduce((sum, i) => sum + i.total_amount, 0) || 0,
      pending_amount: invoices?.filter(i => i.payment_status !== 'paid').reduce((sum, i) => sum + i.total_amount, 0) || 0,
      this_month_revenue: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && 
               invoiceDate.getMonth() === currentMonth && 
               invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + i.total_amount, 0) || 0,
      this_year_revenue: invoices?.filter(i => {
        const invoiceDate = new Date(i.invoice_date);
        return i.payment_status === 'paid' && invoiceDate.getFullYear() === currentYear;
      }).reduce((sum, i) => sum + i.total_amount, 0) || 0
    };

    return stats;
  }
}

export const invoiceService = new InvoiceService();
