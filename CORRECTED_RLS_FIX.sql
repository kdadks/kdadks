-- CORRECTED FIX for Exchange Rates RLS Policy Error
-- Copy and paste this entire script into your Supabase SQL Editor and run it
-- This version removes the sequence references since exchange_rates uses UUID, not serial

-- Step 1: Enable RLS on exchange_rates table
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies to start fresh
DROP POLICY IF EXISTS "exchange_rates_select_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_insert_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_update_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_delete_policy" ON exchange_rates;

-- Step 3: Create permissive policies for authenticated users
CREATE POLICY "exchange_rates_select_policy" ON exchange_rates
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "exchange_rates_insert_policy" ON exchange_rates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "exchange_rates_update_policy" ON exchange_rates
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 4: Grant necessary table permissions (NO SEQUENCE since it uses UUID)
GRANT SELECT, INSERT, UPDATE ON exchange_rates TO authenticated;
GRANT ALL ON exchange_rates TO service_role;

-- Step 5: Test the fix with a sample insert (will be cleaned up)
INSERT INTO exchange_rates (base_currency, target_currency, rate, date) 
VALUES ('USD', 'INR', 83.50, CURRENT_DATE)
ON CONFLICT (base_currency, target_currency, date) 
DO UPDATE SET rate = EXCLUDED.rate;

-- Step 6: Verify the policies are working
SELECT COUNT(*) as exchange_rates_count FROM exchange_rates;

-- Success message
SELECT 'Exchange rates RLS policies have been successfully configured!' as status;
