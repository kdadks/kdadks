-- COMPREHENSIVE Payment System RLS Fix
-- This script fixes RLS policies for all payment-related tables
-- Run this in your Supabase SQL Editor

-- Step 1: Enable RLS on all payment tables
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_webhooks ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing restrictive policies
DROP POLICY IF EXISTS "payment_gateways_policy" ON payment_gateways;
DROP POLICY IF EXISTS "payment_gateways_select" ON payment_gateways;
DROP POLICY IF EXISTS "payment_gateways_insert" ON payment_gateways;
DROP POLICY IF EXISTS "payment_gateways_update" ON payment_gateways;

DROP POLICY IF EXISTS "payment_requests_policy" ON payment_requests;
DROP POLICY IF EXISTS "payment_requests_select" ON payment_requests;
DROP POLICY IF EXISTS "payment_requests_insert" ON payment_requests;
DROP POLICY IF EXISTS "payment_requests_update" ON payment_requests;

DROP POLICY IF EXISTS "payment_transactions_policy" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_insert" ON payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_update" ON payment_transactions;

DROP POLICY IF EXISTS "payment_links_policy" ON payment_links;
DROP POLICY IF EXISTS "payment_links_select" ON payment_links;
DROP POLICY IF EXISTS "payment_links_insert" ON payment_links;
DROP POLICY IF EXISTS "payment_links_update" ON payment_links;

DROP POLICY IF EXISTS "payment_webhooks_policy" ON payment_webhooks;
DROP POLICY IF EXISTS "payment_webhooks_select" ON payment_webhooks;
DROP POLICY IF EXISTS "payment_webhooks_insert" ON payment_webhooks;
DROP POLICY IF EXISTS "payment_webhooks_update" ON payment_webhooks;

-- Step 3: Create permissive policies for development
-- These policies allow full access for development purposes

-- Payment Gateways
CREATE POLICY "payment_gateways_select" ON payment_gateways
    FOR SELECT USING (true);

CREATE POLICY "payment_gateways_insert" ON payment_gateways
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_gateways_update" ON payment_gateways
    FOR UPDATE USING (true);

-- Payment Requests
CREATE POLICY "payment_requests_select" ON payment_requests
    FOR SELECT USING (true);

CREATE POLICY "payment_requests_insert" ON payment_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_requests_update" ON payment_requests
    FOR UPDATE USING (true);

-- Payment Transactions
CREATE POLICY "payment_transactions_select" ON payment_transactions
    FOR SELECT USING (true);

CREATE POLICY "payment_transactions_insert" ON payment_transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_transactions_update" ON payment_transactions
    FOR UPDATE USING (true);

-- Payment Links
CREATE POLICY "payment_links_select" ON payment_links
    FOR SELECT USING (true);

CREATE POLICY "payment_links_insert" ON payment_links
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_links_update" ON payment_links
    FOR UPDATE USING (true);

-- Payment Webhooks
CREATE POLICY "payment_webhooks_select" ON payment_webhooks
    FOR SELECT USING (true);

CREATE POLICY "payment_webhooks_insert" ON payment_webhooks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "payment_webhooks_update" ON payment_webhooks
    FOR UPDATE USING (true);

-- Step 4: Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON payment_gateways TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON payment_requests TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON payment_transactions TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON payment_links TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON payment_webhooks TO authenticated, anon;

-- Grant full access to service role
GRANT ALL ON payment_gateways TO service_role;
GRANT ALL ON payment_requests TO service_role;
GRANT ALL ON payment_transactions TO service_role;
GRANT ALL ON payment_links TO service_role;
GRANT ALL ON payment_webhooks TO service_role;

-- Step 5: Test the configuration with a sample operation
INSERT INTO payment_gateways (name, provider_type, settings, is_active, currency_support)
VALUES ('Test Gateway', 'razorpay', '{"test": true}', true, '["INR", "USD"]')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Payment system RLS policies have been successfully configured for development!' as status;
SELECT 'All payment tables now allow full access for testing.' as info;
