-- Verify Payment Gateway Tables Installation
-- Run this in Supabase SQL Editor to confirm setup

SELECT 
    table_name,
    table_type,
    CASE 
        WHEN table_name IN ('payment_gateways', 'payment_requests', 'payment_transactions', 'payment_links', 'payment_webhooks') 
        THEN '✅ Payment Table'
        WHEN table_name = 'exchange_rates' 
        THEN '✅ Existing Table (Used for Currency)'
        ELSE '❓ Other Table'
    END as table_purpose
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'payment_gateways', 
    'payment_requests', 
    'payment_transactions', 
    'payment_links', 
    'payment_webhooks',
    'exchange_rates'
)
ORDER BY table_name;

-- Check RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename LIKE 'payment_%'
ORDER BY tablename;

-- Verify helper functions exist
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN ('get_exchange_rate', 'convert_currency')
ORDER BY routine_name;
