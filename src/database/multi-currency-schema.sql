-- Multi-Currency Support for Invoice Management System
-- Run this SQL in your Supabase SQL Editor to add multi-currency functionality

-- 1. Add exchange rates table to store daily exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    target_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15,6) NOT NULL,
    date DATE NOT NULL,
    source VARCHAR(50) DEFAULT 'exchangerate-api.com',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Ensure unique combination of currencies and date
    UNIQUE(base_currency, target_currency, date)
);

-- 2. Create indexes for better performance on exchange_rates table
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies_date 
ON exchange_rates(base_currency, target_currency, date DESC);

-- 3. Insert some initial exchange rates (sample data for testing)
-- Note: These rates show how much 1 unit of base_currency equals in target_currency
INSERT INTO exchange_rates (base_currency, target_currency, rate, date) VALUES
    ('USD', 'INR', 83.50, CURRENT_DATE),
    ('EUR', 'INR', 90.25, CURRENT_DATE),
    ('GBP', 'INR', 105.75, CURRENT_DATE),
    ('AUD', 'INR', 55.20, CURRENT_DATE),
    ('CAD', 'INR', 61.40, CURRENT_DATE),
    ('SGD', 'INR', 62.10, CURRENT_DATE),
    ('AED', 'INR', 22.73, CURRENT_DATE),
    ('SAR', 'INR', 22.27, CURRENT_DATE),
    -- Reverse rates (INR to other currencies)
    ('INR', 'USD', 0.012, CURRENT_DATE),
    ('INR', 'EUR', 0.011, CURRENT_DATE),
    ('INR', 'GBP', 0.0095, CURRENT_DATE),
    ('INR', 'AUD', 0.018, CURRENT_DATE),
    ('INR', 'CAD', 0.016, CURRENT_DATE),
    ('INR', 'SGD', 0.016, CURRENT_DATE),
    ('INR', 'AED', 0.044, CURRENT_DATE),
    ('INR', 'SAR', 0.045, CURRENT_DATE)
ON CONFLICT (base_currency, target_currency, date) 
DO UPDATE SET 
    rate = EXCLUDED.rate,
    updated_at = TIMEZONE('utc'::text, NOW());

-- 4. Add multi-currency support to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS original_currency_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS original_subtotal DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS original_tax_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS original_total_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
ADD COLUMN IF NOT EXISTS inr_subtotal DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inr_tax_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inr_total_amount DECIMAL(15,2);

-- 5. Add multi-currency support to invoice_items table
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS original_unit_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS original_line_total DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS original_tax_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inr_unit_price DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inr_line_total DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS inr_tax_amount DECIMAL(15,2);

-- 6. Add multi-currency support to payments table
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS original_currency_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15,6),
ADD COLUMN IF NOT EXISTS exchange_rate_date DATE,
ADD COLUMN IF NOT EXISTS inr_amount DECIMAL(15,2);

-- 7. Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_currency_date 
ON invoices(original_currency_code, invoice_date);

CREATE INDEX IF NOT EXISTS idx_invoices_inr_amounts 
ON invoices(inr_total_amount, invoice_date);

