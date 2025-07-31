-- Migration to update invoice settings to use INV/YYYY/MM/### format
-- This migration updates existing invoice settings to use the new format

DO $$
BEGIN
    -- Update existing invoice settings to use the new format
    UPDATE invoice_settings SET
        invoice_prefix = 'INV',
        number_format = 'PREFIX/YYYY/MM/###',
        reset_annually = false, -- We now reset monthly
        current_financial_year = '2025-07', -- Current period format: YYYY-MM
        current_number = 1 -- Reset to 1 for the new format
    WHERE number_format != 'PREFIX/YYYY/MM/###'; -- Only update if not already in new format
    
    -- If no invoice settings exist, insert the default one
    INSERT INTO invoice_settings (
        invoice_prefix,
        invoice_suffix,
        number_format,
        current_number,
        reset_annually,
        financial_year_start_month,
        current_financial_year,
        payment_terms,
        notes,
        footer_text,
        default_tax_rate,
        enable_gst,
        due_days,
        template_name,
        currency_position,
        is_active
    )
    SELECT 
        'INV',
        '',
        'PREFIX/YYYY/MM/###',
        1,
        false,
        4,
        '2025-07',
        'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
        'Thank you for your business!',
        'This is a computer-generated invoice.',
        18.00,
        true,
        30,
        'professional',
        'before',
        true
    WHERE NOT EXISTS (SELECT 1 FROM invoice_settings);
    
    RAISE NOTICE 'Invoice settings updated to INV/YYYY/MM/### format';
END $$;
