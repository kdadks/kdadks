-- Temporary script to check RLS policies and fix payment system access

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity, policyname, permissive
FROM pg_policies 
WHERE tablename IN ('payment_requests', 'payment_gateways')
ORDER BY tablename, policyname;

-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('payment_requests', 'payment_gateways');

-- For testing purposes, temporarily disable RLS or add permissive policies
-- WARNING: Only use this for development/testing

-- Check if payment_gateways has restrictive RLS
SELECT * FROM pg_policies WHERE tablename = 'payment_gateways';

-- If no policies exist or they're too restrictive, create permissive ones for development
DO $$
BEGIN
    -- Enable RLS if not enabled
    ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;
    ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing restrictive policies if they exist
    DROP POLICY IF EXISTS "payment_gateways_policy" ON payment_gateways;
    DROP POLICY IF EXISTS "payment_requests_policy" ON payment_requests;
    
    -- Create permissive policies for development
    CREATE POLICY "payment_gateways_select" ON payment_gateways
        FOR SELECT USING (true);
    
    CREATE POLICY "payment_gateways_insert" ON payment_gateways
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "payment_gateways_update" ON payment_gateways
        FOR UPDATE USING (true);
    
    CREATE POLICY "payment_requests_select" ON payment_requests
        FOR SELECT USING (true);
    
    CREATE POLICY "payment_requests_insert" ON payment_requests
        FOR INSERT WITH CHECK (true);
    
    CREATE POLICY "payment_requests_update" ON payment_requests
        FOR UPDATE USING (true);
        
    RAISE NOTICE 'RLS policies updated for payment tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating policies: %', SQLERRM;
END
$$;