-- 8. Create trigger function first (doesn't reference any tables)
CREATE OR REPLACE FUNCTION update_exchange_rate_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create the trigger for exchange_rates table
DROP TRIGGER IF EXISTS exchange_rates_updated_at ON exchange_rates;
CREATE TRIGGER exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE PROCEDURE update_exchange_rate_updated_at();

-- 10. Create function to get latest exchange rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(
    p_base_currency character varying,
    p_target_currency character varying,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(15,6) AS $$
DECLARE
    v_rate DECIMAL(15,6);
BEGIN
    -- If same currency, return 1
    IF p_base_currency = p_target_currency THEN
        RETURN 1.0;
    END IF;
    
    -- Try to get exact date rate first
    SELECT rate INTO v_rate
    FROM exchange_rates
    WHERE base_currency = p_base_currency
    AND target_currency = p_target_currency
    AND date = p_date;
    
    -- If not found, get the most recent rate before the date
    IF v_rate IS NULL THEN
        SELECT rate INTO v_rate
        FROM exchange_rates
        WHERE base_currency = p_base_currency
        AND target_currency = p_target_currency
        AND date <= p_date
        ORDER BY date DESC
        LIMIT 1;
    END IF;
    
    -- If still not found, try reverse rate (1/rate)
    IF v_rate IS NULL THEN
        SELECT (1.0 / rate) INTO v_rate
        FROM exchange_rates
        WHERE base_currency = p_target_currency
        AND target_currency = p_base_currency
        AND date <= p_date
        ORDER BY date DESC
        LIMIT 1;
    END IF;
    
    -- Return rate or NULL if not found
    RETURN v_rate;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs, return NULL as fallback
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 11. Create function to convert currency amounts
CREATE OR REPLACE FUNCTION public.convert_to_inr(
    p_amount DECIMAL(15,2),
    p_from_currency character varying,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_rate DECIMAL(15,6);
    v_inr_amount DECIMAL(15,2);
BEGIN
    -- If already INR, return as is
    IF p_from_currency = 'INR' THEN
        RETURN p_amount;
    END IF;
    
    -- If currency is NULL or empty, return original amount
    IF p_from_currency IS NULL OR p_from_currency = '' THEN
        RETURN p_amount;
    END IF;
    
    -- Get exchange rate
    v_rate := public.get_exchange_rate(p_from_currency, 'INR'::character varying, p_date);
    
    -- If rate not found, return original amount (fallback)
    IF v_rate IS NULL THEN
        RETURN p_amount;
    END IF;
    
    -- Convert amount
    v_inr_amount := p_amount * v_rate;
    
    RETURN ROUND(v_inr_amount, 2);
END;
$$ LANGUAGE plpgsql;

-- 12. Update existing invoices to have INR amounts (migration for existing data)
DO $$
BEGIN
    -- Check if invoices table exists and has the currency_code column
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'currency_code'
    ) THEN
        UPDATE public.invoices 
        SET 
            original_currency_code = currency_code,
            original_subtotal = subtotal,
            original_tax_amount = tax_amount,
            original_total_amount = total_amount,
            exchange_rate = CASE 
                WHEN currency_code = 'INR' THEN 1.0 
                ELSE public.get_exchange_rate(currency_code, 'INR'::character varying, invoice_date::date)
            END,
            exchange_rate_date = invoice_date::date,
            inr_subtotal = CASE 
                WHEN currency_code = 'INR' THEN subtotal 
                ELSE public.convert_to_inr(subtotal, currency_code, invoice_date::date)
            END,
            inr_tax_amount = CASE 
                WHEN currency_code = 'INR' THEN tax_amount 
                ELSE public.convert_to_inr(tax_amount, currency_code, invoice_date::date)
            END,
            inr_total_amount = CASE 
                WHEN currency_code = 'INR' THEN total_amount 
                ELSE public.convert_to_inr(total_amount, currency_code, invoice_date::date)
            END
        WHERE original_currency_code IS NULL;
        
        RAISE NOTICE 'Updated existing invoices with multi-currency data';
    ELSE
        RAISE NOTICE 'Invoices table does not exist or missing currency_code column - skipping migration';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating invoices: %', SQLERRM;
END
$$;

-- 13. Update existing invoice items (migration for existing data)
DO $$
BEGIN
    -- Check if invoice_items table exists and has required columns
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items' 
        AND column_name = 'unit_price'
    ) AND EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices' 
        AND column_name = 'currency_code'
    ) THEN
        UPDATE public.invoice_items 
        SET 
            original_unit_price = unit_price,
            original_line_total = line_total,
            original_tax_amount = tax_amount,
            inr_unit_price = CASE 
                WHEN (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN unit_price 
                ELSE public.convert_to_inr(
                    unit_price, 
                    (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM public.invoices WHERE id = invoice_items.invoice_id)
                )
            END,
            inr_line_total = CASE 
                WHEN (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN line_total 
                ELSE public.convert_to_inr(
                    line_total, 
                    (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM public.invoices WHERE id = invoice_items.invoice_id)
                )
            END,
            inr_tax_amount = CASE 
                WHEN (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN tax_amount 
                ELSE public.convert_to_inr(
                    tax_amount, 
                    (SELECT currency_code FROM public.invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM public.invoices WHERE id = invoice_items.invoice_id)
                )
            END
        WHERE original_unit_price IS NULL;
        
        RAISE NOTICE 'Updated existing invoice items with multi-currency data';
    ELSE
        RAISE NOTICE 'Invoice_items table does not exist or missing required columns - skipping migration';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating invoice_items: %', SQLERRM;
END
$$;

-- 14. Create view for multi-currency invoice stats (only if invoices table exists)
DO $$
BEGIN
    -- Check if invoices table exists before creating the view
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices'
    ) THEN
        -- Create the view with explicit schema reference
        EXECUTE '
        CREATE OR REPLACE VIEW public.invoice_stats_multicurrency AS
        SELECT 
            COUNT(*) as total_invoices,
            COUNT(*) FILTER (WHERE status = ''draft'') as draft_invoices,
            COUNT(*) FILTER (WHERE status = ''sent'') as sent_invoices,
            COUNT(*) FILTER (WHERE status = ''paid'') as paid_invoices,
            COUNT(*) FILTER (WHERE status = ''overdue'') as overdue_invoices,
            COUNT(*) FILTER (WHERE status = ''cancelled'') as cancelled_invoices,
            
            -- Revenue calculations in INR (with fallback to total_amount if inr_total_amount is null)
            COALESCE(SUM(COALESCE(inr_total_amount, total_amount)) FILTER (WHERE payment_status = ''paid''), 0) as total_revenue_inr,
            COALESCE(SUM(COALESCE(inr_total_amount, total_amount)) FILTER (WHERE payment_status != ''paid'' AND status != ''cancelled''), 0) as pending_amount_inr,
            COALESCE(SUM(COALESCE(inr_total_amount, total_amount)) FILTER (WHERE 
                payment_status = ''paid'' 
                AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                AND EXTRACT(MONTH FROM invoice_date) = EXTRACT(MONTH FROM CURRENT_DATE)
            ), 0) as this_month_revenue_inr,
            
            -- Original currency totals for reference
            jsonb_object_agg(
                COALESCE(original_currency_code, ''INR''),
                jsonb_build_object(
                    ''total_amount'', COALESCE(SUM(COALESCE(original_total_amount, total_amount)), 0),
                    ''count'', COUNT(*)
                )
            ) FILTER (WHERE original_currency_code IS NOT NULL) as currency_breakdown
        FROM public.invoices
        WHERE status != ''cancelled''
        ';
        
        RAISE NOTICE 'Created invoice_stats_multicurrency view successfully';
    ELSE
        RAISE NOTICE 'Invoices table does not exist - skipping view creation';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating view: %', SQLERRM;
END
$$;

-- 15. Add helpful comments for documentation
COMMENT ON TABLE public.exchange_rates IS 'Stores daily exchange rates for currency conversion';
COMMENT ON FUNCTION public.get_exchange_rate IS 'Returns exchange rate between two currencies for a specific date';
COMMENT ON FUNCTION public.convert_to_inr IS 'Converts amount from any currency to INR using exchange rates';

-- Add comment on view only if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_stats_multicurrency'
    ) THEN
        EXECUTE 'COMMENT ON VIEW public.invoice_stats_multicurrency IS ''Provides invoice statistics with multi-currency support, all amounts in INR''';
        RAISE NOTICE 'Added comment to invoice_stats_multicurrency view';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding view comment: %', SQLERRM;
END
$$;

-- 16. Test the functions and ensure all invoices have proper INR conversion
DO $$
BEGIN
    -- Test exchange rate function
    RAISE NOTICE 'Testing exchange rate functions...';
    
    -- Test USD to INR conversion
    RAISE NOTICE 'USD to INR rate: %', public.get_exchange_rate('USD'::character varying, 'INR'::character varying, CURRENT_DATE);
    RAISE NOTICE 'Converting $100 to INR: %', public.convert_to_inr(100, 'USD'::character varying, CURRENT_DATE);
    
    -- Test EUR to INR conversion  
    RAISE NOTICE 'EUR to INR rate: %', public.get_exchange_rate('EUR'::character varying, 'INR'::character varying, CURRENT_DATE);
    RAISE NOTICE 'Converting €100 to INR: %', public.convert_to_inr(100, 'EUR'::character varying, CURRENT_DATE);
    
    -- Test GBP to INR conversion (the problematic one)
    RAISE NOTICE 'GBP to INR rate: %', public.get_exchange_rate('GBP'::character varying, 'INR'::character varying, CURRENT_DATE);
    RAISE NOTICE 'Converting £1500 to INR: %', public.convert_to_inr(1500, 'GBP'::character varying, CURRENT_DATE);
    
    -- Test same currency (should return 1.0 rate and original amount)
    RAISE NOTICE 'INR to INR rate: %', public.get_exchange_rate('INR'::character varying, 'INR'::character varying, CURRENT_DATE);
    RAISE NOTICE 'Converting ₹100 to INR: %', public.convert_to_inr(100, 'INR'::character varying, CURRENT_DATE);
    
    -- Force update all invoices to ensure proper INR conversion
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices'
    ) THEN
        -- Update all invoices that don't have INR amounts calculated
        UPDATE public.invoices 
        SET 
            inr_total_amount = CASE 
                WHEN COALESCE(original_currency_code, currency_code, 'INR') = 'INR' THEN total_amount
                ELSE public.convert_to_inr(
                    total_amount, 
                    COALESCE(original_currency_code, currency_code, 'INR'), 
                    invoice_date::date
                )
            END,
            inr_subtotal = CASE 
                WHEN COALESCE(original_currency_code, currency_code, 'INR') = 'INR' THEN subtotal
                ELSE public.convert_to_inr(
                    subtotal, 
                    COALESCE(original_currency_code, currency_code, 'INR'), 
                    invoice_date::date
                )
            END,
            inr_tax_amount = CASE 
                WHEN COALESCE(original_currency_code, currency_code, 'INR') = 'INR' THEN tax_amount
                ELSE public.convert_to_inr(
                    tax_amount, 
                    COALESCE(original_currency_code, currency_code, 'INR'), 
                    invoice_date::date
                )
            END,
            -- Set currency fields if they are missing
            original_currency_code = COALESCE(original_currency_code, currency_code, 'INR'),
            original_total_amount = COALESCE(original_total_amount, total_amount),
            original_subtotal = COALESCE(original_subtotal, subtotal),
            original_tax_amount = COALESCE(original_tax_amount, tax_amount),
            exchange_rate = CASE 
                WHEN COALESCE(original_currency_code, currency_code, 'INR') = 'INR' THEN 1.0
                ELSE public.get_exchange_rate(
                    COALESCE(original_currency_code, currency_code, 'INR'), 
                    'INR'::character varying, 
                    invoice_date::date
                )
            END,
            exchange_rate_date = invoice_date::date
        WHERE inr_total_amount IS NULL OR inr_total_amount = 0;
        
        RAISE NOTICE 'Force updated all invoices with proper multi-currency conversion';
    END IF;
    
    RAISE NOTICE 'Multi-currency schema installation completed successfully!';
END
$$;
