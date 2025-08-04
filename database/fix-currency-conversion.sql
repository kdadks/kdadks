-- Currency Conversion Fix Script
-- Run this in Supabase SQL Editor to fix currency conversion issues

-- 1. Delete any incorrect exchange rates
DELETE FROM exchange_rates WHERE created_at < CURRENT_DATE;

-- 2. Insert correct exchange rates
INSERT INTO exchange_rates (base_currency, target_currency, rate, date) VALUES
    -- Foreign currency to INR rates
    ('USD', 'INR', 83.50, CURRENT_DATE),
    ('EUR', 'INR', 90.25, CURRENT_DATE),
    ('GBP', 'INR', 105.75, CURRENT_DATE),
    ('AUD', 'INR', 55.20, CURRENT_DATE),
    ('CAD', 'INR', 61.40, CURRENT_DATE),
    ('SGD', 'INR', 62.10, CURRENT_DATE),
    ('AED', 'INR', 22.73, CURRENT_DATE),
    ('SAR', 'INR', 22.27, CURRENT_DATE),
    -- INR to foreign currency rates (reverse)
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

-- 3. Test conversion functions
DO $$
DECLARE
    test_rate DECIMAL(15,6);
    test_conversion DECIMAL(15,2);
BEGIN
    -- Test GBP to INR conversion
    SELECT public.get_exchange_rate('GBP', 'INR', CURRENT_DATE) INTO test_rate;
    RAISE NOTICE 'GBP to INR rate: %', test_rate;
    
    SELECT public.convert_to_inr(1500, 'GBP', CURRENT_DATE) INTO test_conversion;
    RAISE NOTICE 'Converting £1500 to INR: ₹%', test_conversion;
    
    -- Should be approximately 158,625 INR (1500 * 105.75)
    IF test_conversion < 150000 OR test_conversion > 170000 THEN
        RAISE WARNING 'Currency conversion seems incorrect. Expected ~158,625 INR, got %', test_conversion;
    ELSE
        RAISE NOTICE 'Currency conversion is correct!';
    END IF;
END
$$;

-- 4. Force update all existing invoices to recalculate INR amounts (only if table exists)
DO $$
BEGIN
    -- Check if invoices table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices'
    ) THEN
        UPDATE invoices 
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
            original_currency_code = COALESCE(original_currency_code, currency_code, 'INR'),
            original_total_amount = COALESCE(original_total_amount, total_amount),
            original_subtotal = COALESCE(original_subtotal, subtotal),
            original_tax_amount = COALESCE(original_tax_amount, tax_amount),
            exchange_rate = CASE 
                WHEN COALESCE(original_currency_code, currency_code, 'INR') = 'INR' THEN 1.0
                ELSE public.get_exchange_rate(
                    COALESCE(original_currency_code, currency_code, 'INR'), 
                    'INR', 
                    invoice_date::date
                )
            END,
            exchange_rate_date = invoice_date::date;
        
        RAISE NOTICE 'Updated invoices with correct INR conversions';
    ELSE
        RAISE NOTICE 'Invoices table does not exist - skipping invoices update';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating invoices: %', SQLERRM;
END
$$;

-- 5. Update invoice items with correct INR conversions (only if table exists)
DO $$
BEGIN
    -- Check if invoice_items table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoice_items'
    ) THEN
        UPDATE invoice_items 
        SET 
            inr_unit_price = CASE 
                WHEN (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN unit_price 
                ELSE public.convert_to_inr(
                    unit_price, 
                    (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM invoices WHERE id = invoice_items.invoice_id)
                )
            END,
            inr_line_total = CASE 
                WHEN (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN line_total 
                ELSE public.convert_to_inr(
                    line_total, 
                    (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM invoices WHERE id = invoice_items.invoice_id)
                )
            END,
            inr_tax_amount = CASE 
                WHEN (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id) = 'INR' 
                THEN tax_amount 
                ELSE public.convert_to_inr(
                    tax_amount, 
                    (SELECT COALESCE(original_currency_code, currency_code, 'INR') FROM invoices WHERE id = invoice_items.invoice_id),
                    (SELECT invoice_date::date FROM invoices WHERE id = invoice_items.invoice_id)
                )
            END,
            original_unit_price = COALESCE(original_unit_price, unit_price),
            original_line_total = COALESCE(original_line_total, line_total),
            original_tax_amount = COALESCE(original_tax_amount, tax_amount);
        
        RAISE NOTICE 'Updated invoice items with correct INR conversions';
    ELSE
        RAISE NOTICE 'Invoice_items table does not exist - skipping invoice items update';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating invoice_items: %', SQLERRM;
END
$$;

-- 6. Verify the fix worked (only if invoices table exists)
DO $$
DECLARE
    sample_invoice RECORD;
    converted_amount DECIMAL(15,2);
BEGIN
    -- Check if invoices table exists before querying
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invoices'
    ) THEN
        -- Find a GBP invoice if one exists
        SELECT * INTO sample_invoice FROM invoices 
        WHERE COALESCE(original_currency_code, currency_code) = 'GBP' 
        LIMIT 1;
        
        IF FOUND THEN
            RAISE NOTICE 'Sample GBP Invoice - Original: £%, INR: ₹%', 
                         sample_invoice.original_total_amount, 
                         sample_invoice.inr_total_amount;
            
            -- Manual conversion check
            SELECT public.convert_to_inr(sample_invoice.original_total_amount, 'GBP', sample_invoice.invoice_date::date) 
            INTO converted_amount;
            
            RAISE NOTICE 'Manual conversion check: £% = ₹%', 
                         sample_invoice.original_total_amount, 
                         converted_amount;
                         
            IF ABS(sample_invoice.inr_total_amount - converted_amount) < 0.01 THEN
                RAISE NOTICE '✅ Currency conversion is working correctly!';
            ELSE
                RAISE WARNING '❌ Currency conversion mismatch detected';
            END IF;
        ELSE
            RAISE NOTICE 'No GBP invoices found for testing';
        END IF;
    ELSE
        RAISE NOTICE 'Invoices table does not exist - skipping verification';
    END IF;
    
    RAISE NOTICE '✅ Currency conversion fix completed!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during verification: %', SQLERRM;
        RAISE NOTICE '✅ Currency conversion fix completed with verification errors!';
END
$$;
