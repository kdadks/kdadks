-- =====================================================
-- KDADKS Payment Gateway System Database Schema
-- =====================================================
-- This schema creates tables for a comprehensive payment gateway system
-- supporting multiple providers (Razorpay, Stripe, PayPal) for domestic
-- and international payments.
-- 
-- Created: 2024
-- Compatible with: PostgreSQL 13+, Supabase
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PAYMENT GATEWAYS TABLE
-- =====================================================
-- Stores configuration for different payment providers
CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('razorpay', 'stripe', 'paypal', 'other')),
    settings JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_sandbox BOOLEAN NOT NULL DEFAULT false,
    currency_support JSONB NOT NULL DEFAULT '[]', -- Array of supported currency codes
    transaction_fee_percentage DECIMAL(5,4), -- e.g., 2.5000 for 2.5%
    transaction_fee_fixed DECIMAL(10,2), -- Fixed fee amount
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Constraints
    CONSTRAINT valid_settings CHECK (jsonb_typeof(settings) = 'object'),
    CONSTRAINT valid_currency_support CHECK (jsonb_typeof(currency_support) = 'array'),
    CONSTRAINT valid_fee_percentage CHECK (transaction_fee_percentage >= 0 AND transaction_fee_percentage <= 100),
    CONSTRAINT valid_fee_fixed CHECK (transaction_fee_fixed >= 0)
);

-- Indexes for payment_gateways
CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider_type ON payment_gateways(provider_type);
CREATE INDEX IF NOT EXISTS idx_payment_gateways_active ON payment_gateways(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_payment_gateways_sandbox ON payment_gateways(is_sandbox);

-- =====================================================
-- 2. PAYMENT REQUESTS TABLE
-- =====================================================
-- Stores payment requests created for invoices
CREATE TABLE IF NOT EXISTS payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    gateway_id UUID REFERENCES payment_gateways(id),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'expired')
    ),
    
    -- Customer Information
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_name VARCHAR(255),
    
    -- Gateway-specific fields
    gateway_order_id VARCHAR(255), -- Order ID from payment gateway
    gateway_payment_id VARCHAR(255), -- Payment ID from gateway
    
    -- Request lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional data
    metadata JSONB DEFAULT '{}',
    failure_reason TEXT,
    
    -- Audit fields
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_currency_code CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
    CONSTRAINT expires_after_created CHECK (expires_at IS NULL OR expires_at > created_at),
    CONSTRAINT completed_after_created CHECK (completed_at IS NULL OR completed_at >= created_at)
);

-- Indexes for payment_requests
CREATE INDEX IF NOT EXISTS idx_payment_requests_invoice_id ON payment_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_gateway_id ON payment_requests(gateway_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_requests_gateway_order_id ON payment_requests(gateway_order_id) WHERE gateway_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_requests_gateway_payment_id ON payment_requests(gateway_payment_id) WHERE gateway_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_requests_customer_email ON payment_requests(customer_email) WHERE customer_email IS NOT NULL;

-- =====================================================
-- 3. PAYMENT TRANSACTIONS TABLE
-- =====================================================
-- Records all payment transaction attempts and results
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
    gateway_transaction_id VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (
        status IN ('pending', 'processing', 'success', 'failed', 'cancelled', 'refunded', 'partially_refunded')
    ),
    
    -- Transaction details
    payment_method VARCHAR(50), -- card, upi, netbanking, wallet, etc.
    payment_method_details JSONB DEFAULT '{}',
    
    -- Gateway response
    gateway_response JSONB DEFAULT '{}',
    gateway_fee DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Failure details
    failure_code VARCHAR(50),
    failure_reason TEXT,
    
    -- Refund tracking
    refunded_amount DECIMAL(15,2) DEFAULT 0 CHECK (refunded_amount >= 0),
    refund_transactions JSONB DEFAULT '[]',
    
    -- Constraints
    CONSTRAINT valid_currency_code CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_payment_method_details CHECK (jsonb_typeof(payment_method_details) = 'object'),
    CONSTRAINT valid_gateway_response CHECK (jsonb_typeof(gateway_response) = 'object'),
    CONSTRAINT valid_refund_transactions CHECK (jsonb_typeof(refund_transactions) = 'array'),
    CONSTRAINT refunded_amount_not_exceeds_amount CHECK (refunded_amount <= amount),
    CONSTRAINT processed_after_created CHECK (processed_at IS NULL OR processed_at >= created_at)
);

