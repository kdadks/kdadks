-- =====================================================
-- SUPABASE STORAGE POLICY FIX FOR PDF BRANDING
-- =====================================================
-- Run this AFTER the main PDF_BRANDING_DATABASE_SETUP.sql
-- This fixes the "row-level security policy" upload error

-- Method 1: Create explicit storage policies (RECOMMENDED)
-- =====================================================
-- This creates the exact policies needed for authenticated uploads

-- First, make sure the bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-branding',
  'company-branding',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (if not already enabled)
-- Note: This might already be enabled by default in Supabase

-- Create policies for authenticated users
-- Policy for INSERT (upload)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated uploads to company-branding'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow authenticated uploads to company-branding" ON storage.objects
                 FOR INSERT TO authenticated
                 WITH CHECK (bucket_id = ''company-branding'')';
    END IF;
END $$;

-- Policy for SELECT (read) - allow public access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow public read for company-branding'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow public read for company-branding" ON storage.objects
                 FOR SELECT TO public
                 USING (bucket_id = ''company-branding'')';
    END IF;
END $$;

-- Policy for UPDATE (modify)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated updates to company-branding'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow authenticated updates to company-branding" ON storage.objects
                 FOR UPDATE TO authenticated
                 USING (bucket_id = ''company-branding'')
                 WITH CHECK (bucket_id = ''company-branding'')';
    END IF;
END $$;

-- Policy for DELETE (remove)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Allow authenticated deletes from company-branding'
    ) THEN
        EXECUTE 'CREATE POLICY "Allow authenticated deletes from company-branding" ON storage.objects
                 FOR DELETE TO authenticated
                 USING (bucket_id = ''company-branding'')';
    END IF;
END $$;

-- =====================================================
-- Method 2: Manual Dashboard Configuration (BACKUP)
-- =====================================================
-- If the SQL policies above don't work, use Supabase Dashboard:
-- 
-- 1. Go to Supabase Dashboard > Storage > Policies
-- 2. Select the "objects" table from storage schema
-- 3. Create these 4 policies:

/*
POLICY 1:
Name: "Allow authenticated uploads to company-branding"
Operation: INSERT
Target roles: authenticated
Policy definition: bucket_id = 'company-branding'

POLICY 2:
Name: "Allow public read for company-branding"
Operation: SELECT  
Target roles: public
Policy definition: bucket_id = 'company-branding'

POLICY 3:
Name: "Allow authenticated updates to company-branding"
Operation: UPDATE
Target roles: authenticated
Policy definition: bucket_id = 'company-branding'

POLICY 4:
Name: "Allow authenticated deletes from company-branding"
Operation: DELETE
Target roles: authenticated
Policy definition: bucket_id = 'company-branding'
*/

-- =====================================================
-- Method 3: Verify Current Policies
-- =====================================================
-- Run this to see what policies currently exist:

SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
ORDER BY policyname;

-- Check bucket configuration
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'company-branding';

-- =====================================================
-- Method 4: Test Upload Permissions
-- =====================================================
-- You can test if uploads work by checking bucket permissions:

SELECT 
    id as bucket_id,
    name as bucket_name,
    public as is_public,
    auth.uid() as current_user_id,
    CASE 
        WHEN id = 'company-branding' THEN 'Should allow upload'
        ELSE 'Different bucket'
    END as upload_permission
FROM storage.buckets 
WHERE id = 'company-branding';

-- =====================================================
-- TROUBLESHOOTING NOTES:
-- =====================================================
-- 
-- If you're still getting RLS errors after running this:
-- 
-- 1. ✅ FIRST: Make sure you're logged in to the app
-- 2. ✅ Run the verification queries below to check policies
-- 3. ✅ Try the manual dashboard method if SQL doesn't work
-- 4. ✅ Check browser console for detailed error messages
-- 5. ✅ Ensure your Supabase client has proper authentication
-- 
-- Common causes of RLS errors:
-- ❌ User not authenticated when uploading (MOST COMMON)
-- ❌ Policies not created correctly
-- ❌ File path/naming conflicts
-- ❌ MIME type not in allowed list
-- ❌ File size exceeds 2MB limit
-- 
-- Quick test in browser console (when logged into your app):
-- ```javascript
-- // Test if user is authenticated
-- const { data: user } = await supabase.auth.getUser();
-- console.log('User:', user);
-- 
-- // Test bucket access
-- const { data: files, error } = await supabase.storage
--   .from('company-branding').list();
-- console.log('Bucket access:', { files, error });
-- 
-- // Test simple upload
-- const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
-- const { data, error } = await supabase.storage
--   .from('company-branding')
--   .upload('test-' + Date.now() + '.txt', testFile);
-- console.log('Upload test:', { data, error });
-- ```

COMMIT;
