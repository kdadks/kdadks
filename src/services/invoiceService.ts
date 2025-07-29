import { supabase } from '../config/supabase';
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
  // Countries
  async getCountries(): Promise<Country[]> {
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
  async generateInvoiceNumber(): Promise<string> {
    const settings = await this.getInvoiceSettings();
    if (!settings) throw new Error('Invoice settings not found');

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // Determine financial year
    let financialYear = settings.current_financial_year;
    if (settings.reset_annually) {
      const fyStart = settings.financial_year_start_month;
      if (currentMonth >= fyStart) {
        financialYear = `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
      } else {
        financialYear = `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
      }
    }

    // Generate invoice number based on format
    let invoiceNumber = settings.number_format;
    invoiceNumber = invoiceNumber.replace('PREFIX', settings.invoice_prefix);
    invoiceNumber = invoiceNumber.replace('FY', financialYear);
    invoiceNumber = invoiceNumber.replace('YYYY', currentYear.toString());
    invoiceNumber = invoiceNumber.replace('NNNN', settings.current_number.toString().padStart(4, '0'));
    
    if (settings.invoice_suffix) {
      invoiceNumber = invoiceNumber.replace('SUFFIX', settings.invoice_suffix);
    }

    // Update current number
    await supabase
      .from('invoice_settings')
      .update({ 
        current_number: settings.current_number + 1,
        current_financial_year: financialYear
      })
      .eq('id', settings.id);

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

  async createInvoice(invoiceData: CreateInvoiceData): Promise<Invoice> {
    const invoiceNumber = await this.generateInvoiceNumber();
    const companySettings = await this.getDefaultCompanySettings();
    
    if (!companySettings) {
      throw new Error('Default company settings not found');
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

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        customer_id: invoiceData.customer_id,
        company_settings_id: companySettings.id,
        invoice_date: invoiceData.invoice_date,
        due_date: invoiceData.due_date,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        currency_code: 'INR', // Default to INR
        notes: invoiceData.notes,
        terms_conditions: invoiceData.terms_conditions
      })
      .select('*')
      .single();

    if (invoiceError) throw invoiceError;

    // Create invoice items
    const itemsWithCalculations = invoiceData.items.map(item => {
      const lineTotal = item.quantity * item.unit_price;
      const itemTaxAmount = (lineTotal * item.tax_rate) / 100;
      
      return {
        invoice_id: invoice.id,
        product_id: item.product_id,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        line_total: lineTotal,
        tax_rate: item.tax_rate,
        tax_amount: itemTaxAmount,
        hsn_code: item.hsn_code
      };
    });

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithCalculations);

    if (itemsError) throw itemsError;

    // Return complete invoice with relations
    return this.getInvoiceById(invoice.id) as Promise<Invoice>;
  }

  async updateInvoiceStatus(id: string, status: Invoice['status'], paymentStatus?: Invoice['payment_status']): Promise<Invoice> {
    const updateData: { status: Invoice['status']; payment_status?: Invoice['payment_status'] } = { status };
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) throw error;
    return data;
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
