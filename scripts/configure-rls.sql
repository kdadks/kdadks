-- =================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) CONFIGURATION
-- =================================================================
-- This script configures RLS for all tables in the invoice system
-- to allow authenticated users to perform CRUD operations
-- 
-- INSTRUCTIONS:
-- 1. Copy and paste this entire script into your Supabase SQL editor
-- 2. Run it as a single query
-- 3. All tables will be configured with proper RLS policies
-- =================================================================

-- Enable RLS on all tables
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE terms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- =================================================================

-- Countries
DROP POLICY IF EXISTS "countries_authenticated_all" ON countries;
DROP POLICY IF EXISTS "countries_select_policy" ON countries;
DROP POLICY IF EXISTS "countries_insert_policy" ON countries;
DROP POLICY IF EXISTS "countries_update_policy" ON countries;
DROP POLICY IF EXISTS "countries_delete_policy" ON countries;

-- Company Settings
DROP POLICY IF EXISTS "company_settings_authenticated_all" ON company_settings;
DROP POLICY IF EXISTS "company_settings_select_policy" ON company_settings;
DROP POLICY IF EXISTS "company_settings_insert_policy" ON company_settings;
DROP POLICY IF EXISTS "company_settings_update_policy" ON company_settings;
DROP POLICY IF EXISTS "company_settings_delete_policy" ON company_settings;

-- Invoice Settings
DROP POLICY IF EXISTS "invoice_settings_authenticated_all" ON invoice_settings;
DROP POLICY IF EXISTS "invoice_settings_select_policy" ON invoice_settings;
DROP POLICY IF EXISTS "invoice_settings_insert_policy" ON invoice_settings;
DROP POLICY IF EXISTS "invoice_settings_update_policy" ON invoice_settings;
DROP POLICY IF EXISTS "invoice_settings_delete_policy" ON invoice_settings;

-- Terms Templates
DROP POLICY IF EXISTS "terms_templates_authenticated_all" ON terms_templates;
DROP POLICY IF EXISTS "terms_templates_select_policy" ON terms_templates;
DROP POLICY IF EXISTS "terms_templates_insert_policy" ON terms_templates;
DROP POLICY IF EXISTS "terms_templates_update_policy" ON terms_templates;
DROP POLICY IF EXISTS "terms_templates_delete_policy" ON terms_templates;

-- Customers
DROP POLICY IF EXISTS "customers_authenticated_all" ON customers;
DROP POLICY IF EXISTS "customers_select_policy" ON customers;
DROP POLICY IF EXISTS "customers_insert_policy" ON customers;
DROP POLICY IF EXISTS "customers_update_policy" ON customers;
DROP POLICY IF EXISTS "customers_delete_policy" ON customers;

-- Products
DROP POLICY IF EXISTS "products_authenticated_all" ON products;
DROP POLICY IF EXISTS "products_select_policy" ON products;
DROP POLICY IF EXISTS "products_insert_policy" ON products;
DROP POLICY IF EXISTS "products_update_policy" ON products;
DROP POLICY IF EXISTS "products_delete_policy" ON products;

-- Invoices
DROP POLICY IF EXISTS "invoices_authenticated_all" ON invoices;
DROP POLICY IF EXISTS "invoices_select_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_insert_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON invoices;
DROP POLICY IF EXISTS "invoices_delete_policy" ON invoices;

-- Invoice Items
DROP POLICY IF EXISTS "invoice_items_authenticated_all" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_select_policy" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_insert_policy" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_update_policy" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete_policy" ON invoice_items;

-- Payments
DROP POLICY IF EXISTS "payments_authenticated_all" ON payments;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_delete_policy" ON payments;

-- =================================================================
-- CREATE NEW COMPREHENSIVE POLICIES FOR AUTHENTICATED USERS
-- =================================================================

-- Countries table
CREATE POLICY "countries_authenticated_all" ON countries
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Company Settings table
CREATE POLICY "company_settings_authenticated_all" ON company_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice Settings table  
CREATE POLICY "invoice_settings_authenticated_all" ON invoice_settings
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Terms Templates table
CREATE POLICY "terms_templates_authenticated_all" ON terms_templates
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Customers table
CREATE POLICY "customers_authenticated_all" ON customers
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Products table
CREATE POLICY "products_authenticated_all" ON products
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoices table
CREATE POLICY "invoices_authenticated_all" ON invoices
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Invoice Items table
CREATE POLICY "invoice_items_authenticated_all" ON invoice_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Payments table
CREATE POLICY "payments_authenticated_all" ON payments
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- =================================================================
-- VERIFICATION QUERIES (Optional - run separately to verify)
-- =================================================================

-- Check RLS status for all tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = t.tablename AND schemaname = t.schemaname) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
  AND tablename IN ('countries', 'company_settings', 'invoice_settings', 'terms_templates', 'customers', 'products', 'invoices', 'invoice_items', 'payments')
ORDER BY tablename;

-- List all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('countries', 'company_settings', 'invoice_settings', 'terms_templates', 'customers', 'products', 'invoices', 'invoice_items', 'payments')
ORDER BY tablename, policyname;

-- =================================================================
-- SECURITY SUMMARY
-- =================================================================
-- ✅ Row Level Security enabled on all tables
-- ✅ Comprehensive policies created for authenticated users
-- ✅ All CRUD operations (SELECT, INSERT, UPDATE, DELETE) allowed
-- ✅ Anonymous users blocked from accessing data
-- ✅ Only authenticated users can perform operations
-- 
-- WHAT THIS MEANS:
-- • Users must be logged in to access any data
-- • Once authenticated, users have full CRUD access
-- • Anonymous/unauthenticated requests will be blocked
-- • All operations require valid authentication token
-- =================================================================
