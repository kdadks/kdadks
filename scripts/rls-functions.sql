-- SQL functions to help with RLS management
-- Run these in your Supabase SQL editor first

-- Function to check RLS status
CREATE OR REPLACE FUNCTION check_rls_status(table_name text)
RETURNS json AS $$
DECLARE
  rls_enabled boolean;
  has_policies boolean;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  -- Check if there are any policies
  SELECT EXISTS(
    SELECT 1 FROM pg_policies 
    WHERE tablename = table_name AND schemaname = 'public'
  ) INTO has_policies;
  
  RETURN json_build_object(
    'enabled', COALESCE(rls_enabled, false),
    'hasPolicy', COALESCE(has_policies, false)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to enable RLS
CREATE OR REPLACE FUNCTION enable_rls(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to drop all policies for a table
CREATE OR REPLACE FUNCTION drop_all_policies(table_name text)
RETURNS void AS $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = table_name AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a policy
CREATE OR REPLACE FUNCTION create_policy(
  table_name text,
  policy_name text,
  policy_type text,
  policy_definition text
)
RETURNS void AS $$
BEGIN
  EXECUTE format(
    'CREATE POLICY %I ON %I FOR %s TO authenticated USING (%s)',
    policy_name,
    table_name,
    policy_type,
    policy_definition
  );
  
  -- For INSERT and UPDATE, also add WITH CHECK clause
  IF policy_type IN ('INSERT', 'UPDATE') THEN
    EXECUTE format(
      'ALTER POLICY %I ON %I WITH CHECK (%s)',
      policy_name,
      table_name,
      policy_definition
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to execute arbitrary SQL (for fallback)
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_rls_status(text) TO authenticated;
GRANT EXECUTE ON FUNCTION enable_rls(text) TO authenticated;
GRANT EXECUTE ON FUNCTION drop_all_policies(text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_policy(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
