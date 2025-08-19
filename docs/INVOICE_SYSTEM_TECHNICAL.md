# Invoice Management System Technical Documentation

This document provides technical details about the KDADKS Invoice Management System, focusing on architecture, database schema, and implementation patterns.

## Architecture Overview

The Invoice Management System follows a layered architecture:

1. **UI Layer**:
   - React components in `src/components/invoice/`
   - Modal-based interface with state management
   - Tailwind CSS for styling

2. **Service Layer**:
   - `invoiceService.ts` - Core data access and business logic
   - `exchangeRateService.ts` - Currency conversion
   - `emailService.ts` - Email notifications

3. **Data Layer**:
   - Supabase PostgreSQL database
   - Row Level Security (RLS) policies
   - Real-time subscriptions for updates

## Database Schema

### Core Tables

1. **`invoices`**
   ```sql
   CREATE TABLE invoices (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     invoice_number VARCHAR NOT NULL UNIQUE,
     customer_id UUID REFERENCES customers(id),
     company_id UUID REFERENCES company_settings(id),
     issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     due_date TIMESTAMP WITH TIME ZONE,
     subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
     tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
     discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
     total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
     currency VARCHAR(3) NOT NULL DEFAULT 'INR',
     status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')) DEFAULT 'draft',
     payment_status VARCHAR(20) CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')) DEFAULT 'unpaid',
     notes TEXT,
     terms TEXT,
     is_deleted BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     financial_year VARCHAR(7),
     is_recurring BOOLEAN DEFAULT false
   );
   ```

2. **`invoice_items`**
   ```sql
   CREATE TABLE invoice_items (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     invoice_id UUID REFERENCES invoices(id),
     product_id UUID REFERENCES products(id),
     description TEXT,
     quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
     unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
     tax_rate DECIMAL(5,2) DEFAULT 18.00,
     tax_amount DECIMAL(12,2) DEFAULT 0,
     discount_percent DECIMAL(5,2) DEFAULT 0,
     discount_amount DECIMAL(12,2) DEFAULT 0,
     total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
     hsn_code VARCHAR(10),
     is_deleted BOOLEAN NOT NULL DEFAULT false,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

### Supporting Tables

- **`customers`**: Customer information with IGST details
- **`products`**: Products/services with HSN codes and pricing
- **`company_settings`**: Company profiles with branding
- **`invoice_settings`**: Invoice numbering and format settings
- **`countries`**: Countries with currency information
- **`terms_templates`**: Reusable terms and conditions
- **`payments`**: Payment records linked to invoices

## Key Implementation Patterns

### Invoice Number Generation

```typescript
// Financial year calculation (April-March for India)
private calculateFinancialYear(fyStartMonth: number = 4): string {
  const currentDate = new Date();
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

// Auto-increment invoice number with collision prevention
async generateInvoiceNumber(): Promise<string> {
  const settings = await this.getInvoiceSettings();
  const fy = this.calculateFinancialYear(settings.financial_year_start_month);
  
  // Get the last invoice number for this financial year
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `${settings.invoice_prefix}/${fy}/%`)
    .order('created_at', { ascending: false })
    .limit(1);
  
  // Extract the sequence number and increment
  let sequenceNumber = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    const parts = lastInvoice[0].invoice_number.split('/');
    const lastNumber = parseInt(parts[parts.length - 1], 10);
    sequenceNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
  }
  
  // Format the new invoice number
  const paddedNumber = sequenceNumber.toString().padStart(4, '0');
  return `${settings.invoice_prefix}/${fy}/${paddedNumber}`;
}
```

### Tax Calculation

```typescript
// Calculate taxes based on India's IGST system
calculateTaxes(item: InvoiceItem, customerState: string, companyState: string): {
  cgst: number;
  sgst: number;
  igst: number;
} {
  const baseAmount = item.quantity * item.unit_price;
  const taxRate = item.tax_rate / 100;
  
  // Inter-state IGST (IGST only)
  if (customerState !== companyState) {
    return {
      cgst: 0,
      sgst: 0,
      igst: baseAmount * taxRate
    };
  }
  
  // Intra-state IGST (CGST + SGST)
  return {
    cgst: baseAmount * (taxRate / 2),
    sgst: baseAmount * (taxRate / 2),
    igst: 0
  };
}
```

### Multi-Currency Support

```typescript
// Get currency information based on customer's country
async getCustomerCurrency(customerId: string): Promise<{
  code: string;
  symbol: string;
  name: string;
}> {
  const { data: customer } = await supabase
    .from('customers')
    .select('country:countries(*)')
    .eq('id', customerId)
    .single();
    
  if (customer?.country) {
    return {
      code: customer.country.currency_code,
      symbol: customer.country.currency_symbol,
      name: customer.country.currency_name
    };
  }
  
  // Default to INR
  return {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee'
  };
}

