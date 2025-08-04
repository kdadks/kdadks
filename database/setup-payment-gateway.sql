-- Payment Gateway Setup for KDADKS Development Environment
-- Run this script in your Supabase SQL Editor to set up Razorpay payment gateway

-- Step 1: Temporarily disable RLS for payment_gateways table (development only)
ALTER TABLE payment_gateways DISABLE ROW LEVEL SECURITY;

-- Step 2: Clear any existing Razorpay gateways to avoid duplicates
DELETE FROM payment_gateways WHERE provider_type = 'razorpay';

-- Step 3: Insert Razorpay payment gateway with test credentials
INSERT INTO payment_gateways (
  id,
  name,
  provider_type,
  settings,
  is_active,
  is_sandbox,
  currency_support,
  transaction_fee_percentage,
  transaction_fee_fixed,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Razorpay India (Test)',
  'razorpay',
  '{
    "key_id": "rzp_test_9WVjBCTiCyayCR",
    "key_secret": "YOUR_ACTUAL_TEST_SECRET_KEY_HERE",
    "webhook_secret": "YOUR_WEBHOOK_SECRET_HERE",
    "environment": "test"
  }'::jsonb,
  true,
  true,
  '["INR"]'::jsonb,
  2.50,
  0.00,
  NOW(),
  NOW()
);

-- Step 4: Verify the gateway was created
SELECT 
  id,
  name,
  provider_type,
  settings,
  is_active,
  is_sandbox,
  currency_support
FROM payment_gateways 
WHERE provider_type = 'razorpay';

-- Step 5: Re-enable RLS with proper policies
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Create policies that allow access for authenticated users and anon users (for development)
DROP POLICY IF EXISTS "payment_gateways_select_policy" ON payment_gateways;
DROP POLICY IF EXISTS "payment_gateways_insert_policy" ON payment_gateways;
DROP POLICY IF EXISTS "payment_gateways_update_policy" ON payment_gateways;

-- Allow SELECT for everyone (including anon users) for development
CREATE POLICY "payment_gateways_select_policy" ON payment_gateways
    FOR SELECT
    USING (true);

-- Allow INSERT/UPDATE for authenticated users only
CREATE POLICY "payment_gateways_insert_policy" ON payment_gateways
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "payment_gateways_update_policy" ON payment_gateways
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON payment_gateways TO anon;
GRANT ALL ON payment_gateways TO authenticated;
GRANT ALL ON payment_gateways TO service_role;

-- Final verification
SELECT 'Payment gateway setup completed successfully!' as status;
SELECT COUNT(*) as total_gateways FROM payment_gateways;

-- Show the created gateway details
SELECT 
  'Gateway Details:' as info,
  id,
  name,
  provider_type,
  (settings->>'key_id') as key_id,
  is_active,
  is_sandbox
FROM payment_gateways 
WHERE provider_type = 'razorpay';

/*
IMPORTANT NOTES:
1. Replace "YOUR_ACTUAL_TEST_SECRET_KEY_HERE" with your real Razorpay test secret key
2. Replace "YOUR_WEBHOOK_SECRET_HERE" with your Razorpay webhook secret
3. You can get these from your Razorpay Dashboard -> Settings -> API Keys
4. Make sure you're using TEST keys, not LIVE keys for development

Test Razorpay Credentials Format:
- Key ID: rzp_test_XXXXXXXXXXXXXXX (starts with rzp_test_)
- Key Secret: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (32 character string)
- Webhook Secret: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (optional, for webhook verification)
*/
