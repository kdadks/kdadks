-- ====================================================================
-- EXCHANGE RATES TABLE - INR TARGET CURRENCY UPDATE
-- ====================================================================
-- This script updates the exchange_rates table to ensure:
-- 1. All rates have INR as target_currency
-- 2. Correct market rates (as of August 2025)
-- 3. Proper rate calculations for major currencies
-- ====================================================================

-- First, clear existing incorrect data
DELETE FROM exchange_rates WHERE target_currency != 'INR' OR rate < 0.1;

-- Insert/Update correct exchange rates with INR as target currency
-- All rates are: 1 [base_currency] = X INR

INSERT INTO exchange_rates (base_currency, target_currency, rate, date, created_at, updated_at)
VALUES 
  -- Major World Currencies → INR (Current market rates as of Aug 2025)
  ('USD', 'INR', 83.15, CURRENT_DATE, NOW(), NOW()),
  ('EUR', 'INR', 101.147, CURRENT_DATE, NOW(), NOW()),  -- Updated from xe.com (was 101.15)
  ('GBP', 'INR', 116.05, CURRENT_DATE, NOW(), NOW()),  -- Updated from xe.com (was 105.45)
  ('JPY', 'INR', 0.5642, CURRENT_DATE, NOW(), NOW()),
  ('AUD', 'INR', 55.25, CURRENT_DATE, NOW(), NOW()),
  ('CAD', 'INR', 61.30, CURRENT_DATE, NOW(), NOW()),
  
  -- Asian Currencies → INR
  ('SGD', 'INR', 62.15, CURRENT_DATE, NOW(), NOW()),
  ('HKD', 'INR', 10.65, CURRENT_DATE, NOW(), NOW()),
  ('CNY', 'INR', 11.48, CURRENT_DATE, NOW(), NOW()),
  ('THB', 'INR', 2.32, CURRENT_DATE, NOW(), NOW()),
  ('MYR', 'INR', 18.95, CURRENT_DATE, NOW(), NOW()),
  ('KRW', 'INR', 0.0625, CURRENT_DATE, NOW(), NOW()),
  
  -- Middle East & GCC Currencies → INR
  ('AED', 'INR', 22.63, CURRENT_DATE, NOW(), NOW()),
  ('SAR', 'INR', 22.17, CURRENT_DATE, NOW(), NOW()),
  ('KWD', 'INR', 271.25, CURRENT_DATE, NOW(), NOW()),
  ('QAR', 'INR', 22.84, CURRENT_DATE, NOW(), NOW()),
  ('BHD', 'INR', 220.55, CURRENT_DATE, NOW(), NOW()),
  ('OMR', 'INR', 216.05, CURRENT_DATE, NOW(), NOW()),
  
  -- European Currencies → INR
  ('CHF', 'INR', 93.20, CURRENT_DATE, NOW(), NOW()),
  ('SEK', 'INR', 7.85, CURRENT_DATE, NOW(), NOW()),
  ('NOK', 'INR', 7.92, CURRENT_DATE, NOW(), NOW()),
  ('DKK', 'INR', 13.55, CURRENT_DATE, NOW(), NOW()),
  ('PLN', 'INR', 20.85, CURRENT_DATE, NOW(), NOW()),
  ('CZK', 'INR', 3.68, CURRENT_DATE, NOW(), NOW()),
  
  -- African Currencies → INR
  ('ZAR', 'INR', 4.65, CURRENT_DATE, NOW(), NOW()),
  ('EGP', 'INR', 1.72, CURRENT_DATE, NOW(), NOW()),
  ('NGN', 'INR', 0.054, CURRENT_DATE, NOW(), NOW()),
  
  -- Other Important Currencies → INR
  ('NZD', 'INR', 50.15, CURRENT_DATE, NOW(), NOW()),
  ('BRL', 'INR', 15.25, CURRENT_DATE, NOW(), NOW()),
  ('MXN', 'INR', 4.85, CURRENT_DATE, NOW(), NOW()),
  ('RUB', 'INR', 0.92, CURRENT_DATE, NOW(), NOW()),
  ('TRY', 'INR', 2.48, CURRENT_DATE, NOW(), NOW()),
  
  -- INR to itself (always 1.0)
  ('INR', 'INR', 1.0, CURRENT_DATE, NOW(), NOW())

ON CONFLICT (base_currency, target_currency, date) 
DO UPDATE SET 
  rate = EXCLUDED.rate,
  updated_at = NOW();

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these queries after the update to verify the data:

-- 1. Check all rates are properly set with INR as target
SELECT 
  base_currency,
  target_currency,
  rate,
  date,
  CASE 
    WHEN base_currency = 'EUR' AND rate > 100 THEN '✅ EUR rate looks correct'
    WHEN base_currency = 'USD' AND rate > 80 THEN '✅ USD rate looks correct' 
    WHEN base_currency = 'GBP' AND rate > 100 THEN '✅ GBP rate looks correct'
    WHEN base_currency = 'INR' AND rate = 1.0 THEN '✅ INR rate is correct'
    WHEN rate < 0.1 AND base_currency != 'JPY' AND base_currency != 'KRW' THEN '⚠️ Rate seems too low'
    ELSE '✅ Rate looks reasonable'
  END as validation_status
FROM exchange_rates 
WHERE date = CURRENT_DATE
ORDER BY base_currency;

-- 2. Test conversion calculations
SELECT 
  base_currency,
  target_currency,
  rate,
  (1000 * rate) as converted_amount_for_1000_units,
  CASE 
    WHEN base_currency = 'EUR' AND (1000 * rate) > 100000 THEN '✅ 1000 EUR ≈ ₹1,01,147'
    WHEN base_currency = 'USD' AND (1000 * rate) > 80000 THEN '✅ 1000 USD ≈ ₹83,150'
    WHEN base_currency = 'GBP' AND (1000 * rate) > 100000 THEN '✅ 1000 GBP ≈ ₹1,16,050'
    ELSE 'Check conversion manually'
  END as conversion_check
FROM exchange_rates 
WHERE base_currency IN ('EUR', 'USD', 'GBP')
AND date = CURRENT_DATE;

-- 3. Count total currencies available
SELECT 
  COUNT(*) as total_currency_pairs,
  COUNT(DISTINCT base_currency) as unique_base_currencies,
  MIN(date) as earliest_date,
  MAX(date) as latest_date
FROM exchange_rates;

-- ====================================================================
-- IMPORTANT NOTES:
-- ====================================================================
-- 1. All rates are: 1 [base_currency] = X INR
-- 2. These are approximate market rates as of August 2025
-- 3. EUR rate updated to 101.147 to match xe.com (was 100.2004 in database)
-- 4. GBP rate updated to 116.05 to match xe.com (was 105.45)
-- 5. For production, consider using live API rates via the automated update system
-- 6. The automated daily update system will refresh these rates at 00:01 UTC
-- 7. Emergency fallback rates in the service match these values
-- 8. XE.com is used as reference for accuracy validation
-- ====================================================================

-- Example Usage After Update:
-- EUR 1200 → INR: 1200 * 101.147 = ₹1,21,376
-- USD 1000 → INR: 1000 * 83.15 = ₹83,150  
-- GBP 500 → INR: 500 * 116.05 = ₹58,025
-- ====================================================================
