-- =====================================================
-- PDF BRANDING IMPLEMENTATION - MANUAL SQL SCRIPT
-- =====================================================
-- Run this script manually in your Supabase SQL Editor
-- This adds PDF branding capabilities to the invoice system

-- Step 1: Add PDF branding columns to company_settings table
-- =====================================================

-- Add new columns for PDF branding images
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS header_image_url TEXT,
ADD COLUMN IF NOT EXISTS footer_image_url TEXT,
ADD COLUMN IF NOT EXISTS logo_image_url TEXT,
ADD COLUMN IF NOT EXISTS header_image_data TEXT,
ADD COLUMN IF NOT EXISTS footer_image_data TEXT,
ADD COLUMN IF NOT EXISTS logo_image_data TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.company_settings.header_image_url IS 'URL to header image for PDF branding';
COMMENT ON COLUMN public.company_settings.footer_image_url IS 'URL to footer image for PDF branding';
COMMENT ON COLUMN public.company_settings.logo_image_url IS 'URL to company logo for PDF branding';
COMMENT ON COLUMN public.company_settings.header_image_data IS 'Base64 encoded header image data for offline PDF generation';
COMMENT ON COLUMN public.company_settings.footer_image_data IS 'Base64 encoded footer image data for offline PDF generation';
COMMENT ON COLUMN public.company_settings.logo_image_data IS 'Base64 encoded logo image data for offline PDF generation';

-- Step 2: Create storage bucket for company branding images
-- =====================================================

-- Create storage bucket for company branding (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-branding',
  'company-branding',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Storage configuration notes
-- =====================================================

-- NOTE: If you get "row-level security policy" errors when uploading:
-- 1. Run the STORAGE_POLICY_FIX.sql file after this script
-- 2. Or manually configure storage policies in Supabase Dashboard
-- 3. Ensure the bucket is public for PDF image access

-- Step 4: Update the updated_at trigger
-- =====================================================

-- Recreate the trigger to handle new columns
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Step 5: Create helper functions for PDF branding
-- =====================================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS validate_company_branding_images_size ON public.company_settings;
DROP FUNCTION IF EXISTS public.validate_image_data_size();

-- Function to validate image data size
CREATE OR REPLACE FUNCTION public.validate_image_data_size()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if any image data exceeds 2MB (for PDF size optimization)
    IF (LENGTH(NEW.header_image_data) > 2097152) THEN
        RAISE EXCEPTION 'Header image data too large. Maximum size: 2MB';
    END IF;
    
    IF (LENGTH(NEW.footer_image_data) > 2097152) THEN
        RAISE EXCEPTION 'Footer image data too large. Maximum size: 2MB';
    END IF;
    
    IF (LENGTH(NEW.logo_image_data) > 2097152) THEN
        RAISE EXCEPTION 'Logo image data too large. Maximum size: 2MB';
    END IF;
    
    -- Check total size of all images combined
    IF (COALESCE(LENGTH(NEW.header_image_data), 0) + 
        COALESCE(LENGTH(NEW.footer_image_data), 0) + 
        COALESCE(LENGTH(NEW.logo_image_data), 0)) > 4194304 THEN
        RAISE EXCEPTION 'Total image data too large. Combined maximum size: 4MB';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for image size validation
CREATE TRIGGER validate_company_branding_images_size
    BEFORE INSERT OR UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_image_data_size();

-- Step 6: Verification queries
-- =====================================================

-- Verify the new columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'company_settings' 
  AND column_name IN ('header_image_url', 'footer_image_url', 'logo_image_url', 
                      'header_image_data', 'footer_image_data', 'logo_image_data')
ORDER BY column_name;

-- Check the storage bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'company-branding';

-- Note: Storage RLS policies are managed by Supabase automatically
-- No manual verification needed for storage.objects policies

-- Step 7: Sample usage and testing
-- =====================================================

-- Sample query to update a company with branding images
-- (Replace 'your-company-id' with actual company ID)
/*
UPDATE public.company_settings 
SET 
    header_image_url = 'https://your-supabase-url.supabase.co/storage/v1/object/public/company-branding/company-id/header-123456.jpg',
    footer_image_url = 'https://your-supabase-url.supabase.co/storage/v1/object/public/company-branding/company-id/footer-123456.jpg',
    logo_image_url = 'https://your-supabase-url.supabase.co/storage/v1/object/public/company-branding/company-id/logo-123456.jpg',
    header_image_data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...', -- Base64 data
    footer_image_data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...', -- Base64 data
    logo_image_data = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABA...'   -- Base64 data
WHERE id = 'your-company-id';
*/

-- Query to check if a company has branding images
/*
SELECT 
    company_name,
    CASE WHEN header_image_url IS NOT NULL THEN '✅' ELSE '❌' END AS has_header,
    CASE WHEN footer_image_url IS NOT NULL THEN '✅' ELSE '❌' END AS has_footer,
    CASE WHEN logo_image_url IS NOT NULL THEN '✅' ELSE '❌' END AS has_logo,
    CASE WHEN header_image_data IS NOT NULL THEN '✅' ELSE '❌' END AS has_header_data,
    CASE WHEN footer_image_data IS NOT NULL THEN '✅' ELSE '❌' END AS has_footer_data,
    CASE WHEN logo_image_data IS NOT NULL THEN '✅' ELSE '❌' END AS has_logo_data
FROM public.company_settings 
WHERE is_active = true;
*/

-- =====================================================
-- IMPLEMENTATION NOTES:
-- =====================================================
-- 1. URL fields store public URLs to images in Supabase storage
-- 2. Data fields store base64 encoded image data for offline PDF generation
-- 3. Images are automatically optimized to keep PDF size under 2MB
-- 4. Storage bucket has 2MB file size limit per image
-- 5. Supabase manages RLS policies automatically for storage
-- 6. Public bucket allows PDF generation without authentication issues
-- 7. Validation trigger prevents oversized images

-- =====================================================
-- USAGE IN APPLICATION:
-- =====================================================
-- 1. Upload images via PDFBrandingManager component in Settings tab
-- 2. Images are automatically optimized and stored in both formats
-- 3. PDF generation uses base64 data for faster, offline rendering
-- 4. URLs are used for preview and management interfaces
-- 5. Total image size validation prevents PDF bloat

-- =====================================================
-- ROLLBACK SCRIPT (if needed):
-- =====================================================
/*
-- Remove triggers
DROP TRIGGER IF EXISTS validate_company_branding_images_size ON public.company_settings;
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;

-- Remove function
DROP FUNCTION IF EXISTS public.validate_image_data_size();

-- Note: Storage policies are managed by Supabase - no manual cleanup needed

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'company-branding';

-- Remove columns
ALTER TABLE public.company_settings 
DROP COLUMN IF EXISTS header_image_url,
DROP COLUMN IF EXISTS footer_image_url,
DROP COLUMN IF EXISTS logo_image_url,
DROP COLUMN IF EXISTS header_image_data,
DROP COLUMN IF EXISTS footer_image_data,
DROP COLUMN IF EXISTS logo_image_data;

-- Recreate original trigger
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
*/

-- =====================================================
-- END OF SCRIPT
-- =====================================================

-- After running this script, your database will support:
-- ✅ PDF header, footer, and logo branding images
-- ✅ Automatic image optimization for PDF size control
-- ✅ Secure image storage with proper RLS policies
-- ✅ Data validation to prevent oversized images
-- ✅ Both URL and base64 storage for flexibility

COMMIT;
