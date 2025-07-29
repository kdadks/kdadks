-- Invoice Generation System Database Schema
-- This file contains all the table structures needed for the invoice system

-- 1. Countries Table with Currency Information
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(3) NOT NULL UNIQUE, -- ISO 3166-1 alpha-3
    currency_code VARCHAR(3) NOT NULL, -- ISO 4217
    currency_name VARCHAR(50) NOT NULL,
    currency_symbol VARCHAR(5) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Company/Biller Settings Table (GST Compliant for India)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    address_line1 VARCHAR(200) NOT NULL,
    address_line2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country_id UUID REFERENCES countries(id),
    
    -- GST Information (India specific)
    gstin VARCHAR(15), -- GST Identification Number
    pan VARCHAR(10), -- PAN Number
    cin VARCHAR(21), -- Corporate Identification Number
    
    -- Contact Information
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(200),
    
    -- Banking Information
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(15),
    branch_name VARCHAR(100),
    
    -- Logo and Branding
    logo_url TEXT,
    signature_url TEXT,
    
    -- Settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Invoice Settings Table
CREATE TABLE IF NOT EXISTS invoice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Invoice Number Format
    invoice_prefix VARCHAR(10) DEFAULT 'INV',
    invoice_suffix VARCHAR(10),
    number_format VARCHAR(50) DEFAULT 'PREFIX-YYYY-NNNN', -- Pattern for invoice numbers
    current_number INTEGER DEFAULT 1,
    reset_annually BOOLEAN DEFAULT true,
    
    -- Financial Year Settings
    financial_year_start_month INTEGER DEFAULT 4, -- April for India
    current_financial_year VARCHAR(10), -- e.g., "2024-25"
    
    -- Default Terms and Conditions
    payment_terms TEXT,
    notes TEXT,
    footer_text TEXT,
    
    -- Tax Settings
    default_tax_rate DECIMAL(5,2) DEFAULT 18.00, -- Default GST rate for India
    enable_gst BOOLEAN DEFAULT true,
    
    -- Other Settings
    due_days INTEGER DEFAULT 30,
    late_fee_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Template Settings
    template_name VARCHAR(50) DEFAULT 'default',
    currency_position VARCHAR(10) DEFAULT 'before', -- before/after amount
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Terms and Conditions Template
CREATE TABLE IF NOT EXISTS terms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- payment, shipping, general, etc.
    content TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country_id UUID REFERENCES countries(id),
    
    -- GST Information (if applicable)
    gstin VARCHAR(15),
    pan VARCHAR(10),
    
    -- Customer Settings
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    payment_terms INTEGER DEFAULT 30, -- days
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Products/Services Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    product_code VARCHAR(50),
    category VARCHAR(100),
    
    -- Pricing
    unit_price DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(20) DEFAULT 'pcs', -- pcs, hours, kg, etc.
    
    -- Tax Information
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    hsn_code VARCHAR(20), -- HSN/SAC code for India GST
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES customers(id),
    company_settings_id UUID REFERENCES company_settings(id),
    
    -- Invoice Details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    
    -- Financial Information
    subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'INR',
    
    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, sent, paid, cancelled, overdue
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid
    
    -- Additional Information
    notes TEXT,
    terms_conditions TEXT,
    
    -- Tracking
    created_by UUID, -- Reference to auth.users if needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    
    -- Item Details (can override product defaults)
    description TEXT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
    unit VARCHAR(20) DEFAULT 'pcs',
    unit_price DECIMAL(15,2) NOT NULL,
    
    -- Calculations
    line_total DECIMAL(15,2) NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 18.00,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- HSN/SAC for India GST
    hsn_code VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Payment Records Table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id),
    
    -- Payment Details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(15,2) NOT NULL,
    payment_method VARCHAR(50), -- cash, cheque, bank_transfer, upi, etc.
    reference_number VARCHAR(100),
    
    -- Bank Details (if applicable)
    bank_name VARCHAR(100),
    
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_settings_updated_at BEFORE UPDATE ON invoice_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_terms_templates_updated_at BEFORE UPDATE ON terms_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
