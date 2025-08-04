-- Fix Exchange Rates RLS Policy
-- This script creates the necessary RLS policies for the exchange_rates table

-- Enable RLS on exchange_rates table if not already enabled
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "exchange_rates_select_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_insert_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_update_policy" ON exchange_rates;
DROP POLICY IF EXISTS "exchange_rates_delete_policy" ON exchange_rates;

-- Allow authenticated users to SELECT exchange rates (read access)
CREATE POLICY "exchange_rates_select_policy" ON exchange_rates
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to INSERT exchange rates (the exchange rate service needs this)
CREATE POLICY "exchange_rates_insert_policy" ON exchange_rates
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to UPDATE exchange rates (for rate updates)
CREATE POLICY "exchange_rates_update_policy" ON exchange_rates
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Restrict DELETE to service role only (prevent accidental data loss)
CREATE POLICY "exchange_rates_delete_policy" ON exchange_rates
    FOR DELETE
    TO service_role
    USING (true);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON exchange_rates TO authenticated;

-- Grant all permissions to service role for maintenance
GRANT ALL ON exchange_rates TO service_role;
