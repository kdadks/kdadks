-- Fix Exchange Rates Table Structure
-- Standardize to always have INR as target_currency (the currency we convert TO)
-- base_currency = foreign currency we convert FROM
-- target_currency = always 'INR' 
-- rate = how many INR units = 1 unit of base_currency

-- Step 1: First, let's see what data currently exists
SELECT 'Current exchange_rates data:' as info;
SELECT base_currency, target_currency, rate, date, source 
FROM exchange_rates 
ORDER BY base_currency, target_currency, date DESC;

-- Step 2: Delete all records where target_currency is NOT 'INR' 
-- (These are the reverse rates like INR→USD that we don't need)
DELETE FROM exchange_rates 
WHERE target_currency != 'INR';

-- Step 3: Update any remaining records to ensure target_currency is INR
UPDATE exchange_rates 
SET target_currency = 'INR' 
WHERE target_currency != 'INR';

-- Step 4: Add a check constraint to ensure target_currency is always INR
ALTER TABLE exchange_rates 
DROP CONSTRAINT IF EXISTS exchange_rates_target_currency_check;

ALTER TABLE exchange_rates 
ADD CONSTRAINT exchange_rates_target_currency_check 
CHECK (target_currency = 'INR');

-- Step 5: Update the unique constraint to reflect the new structure
ALTER TABLE exchange_rates 
DROP CONSTRAINT IF EXISTS exchange_rates_base_currency_target_currency_date_key;

-- Since target_currency is always INR, we only need base_currency and date to be unique
ALTER TABLE exchange_rates 
ADD CONSTRAINT exchange_rates_base_currency_date_key 
UNIQUE (base_currency, date);

-- Step 6: Insert/Update comprehensive global exchange rates with INR as target
INSERT INTO exchange_rates (base_currency, target_currency, rate, date, source) VALUES
    -- Major World Currencies
    ('USD', 'INR', 83.50, CURRENT_DATE, 'manual-correction'),    -- US Dollar
    ('EUR', 'INR', 90.25, CURRENT_DATE, 'manual-correction'),    -- Euro
    ('GBP', 'INR', 105.75, CURRENT_DATE, 'manual-correction'),   -- British Pound
    ('JPY', 'INR', 0.56, CURRENT_DATE, 'manual-correction'),     -- Japanese Yen
    ('CNY', 'INR', 11.45, CURRENT_DATE, 'manual-correction'),    -- Chinese Yuan
    ('CHF', 'INR', 92.80, CURRENT_DATE, 'manual-correction'),    -- Swiss Franc
    
    -- Asia-Pacific Currencies
    ('AUD', 'INR', 55.20, CURRENT_DATE, 'manual-correction'),    -- Australian Dollar
    ('NZD', 'INR', 50.45, CURRENT_DATE, 'manual-correction'),    -- New Zealand Dollar
    ('SGD', 'INR', 62.10, CURRENT_DATE, 'manual-correction'),    -- Singapore Dollar
    ('HKD', 'INR', 10.70, CURRENT_DATE, 'manual-correction'),    -- Hong Kong Dollar
    ('KRW', 'INR', 0.062, CURRENT_DATE, 'manual-correction'),    -- South Korean Won
    ('THB', 'INR', 2.38, CURRENT_DATE, 'manual-correction'),     -- Thai Baht
    ('MYR', 'INR', 18.65, CURRENT_DATE, 'manual-correction'),    -- Malaysian Ringgit
    ('PHP', 'INR', 1.45, CURRENT_DATE, 'manual-correction'),     -- Philippine Peso
    ('IDR', 'INR', 0.0053, CURRENT_DATE, 'manual-correction'),   -- Indonesian Rupiah
    ('VND', 'INR', 0.0033, CURRENT_DATE, 'manual-correction'),   -- Vietnamese Dong
    ('LKR', 'INR', 0.28, CURRENT_DATE, 'manual-correction'),     -- Sri Lankan Rupee
    ('BDT', 'INR', 0.70, CURRENT_DATE, 'manual-correction'),     -- Bangladeshi Taka
    ('NPR', 'INR', 0.625, CURRENT_DATE, 'manual-correction'),    -- Nepalese Rupee
    ('PKR', 'INR', 0.30, CURRENT_DATE, 'manual-correction'),     -- Pakistani Rupee
    ('MMK', 'INR', 0.040, CURRENT_DATE, 'manual-correction'),    -- Myanmar Kyat
    
    -- Middle East & Gulf Currencies
    ('AED', 'INR', 22.73, CURRENT_DATE, 'manual-correction'),    -- UAE Dirham
    ('SAR', 'INR', 22.27, CURRENT_DATE, 'manual-correction'),    -- Saudi Riyal
    ('QAR', 'INR', 22.95, CURRENT_DATE, 'manual-correction'),    -- Qatari Riyal
    ('KWD', 'INR', 271.50, CURRENT_DATE, 'manual-correction'),   -- Kuwaiti Dinar
    ('BHD', 'INR', 221.40, CURRENT_DATE, 'manual-correction'),   -- Bahraini Dinar
    ('OMR', 'INR', 217.25, CURRENT_DATE, 'manual-correction'),   -- Omani Rial
    ('JOD', 'INR', 117.80, CURRENT_DATE, 'manual-correction'),   -- Jordanian Dinar
    ('LBP', 'INR', 0.00093, CURRENT_DATE, 'manual-correction'),  -- Lebanese Pound
    ('ILS', 'INR', 22.85, CURRENT_DATE, 'manual-correction'),    -- Israeli Shekel
    ('TRY', 'INR', 2.45, CURRENT_DATE, 'manual-correction'),     -- Turkish Lira
    ('IRR', 'INR', 0.00198, CURRENT_DATE, 'manual-correction'),  -- Iranian Rial
    
    -- North American Currencies
    ('CAD', 'INR', 61.40, CURRENT_DATE, 'manual-correction'),    -- Canadian Dollar
    ('MXN', 'INR', 4.12, CURRENT_DATE, 'manual-correction'),     -- Mexican Peso
    
    -- European Currencies
    ('SEK', 'INR', 7.95, CURRENT_DATE, 'manual-correction'),     -- Swedish Krona
    ('NOK', 'INR', 7.68, CURRENT_DATE, 'manual-correction'),     -- Norwegian Krone
    ('DKK', 'INR', 12.10, CURRENT_DATE, 'manual-correction'),    -- Danish Krone
    ('PLN', 'INR', 20.85, CURRENT_DATE, 'manual-correction'),    -- Polish Zloty
    ('CZK', 'INR', 3.68, CURRENT_DATE, 'manual-correction'),     -- Czech Koruna
    ('HUF', 'INR', 0.23, CURRENT_DATE, 'manual-correction'),     -- Hungarian Forint
    ('RON', 'INR', 18.25, CURRENT_DATE, 'manual-correction'),    -- Romanian Leu
    ('BGN', 'INR', 46.15, CURRENT_DATE, 'manual-correction'),    -- Bulgarian Lev
    ('HRK', 'INR', 12.05, CURRENT_DATE, 'manual-correction'),    -- Croatian Kuna
    ('RUB', 'INR', 0.86, CURRENT_DATE, 'manual-correction'),     -- Russian Ruble
    ('UAH', 'INR', 2.02, CURRENT_DATE, 'manual-correction'),     -- Ukrainian Hryvnia
    
    -- African Currencies
    ('ZAR', 'INR', 4.58, CURRENT_DATE, 'manual-correction'),     -- South African Rand
    ('EGP', 'INR', 1.68, CURRENT_DATE, 'manual-correction'),     -- Egyptian Pound
    ('NGN', 'INR', 0.052, CURRENT_DATE, 'manual-correction'),    -- Nigerian Naira
    ('KES', 'INR', 0.65, CURRENT_DATE, 'manual-correction'),     -- Kenyan Shilling
    ('GHS', 'INR', 5.42, CURRENT_DATE, 'manual-correction'),     -- Ghanaian Cedi
    ('MAD', 'INR', 8.35, CURRENT_DATE, 'manual-correction'),     -- Moroccan Dirham
    ('TND', 'INR', 26.72, CURRENT_DATE, 'manual-correction'),    -- Tunisian Dinar
    ('DZD', 'INR', 0.625, CURRENT_DATE, 'manual-correction'),    -- Algerian Dinar
    ('BWP', 'INR', 6.18, CURRENT_DATE, 'manual-correction'),     -- Botswana Pula
    ('MUR', 'INR', 1.78, CURRENT_DATE, 'manual-correction'),     -- Mauritian Rupee
    
    -- South American Currencies
    ('BRL', 'INR', 14.25, CURRENT_DATE, 'manual-correction'),    -- Brazilian Real
    ('ARS', 'INR', 0.082, CURRENT_DATE, 'manual-correction'),    -- Argentine Peso
    ('CLP', 'INR', 0.085, CURRENT_DATE, 'manual-correction'),    -- Chilean Peso
    ('COP', 'INR', 0.019, CURRENT_DATE, 'manual-correction'),    -- Colombian Peso
    ('PEN', 'INR', 22.15, CURRENT_DATE, 'manual-correction'),    -- Peruvian Sol
    ('UYU', 'INR', 1.95, CURRENT_DATE, 'manual-correction'),     -- Uruguayan Peso
    ('VES', 'INR', 0.18, CURRENT_DATE, 'manual-correction'),     -- Venezuelan Bolívar
    
    -- Other Notable Currencies
    ('XAU', 'INR', 210500.00, CURRENT_DATE, 'manual-correction'), -- Gold (Troy Ounce)
    ('XAG', 'INR', 2485.00, CURRENT_DATE, 'manual-correction'),   -- Silver (Troy Ounce)
    ('BTC', 'INR', 5847250.00, CURRENT_DATE, 'manual-correction'), -- Bitcoin
    ('ETH', 'INR', 280125.00, CURRENT_DATE, 'manual-correction'),  -- Ethereum
    
    -- Central Asian Currencies
    ('KZT', 'INR', 0.17, CURRENT_DATE, 'manual-correction'),     -- Kazakhstani Tenge
    ('UZS', 'INR', 0.0065, CURRENT_DATE, 'manual-correction'),   -- Uzbekistani Som
    ('KGS', 'INR', 0.97, CURRENT_DATE, 'manual-correction'),     -- Kyrgyzstani Som
    ('TJS', 'INR', 7.85, CURRENT_DATE, 'manual-correction'),     -- Tajikistani Somoni
    ('TMT', 'INR', 23.85, CURRENT_DATE, 'manual-correction'),    -- Turkmenistani Manat
    ('AFN', 'INR', 1.18, CURRENT_DATE, 'manual-correction'),     -- Afghan Afghani
    
    -- Pacific Currencies
    ('FJD', 'INR', 37.25, CURRENT_DATE, 'manual-correction'),    -- Fijian Dollar
    ('PGK', 'INR', 20.68, CURRENT_DATE, 'manual-correction'),    -- Papua New Guinea Kina
    ('WST', 'INR', 30.15, CURRENT_DATE, 'manual-correction'),    -- Samoan Tala
    ('TOP', 'INR', 35.42, CURRENT_DATE, 'manual-correction'),    -- Tongan Paʻanga
    ('VUV', 'INR', 0.70, CURRENT_DATE, 'manual-correction'),     -- Vanuatu Vatu
    
    -- Additional European Currencies
    ('ISK', 'INR', 0.60, CURRENT_DATE, 'manual-correction'),     -- Icelandic Króna
    ('MDL', 'INR', 4.68, CURRENT_DATE, 'manual-correction'),     -- Moldovan Leu
    ('MKD', 'INR', 1.45, CURRENT_DATE, 'manual-correction'),     -- Macedonian Denar
    ('RSD', 'INR', 0.76, CURRENT_DATE, 'manual-correction'),     -- Serbian Dinar
    ('BAM', 'INR', 46.25, CURRENT_DATE, 'manual-correction'),    -- Bosnia-Herzegovina Mark
    ('ALL', 'INR', 0.89, CURRENT_DATE, 'manual-correction'),     -- Albanian Lek
    
    -- Caribbean Currencies
    ('JMD', 'INR', 0.54, CURRENT_DATE, 'manual-correction'),     -- Jamaican Dollar
    ('TTD', 'INR', 12.35, CURRENT_DATE, 'manual-correction'),    -- Trinidad & Tobago Dollar
    ('BBD', 'INR', 41.75, CURRENT_DATE, 'manual-correction'),    -- Barbadian Dollar
    ('BSD', 'INR', 83.50, CURRENT_DATE, 'manual-correction'),    -- Bahamian Dollar
    ('XCD', 'INR', 30.92, CURRENT_DATE, 'manual-correction'),    -- East Caribbean Dollar
    
    -- More African Currencies
    ('XOF', 'INR', 0.138, CURRENT_DATE, 'manual-correction'),    -- West African CFA Franc
    ('XAF', 'INR', 0.138, CURRENT_DATE, 'manual-correction'),    -- Central African CFA Franc
    ('ETB', 'INR', 0.68, CURRENT_DATE, 'manual-correction'),     -- Ethiopian Birr
    ('UGX', 'INR', 0.022, CURRENT_DATE, 'manual-correction'),    -- Ugandan Shilling
    ('TZS', 'INR', 0.035, CURRENT_DATE, 'manual-correction'),    -- Tanzanian Shilling
    ('RWF', 'INR', 0.061, CURRENT_DATE, 'manual-correction'),    -- Rwandan Franc
    ('ZMW', 'INR', 3.18, CURRENT_DATE, 'manual-correction'),     -- Zambian Kwacha
    ('SZL', 'INR', 4.58, CURRENT_DATE, 'manual-correction'),     -- Swazi Lilangeni
    ('LSL', 'INR', 4.58, CURRENT_DATE, 'manual-correction')      -- Lesotho Loti
ON CONFLICT (base_currency, date) 
DO UPDATE SET 
    rate = EXCLUDED.rate,
    source = EXCLUDED.source,
    updated_at = TIMEZONE('utc'::text, NOW());

-- Step 7: Update indexes to reflect new structure
DROP INDEX IF EXISTS idx_exchange_rates_currencies_date;
CREATE INDEX idx_exchange_rates_base_currency_date 
ON exchange_rates(base_currency, date DESC);

-- Step 8: Verify the corrected structure
SELECT 'Corrected exchange_rates data:' as info;
SELECT base_currency, target_currency, rate, date, source 
FROM exchange_rates 
ORDER BY base_currency, date DESC;

-- Step 9: Test the constraint
SELECT 'Testing constraint - this should work:' as test;
INSERT INTO exchange_rates (base_currency, target_currency, rate, date, source) 
VALUES ('TST', 'INR', 1.0, '2025-01-01', 'test')
ON CONFLICT (base_currency, date) DO NOTHING;

-- Clean up test data
DELETE FROM exchange_rates WHERE base_currency = 'TST';

SELECT 'Exchange rates table structure has been corrected!' as status;
SELECT 'All foreign currencies now convert TO INR consistently.' as note;