// Format amount in the appropriate currency
formatCurrencyAmount(amount: number, currency: { code: string, symbol: string }): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: 2
  }).format(amount);
}
```

## PDF Generation Architecture

The PDF generation follows this process:

1. **Component Rendering**:
   ```typescript
   // In InvoicePdf.tsx
   const generatePdf = async () => {
     const element = document.getElementById('invoice-template');
     
     const pdf = new jsPDF({
       orientation: 'portrait',
       unit: 'mm',
       format: 'a4'
     });
     
     // Convert HTML to canvas
     const canvas = await html2canvas(element, {
       scale: 2,
       logging: false,
       useCORS: true
     });
     
     // Add to PDF
     const imgData = canvas.toDataURL('image/png');
     pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
     
     return pdf;
   };
   ```

2. **Branding Application**:
   ```typescript
   // In pdfBrandingUtils.ts
   static async applyBranding(pdf: jsPDF, company: CompanySettings): Promise<void> {
     // Add header with logo
     if (company.logo_url) {
       await this.addImageToPdf(pdf, company.logo_url, 10, 10, 50, 20);
     }
     
     // Add footer with signature
     if (company.signature_url) {
       await this.addImageToPdf(pdf, company.signature_url, 150, 270, 40, 15);
     }
     
     // Add watermark if needed
     if (company.watermark_url) {
       await this.addWatermark(pdf, company.watermark_url);
     }
   }
   ```

## Email System Architecture

```typescript
// In emailService.ts
static async sendInvoiceEmail(
  invoice: Invoice, 
  customer: Customer,
  company: CompanySettings,
  pdfBuffer: ArrayBuffer,
  isPaidInvoice: boolean = false
): Promise<void> {
  try {
    const subject = isPaidInvoice 
      ? `Payment Receipt - Invoice #${invoice.invoice_number} [PAID]`
      : `Invoice #${invoice.invoice_number} from ${company.company_name}`;
      
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: customer.email,
        subject,
        text: EmailService.generateInvoiceTextEmail(invoice, customer, company, isPaidInvoice),
        html: EmailService.generateInvoiceHtmlEmail(invoice, customer, company, isPaidInvoice),
        attachments: [{
          filename: `Invoice_${invoice.invoice_number}${isPaidInvoice ? '_PAID' : ''}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send email: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
}
```

## API & Data Access Patterns

### Data Access Layer Pattern

```typescript
// All database operations centralized in services
class InvoiceService {
  // Fetch with pagination and filters
  async getInvoices(
    filters: InvoiceFilters = {}, 
    page: number = 1, 
    perPage: number = 10
  ): Promise<PaginatedResponse<Invoice>> {
    // Calculate pagination
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;
    
    // Start query builder
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customer:customers(*),
        company:company_settings(*),
        invoice_items:invoice_items(
          *,
          product:products(*)
        )
      `, { count: 'exact' })
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    
    // Apply pagination
    query = query.range(from, to);
    
    // Execute query
    const { data, error, count } = await query;
    
    if (error) throw error;
    
    return {
      data: data || [],
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage)
    };
  }
  
  // Additional methods...
}
```

## Security Implementation

### Row Level Security

```sql
-- Example RLS policy for invoices
CREATE POLICY "Users can only access their own invoices"
  ON invoices
  FOR ALL
  USING (auth.uid() = company_id);
  
-- Example RLS policy for company settings
CREATE POLICY "Users can only access their own company settings"
  ON company_settings
  FOR ALL
  USING (auth.uid() = user_id);
```

### Authentication Flow

```typescript
// In SimpleAuth.ts
async login(email: string, password: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Login error:', error);
    return false;
  }
}

async logout(): Promise<void> {
  await supabase.auth.signOut();
}

async getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
```

## Performance Optimizations

1. **Query Optimization**:
   - Use of proper indexes on invoice_number, customer_id, etc.
   - Pagination for large result sets
   - Selective fetching of related entities

2. **Rendering Optimization**:
   - Memoization of expensive calculations
   - Virtualized lists for large datasets
   - Lazy loading of components

3. **PDF Generation**:
   - Client-side generation to reduce server load
   - Optimized image handling
   - Progressive rendering for large invoices

---

This technical documentation provides an overview of the implementation details for the KDADKS Invoice Management System.
