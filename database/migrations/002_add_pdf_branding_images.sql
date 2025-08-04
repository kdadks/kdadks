-- ====================================================================
-- PDF BRANDING IMAGES - Company Settings Enhancement
-- ====================================================================
-- This migration adds header, footer, and logo image support for PDF branding
-- Date: August 2, 2025
-- ====================================================================

-- Add new columns for PDF branding images
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS header_image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS footer_image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS logo_image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS header_image_data TEXT NULL, -- Base64 encoded image data
ADD COLUMN IF NOT EXISTS footer_image_data TEXT NULL, -- Base64 encoded image data  
ADD COLUMN IF NOT EXISTS logo_image_data TEXT NULL;   -- Base64 encoded image data

-- Add comments for documentation
COMMENT ON COLUMN public.company_settings.header_image_url IS 'URL to header image for PDF branding';
COMMENT ON COLUMN public.company_settings.footer_image_url IS 'URL to footer image for PDF branding';
COMMENT ON COLUMN public.company_settings.logo_image_url IS 'URL to company logo for PDF branding';
COMMENT ON COLUMN public.company_settings.header_image_data IS 'Base64 encoded header image data for offline PDF generation';
COMMENT ON COLUMN public.company_settings.footer_image_data IS 'Base64 encoded footer image data for offline PDF generation';
COMMENT ON COLUMN public.company_settings.logo_image_data IS 'Base64 encoded logo image data for offline PDF generation';

-- Update the updated_at trigger function if it exists
-- This ensures the updated_at field is automatically set when the record is modified
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON public.company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================
-- Run these queries after the migration to verify the changes:

-- 1. Check if new columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'company_settings' 
AND table_schema = 'public'
AND column_name IN ('header_image_url', 'footer_image_url', 'logo_image_url', 
                    'header_image_data', 'footer_image_data', 'logo_image_data')
ORDER BY column_name;

-- 2. Check table structure
\d public.company_settings;

-- ====================================================================
-- USAGE NOTES:
-- ====================================================================
-- 1. header_image_url, footer_image_url, logo_image_url: Store public URLs to images
-- 2. header_image_data, footer_image_data, logo_image_data: Store base64 encoded image data
-- 3. Base64 data is used for offline PDF generation and faster loading
-- 4. URLs are used for web display and as backup
-- 5. Images should be optimized to keep PDF size under 2MB
-- 6. Recommended formats: PNG, JPEG, WebP
-- 7. Recommended header dimensions: 800x150px
-- 8. Recommended footer dimensions: 800x100px  
-- 9. Recommended logo dimensions: 200x100px
-- ====================================================================
