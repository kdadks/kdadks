# Netlify Environment Variables Setup Guide

## 🎯 Overview

This guide explains how to configure environment variables in Netlify for the Kdadks website, specifically for the admin portal authentication.

## 🔧 Required Environment Variables

### For Admin Portal (Supabase)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key

### For Email Service (Optional)
- `BREVO_PASSWORD` - Brevo SMTP password for contact forms

## 📋 Step-by-Step Setup

### 1. Access Netlify Site Settings

1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Select your `kdadks` site
3. Navigate to **Site settings** → **Environment variables**

### 2. Add Supabase Environment Variables

Click **Add environment variable** and add:

**Variable 1:**
- **Name:** `VITE_SUPABASE_URL`
- **Value:** `https://your-project-ref.supabase.co`

**Variable 2:**
- **Name:** `VITE_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (your anon key)

### 3. Get Supabase Credentials

#### Option A: Create New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/login
3. Click **New Project**
4. Fill in project details:
   - Name: `kdadks-admin`
   - Database password: (create a strong password)
   - Region: Choose closest to your users
5. Wait for project setup to complete

#### Option B: Use Existing Project
1. Go to your Supabase dashboard
2. Select your project
3. Go to **Settings** → **API**

### 4. Copy Your Credentials

In your Supabase project dashboard:

1. **Project URL:**
   - Go to **Settings** → **API**
   - Copy the **Project URL**
   - Format: `https://abcdefghijklmnop.supabase.co`

2. **Anonymous Key:**
   - In the same **API** section
   - Copy the **anon/public** key
   - This is a long JWT token starting with `eyJ...`

### 5. Configure Database (Required for Admin Features)

Run these SQL scripts in your Supabase SQL editor:

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create auth schema if it doesn't exist (usually already exists)
-- This is typically handled by Supabase automatically

-- You can add your custom tables here if needed
-- For basic admin functionality, the default auth tables are sufficient
```

### 6. Deploy Changes

After adding environment variables:

1. Go to **Deploys** tab in Netlify
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

## ✅ Verification

### Test Admin Login
1. Visit your deployed site: `https://your-site.netlify.app/admin/login`
2. The page should show a login form (not a maintenance message)
3. You can now create admin users in Supabase or use the signup feature

### Check Console
1. Open browser developer tools
2. Look for any error messages
3. Should see "Supabase is configured" message instead of warnings

## 🚨 Troubleshooting

### "Authentication service is not configured" Error

**Cause:** Environment variables not set properly

**Solutions:**
1. Check variable names are exactly: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Ensure no extra spaces in values
3. Trigger a new deployment after adding variables
4. Check Supabase project is active and accessible

### "Invalid API key" or Connection Errors

**Cause:** Incorrect Supabase credentials

**Solutions:**
1. Verify the Project URL format is correct
2. Ensure you copied the **anon/public** key (not service_role)
3. Check your Supabase project is not paused
4. Verify the project URL is accessible in browser

### Deployment Fails

**Cause:** Build errors with environment variables

**Solutions:**
1. Check all variable names are prefixed with `VITE_`
2. Ensure no quotes around environment variable values in Netlify
3. Clear Netlify cache and retry deployment

## 📝 Notes

- Environment variables prefixed with `VITE_` are exposed to the client-side code
- Never put sensitive keys (like `service_role` key) in `VITE_` variables
- Changes to environment variables require a new deployment to take effect
- The anon key is safe to expose client-side as it has limited permissions

## 🔒 Security

- The anon key has limited permissions by default
- Row Level Security (RLS) should be enabled on your Supabase tables
- Never expose your `service_role` key in client-side code
- Use Supabase Auth for user management and authentication

## 📞 Support

If you continue to have issues:

1. Check the browser console for specific error messages
2. Verify environment variables are set correctly in Netlify
3. Test Supabase connection directly in their dashboard
4. Contact the development team with specific error details
