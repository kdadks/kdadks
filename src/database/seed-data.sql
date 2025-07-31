-- Seed data for Countries with Currencies
-- This includes major countries with their respective currencies

INSERT INTO countries (name, code, currency_code, currency_name, currency_symbol) VALUES
-- Major Asian Countries
('India', 'IND', 'INR', 'Indian Rupee', '₹'),
('China', 'CHN', 'CNY', 'Chinese Yuan', '¥'),
('Japan', 'JPN', 'JPY', 'Japanese Yen', '¥'),
('South Korea', 'KOR', 'KRW', 'South Korean Won', '₩'),
('Singapore', 'SGP', 'SGD', 'Singapore Dollar', 'S$'),
('Thailand', 'THA', 'THB', 'Thai Baht', '฿'),
('Malaysia', 'MYS', 'MYR', 'Malaysian Ringgit', 'RM'),
('Indonesia', 'IDN', 'IDR', 'Indonesian Rupiah', 'Rp'),
('Philippines', 'PHL', 'PHP', 'Philippine Peso', '₱'),
('Vietnam', 'VNM', 'VND', 'Vietnamese Dong', '₫'),
('Bangladesh', 'BGD', 'BDT', 'Bangladeshi Taka', '৳'),
('Sri Lanka', 'LKA', 'LKR', 'Sri Lankan Rupee', 'Rs'),
('Nepal', 'NPL', 'NPR', 'Nepalese Rupee', 'Rs'),
('Pakistan', 'PAK', 'PKR', 'Pakistani Rupee', 'Rs'),

-- Major European Countries
('United Kingdom', 'GBR', 'GBP', 'British Pound Sterling', '£'),
('Germany', 'DEU', 'EUR', 'Euro', '€'),
('France', 'FRA', 'EUR', 'Euro', '€'),
('Italy', 'ITA', 'EUR', 'Euro', '€'),
('Spain', 'ESP', 'EUR', 'Euro', '€'),
('Netherlands', 'NLD', 'EUR', 'Euro', '€'),
('Switzerland', 'CHE', 'CHF', 'Swiss Franc', 'CHF'),
('Sweden', 'SWE', 'SEK', 'Swedish Krona', 'kr'),
('Norway', 'NOR', 'NOK', 'Norwegian Krone', 'kr'),
('Denmark', 'DNK', 'DKK', 'Danish Krone', 'kr'),
('Poland', 'POL', 'PLN', 'Polish Zloty', 'zł'),
('Russia', 'RUS', 'RUB', 'Russian Ruble', '₽'),

-- North America
('United States', 'USA', 'USD', 'US Dollar', '$'),
('Canada', 'CAN', 'CAD', 'Canadian Dollar', 'C$'),
('Mexico', 'MEX', 'MXN', 'Mexican Peso', '$'),

-- Oceania
('Australia', 'AUS', 'AUD', 'Australian Dollar', 'A$'),
('New Zealand', 'NZL', 'NZD', 'New Zealand Dollar', 'NZ$'),

-- Middle East
('United Arab Emirates', 'ARE', 'AED', 'UAE Dirham', 'د.إ'),
('Saudi Arabia', 'SAU', 'SAR', 'Saudi Riyal', '﷼'),
('Qatar', 'QAT', 'QAR', 'Qatari Riyal', '﷼'),
('Kuwait', 'KWT', 'KWD', 'Kuwaiti Dinar', 'د.ك'),
('Israel', 'ISR', 'ILS', 'Israeli Shekel', '₪'),
('Turkey', 'TUR', 'TRY', 'Turkish Lira', '₺'),

-- Africa
('South Africa', 'ZAF', 'ZAR', 'South African Rand', 'R'),
('Nigeria', 'NGA', 'NGN', 'Nigerian Naira', '₦'),
('Egypt', 'EGY', 'EGP', 'Egyptian Pound', '£'),
('Kenya', 'KEN', 'KES', 'Kenyan Shilling', 'KSh'),

-- South America
('Brazil', 'BRA', 'BRL', 'Brazilian Real', 'R$'),
('Argentina', 'ARG', 'ARS', 'Argentine Peso', '$'),
('Chile', 'CHL', 'CLP', 'Chilean Peso', '$'),
('Colombia', 'COL', 'COP', 'Colombian Peso', '$'),
('Peru', 'PER', 'PEN', 'Peruvian Sol', 'S/.');