-- Indexes for payment_transactions
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_request_id ON payment_transactions(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_transaction_id ON payment_transactions(gateway_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_processed_at ON payment_transactions(processed_at DESC) WHERE processed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_method ON payment_transactions(payment_method) WHERE payment_method IS NOT NULL;

-- =====================================================
-- 4. PAYMENT LINKS TABLE
-- =====================================================
-- Tracks payment links sent to customers
CREATE TABLE IF NOT EXISTS payment_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_request_id UUID NOT NULL REFERENCES payment_requests(id) ON DELETE CASCADE,
    link_type VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (link_type IN ('email', 'sms', 'whatsapp', 'direct')),
    
    -- Link details
    link_token VARCHAR(255) NOT NULL UNIQUE,
    checkout_url TEXT NOT NULL,
    
    -- Delivery details
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (
        delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')
    ),
    
    -- Tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    accessed_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    
    -- Email/SMS template info
    template_used VARCHAR(100),
    delivery_metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_delivery_metadata CHECK (jsonb_typeof(delivery_metadata) = 'object'),
    CONSTRAINT sent_after_created CHECK (sent_at IS NULL OR sent_at >= created_at),
    CONSTRAINT accessed_after_created CHECK (accessed_at IS NULL OR accessed_at >= created_at),
    CONSTRAINT valid_access_count CHECK (access_count >= 0)
);

-- Indexes for payment_links
CREATE INDEX IF NOT EXISTS idx_payment_links_payment_request_id ON payment_links(payment_request_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_link_token ON payment_links(link_token);
CREATE INDEX IF NOT EXISTS idx_payment_links_link_type ON payment_links(link_type);
CREATE INDEX IF NOT EXISTS idx_payment_links_delivery_status ON payment_links(delivery_status);
CREATE INDEX IF NOT EXISTS idx_payment_links_created_at ON payment_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_links_recipient_email ON payment_links(recipient_email) WHERE recipient_email IS NOT NULL;

-- =====================================================
-- 5. PAYMENT WEBHOOKS TABLE
-- =====================================================
-- Logs all webhook events received from payment gateways
CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gateway_type VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    
    -- Webhook data
    payload JSONB NOT NULL,
    signature VARCHAR(500),
    
    -- Processing status
    status VARCHAR(20) NOT NULL DEFAULT 'received' CHECK (
        status IN ('received', 'processing', 'processed', 'failed', 'ignored')
    ),
    
    -- Timestamps
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Related entities (if identifiable)
    payment_request_id UUID REFERENCES payment_requests(id),
    transaction_id UUID REFERENCES payment_transactions(id),
    
    -- Constraints
    CONSTRAINT valid_payload CHECK (jsonb_typeof(payload) = 'object'),
    CONSTRAINT valid_retry_count CHECK (retry_count >= 0),
    CONSTRAINT processed_after_received CHECK (processed_at IS NULL OR processed_at >= received_at)
);

-- Indexes for payment_webhooks
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_gateway_type ON payment_webhooks(gateway_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_event_type ON payment_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_status ON payment_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_received_at ON payment_webhooks(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_payment_request_id ON payment_webhooks(payment_request_id) WHERE payment_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_transaction_id ON payment_webhooks(transaction_id) WHERE transaction_id IS NOT NULL;

-- =====================================================
-- 6. EXCHANGE RATES TABLE - SKIPPED
-- =====================================================
-- Note: exchange_rates table already exists in the database
-- with different structure. We will use the existing table
-- for currency conversion functionality.

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables with updated_at columns
CREATE TRIGGER update_payment_gateways_updated_at 
    BEFORE UPDATE ON payment_gateways 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_requests_updated_at 
    BEFORE UPDATE ON payment_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on payment tables only (excluding existing exchange_rates)
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Payment Gateways Policies
CREATE POLICY "Users can view active payment gateways" ON payment_gateways
    FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage payment gateways" ON payment_gateways
    FOR ALL USING (auth.role() = 'authenticated');

-- Payment Requests Policies
CREATE POLICY "Users can view their payment requests" ON payment_requests
    FOR SELECT USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = payment_requests.invoice_id 
            AND invoices.created_by = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create payment requests" ON payment_requests
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their payment requests" ON payment_requests
    FOR UPDATE USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = payment_requests.invoice_id 
            AND invoices.created_by = auth.uid()
        )
    );

-- Payment Transactions Policies
CREATE POLICY "Users can view related payment transactions" ON payment_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payment_requests pr
            JOIN invoices i ON i.id = pr.invoice_id
            WHERE pr.id = payment_transactions.payment_request_id
            AND (pr.created_by = auth.uid() OR i.created_by = auth.uid())
        )
    );

CREATE POLICY "System can create payment transactions" ON payment_transactions
    FOR INSERT WITH CHECK (true); -- Webhooks need to create transactions

-- Payment Links Policies
CREATE POLICY "Users can view their payment links" ON payment_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM payment_requests pr
            JOIN invoices i ON i.id = pr.invoice_id
            WHERE pr.id = payment_links.payment_request_id
            AND (pr.created_by = auth.uid() OR i.created_by = auth.uid())
        )
    );

