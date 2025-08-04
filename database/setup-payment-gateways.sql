-- Insert Sample Payment Gateway Configurations
-- Run this in Supabase SQL Editor to set up test payment gateways

-- 1. Razorpay Test Gateway (for Indian payments)
INSERT INTO payment_gateways (
    name,
    provider_type,
    settings,
    is_active,
    is_sandbox,
    currency_support,
    transaction_fee_percentage,
    transaction_fee_fixed
) VALUES (
    'Razorpay India (Test)',
    'razorpay',
    '{
        "key_id": "rzp_test_REPLACE_WITH_YOUR_KEY",
        "key_secret": "REPLACE_WITH_YOUR_SECRET",
        "webhook_secret": "REPLACE_WITH_WEBHOOK_SECRET"
    }',
    false, -- Set to true when you add real credentials
    true,
    '["INR"]',
    2.50,
    0.00
) ON CONFLICT DO NOTHING;

-- 2. Stripe Test Gateway (for international payments)
INSERT INTO payment_gateways (
    name,
    provider_type,
    settings,
    is_active,
    is_sandbox,
    currency_support,
    transaction_fee_percentage,
    transaction_fee_fixed
) VALUES (
    'Stripe International (Test)',
    'stripe',
    '{
        "publishable_key": "pk_test_REPLACE_WITH_YOUR_KEY",
        "secret_key": "sk_test_REPLACE_WITH_YOUR_SECRET",
        "webhook_secret": "whsec_REPLACE_WITH_WEBHOOK_SECRET"
    }',
    false, -- Set to true when you add real credentials
    true,
    '["USD", "EUR", "GBP", "CAD", "AUD"]',
    2.90,
    0.30
) ON CONFLICT DO NOTHING;

-- 3. PayPal Test Gateway (for PayPal payments)
INSERT INTO payment_gateways (
    name,
    provider_type,
    settings,
    is_active,
    is_sandbox,
    currency_support,
    transaction_fee_percentage,
    transaction_fee_fixed
) VALUES (
    'PayPal Global (Test)',
    'paypal',
    '{
        "client_id": "REPLACE_WITH_PAYPAL_CLIENT_ID",
        "client_secret": "REPLACE_WITH_PAYPAL_CLIENT_SECRET",
        "webhook_id": "REPLACE_WITH_WEBHOOK_ID"
    }',
    false, -- Set to true when you add real credentials
    true,
    '["USD", "EUR", "GBP"]',
    3.49,
    0.49
) ON CONFLICT DO NOTHING;

-- Verify the gateways were created
SELECT 
    name,
    provider_type,
    is_active,
    is_sandbox,
    currency_support,
    transaction_fee_percentage
FROM payment_gateways
ORDER BY provider_type;

-- Instructions for next steps:
-- 1. Replace the placeholder credentials with your actual test/sandbox credentials
-- 2. Set is_active = true for the gateways you want to enable
-- 3. For production, create new entries with is_sandbox = false and production credentials