-- Insert default company settings for India (KDADKS)
INSERT INTO company_settings (
    company_name, 
    legal_name, 
    address_line1, 
    address_line2,
    city, 
    state, 
    postal_code, 
    country_id,
    gstin,
    pan,
    phone,
    email,
    website,
    is_default,
    is_active
) VALUES (
    'KDADKS Service Private Limited',
    'KDADKS Service Private Limited',
    'Business Address Line 1',
    'Business Address Line 2',
    'Lucknow',
    'Uttar Pradesh',
    '226001',
    (SELECT id FROM countries WHERE code = 'IND'),
    '', -- Add your GSTIN here
    '', -- Add your PAN here
    '+91-7982303199',
    'kdadks@outlook.com',
    'https://kdadks.com',
    true,
    true
);

-- Insert default invoice settings
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
) VALUES (
    'INV',
    '',
    'PREFIX/YYYY/MM/###',
    1,
    true, -- Reset annually at start of financial year (April 1)
    4, -- April start for Indian Financial Year
    '2024-25', -- Current financial year: 2024-25
    'Payment is due within 30 days of invoice date. Late payments may incur additional charges.',
    'Thank you for your business!',
    'This is a computer-generated invoice.',
    18.00, -- Standard GST rate in India
    true,
    30,
    'professional',
    'before',
    true
);

-- Insert default terms and conditions templates
INSERT INTO terms_templates (name, category, content, is_default, is_active) VALUES
('Standard Payment Terms', 'payment', 
'1. Payment is due within 30 days of invoice date.
2. Late payments may incur a service charge of 2% per month.
3. All payments should be made in Indian Rupees (INR).
4. Bank charges, if any, will be borne by the client.
5. Cheques should be drawn in favor of "KDADKS Service Private Limited".', 
true, true),

('Service Terms', 'service', 
'1. Services will be provided as per the agreed scope of work.
2. Any additional requirements will be charged separately.
3. Client is responsible for providing necessary access and information.
4. Delivery timelines are estimates and may vary based on project complexity.
5. Support and maintenance terms as per separate agreement.', 
true, true),

('General Terms', 'general', 
'1. This invoice is subject to Indian jurisdiction.
2. All disputes will be resolved through arbitration in Lucknow, UP.
3. GST will be charged as applicable.
4. Prices are subject to change without prior notice.
5. These terms and conditions form an integral part of this invoice.', 
true, true),

('Shipping Terms', 'shipping', 
'1. Shipping charges are additional unless otherwise specified.
2. Delivery timeline is 5-7 working days for domestic orders.
3. Risk of goods passes to buyer upon dispatch.
4. Insurance charges are additional if required.
5. Any damage during transit should be reported within 24 hours.', 
false, true);

-- Insert some sample products/services
INSERT INTO products (name, description, product_code, category, unit_price, unit, tax_rate, hsn_code, is_active) VALUES
('IT Consulting Services', 'Professional IT consulting and advisory services', 'ITC001', 'IT Services', 5000.00, 'hours', 18.00, '998314', true),
('Software Development', 'Custom software development services', 'SFT001', 'IT Services', 7500.00, 'hours', 18.00, '998314', true),
('Website Development', 'Website design and development services', 'WEB001', 'IT Services', 25000.00, 'project', 18.00, '998314', true),
('Digital Marketing', 'SEO, SEM and digital marketing services', 'DM001', 'Marketing', 15000.00, 'month', 18.00, '998314', true),
('Training Services', 'Corporate training and skill development', 'TRN001', 'Training', 3000.00, 'hours', 18.00, '998314', true),
('Healthcare Consultation', 'Medical consultation services', 'HC001', 'Healthcare', 1000.00, 'session', 0.00, '998219', true),
('Fashion Design', 'Custom fashion design services', 'FD001', 'Fashion', 8000.00, 'design', 18.00, '998314', true),
('Travel Planning', 'Corporate and leisure travel planning', 'TP001', 'Travel', 2500.00, 'booking', 18.00, '998314', true);