CREATE POLICY "Authenticated users can create payment links" ON payment_links
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Payment Webhooks Policies (Admin only)
CREATE POLICY "Admins can view payment webhooks" ON payment_webhooks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "System can create payment webhooks" ON payment_webhooks
    FOR INSERT WITH CHECK (true); -- Webhooks need to create records

-- Note: Exchange rates policies not included as table already exists

-- =====================================================
-- HELPER FUNCTIONS - Updated for existing exchange_rates table
-- =====================================================

-- Function to get latest exchange rate (adapted for existing table structure)
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency CHAR(3),
    p_to_currency CHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15,8) AS $$
DECLARE
    v_rate DECIMAL(15,8);
BEGIN
    -- If same currency, return 1
    IF p_from_currency = p_to_currency THEN
        RETURN 1.0;
    END IF;
    
    -- Handle conversion using existing exchange_rates table structure
    -- The existing table has base_currency and target_currency (constraint shows target = 'INR')
    -- This means the table stores rates FROM various currencies TO INR
    
    IF p_to_currency = 'INR' THEN
        -- Direct conversion to INR (base case)
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE base_currency = p_from_currency
        AND date <= p_date
        ORDER BY date DESC
        LIMIT 1;
    ELSIF p_from_currency = 'INR' THEN
        -- Conversion from INR to other currency (inverse)
        SELECT (1.0 / rate) INTO v_rate
        FROM exchange_rates
        WHERE base_currency = p_to_currency
        AND date <= p_date
        ORDER BY date DESC
        LIMIT 1;
    ELSE
        -- Cross-currency conversion through INR
        DECLARE
            v_from_to_inr DECIMAL(15,8);
            v_inr_to_target DECIMAL(15,8);
        BEGIN
            -- Get rate from source currency to INR
            SELECT rate INTO v_from_to_inr
            FROM exchange_rates
            WHERE base_currency = p_from_currency
            AND date <= p_date
            ORDER BY date DESC
            LIMIT 1;
            
            -- Get rate from INR to target currency (inverse of target to INR)
            SELECT (1.0 / rate) INTO v_inr_to_target
            FROM exchange_rates
            WHERE base_currency = p_to_currency
            AND date <= p_date
            ORDER BY date DESC
            LIMIT 1;
            
            IF v_from_to_inr IS NOT NULL AND v_inr_to_target IS NOT NULL THEN
                v_rate := v_from_to_inr * v_inr_to_target;
            END IF;
        END;
    END IF;
    
    RETURN COALESCE(v_rate, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to convert amount between currencies (using existing table)
CREATE OR REPLACE FUNCTION convert_currency(
    p_amount DECIMAL(15,2),
    p_from_currency CHAR(3),
    p_to_currency CHAR(3),
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_rate DECIMAL(15,8);
BEGIN
    v_rate := get_exchange_rate(p_from_currency, p_to_currency, p_date);
    RETURN ROUND(p_amount * v_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: Sample exchange rates not inserted as table already exists
-- with different structure and data

-- =====================================================
-- SCHEMA VALIDATION
-- =====================================================

-- Verify payment tables were created (excluding existing exchange_rates)
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'payment_gateways',
        'payment_requests', 
        'payment_transactions',
        'payment_links',
        'payment_webhooks'
    );
    
    IF table_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All 5 payment gateway tables created successfully!';
        RAISE NOTICE 'NOTE: Using existing exchange_rates table for currency conversion';
    ELSE
        RAISE WARNING 'WARNING: Only % payment gateway tables were created', table_count;
    END IF;
END $$;

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================
-- Payment Gateway Schema Installation Complete
-- 
-- Tables Created:
-- 1. payment_gateways     - Gateway configurations
-- 2. payment_requests     - Payment requests for invoices  
-- 3. payment_transactions - Transaction records
-- 4. payment_links        - Payment link tracking
-- 5. payment_webhooks     - Webhook event logs
-- 
-- Note: Using existing exchange_rates table for currency conversion
--
-- Features:
-- ✓ Multi-gateway support (Razorpay, Stripe, PayPal)
-- ✓ Multi-currency with conversion (using existing exchange_rates)
-- ✓ Comprehensive audit trail
-- ✓ Row Level Security (RLS)
-- ✓ Webhook event logging
-- ✓ Payment link tracking
-- ✓ Transaction fee tracking
-- ✓ Refund management
-- ✓ Proper indexing for performance
-- ✓ Data validation constraints
-- ✓ Compatible with existing exchange_rates table
-- 
-- Next Steps:
-- 1. Configure payment gateway API credentials
-- 2. Set up webhook endpoints
-- 3. Test payment flows
-- 4. Configure RLS policies for your users
-- =====================================================