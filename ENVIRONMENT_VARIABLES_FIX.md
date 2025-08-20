# ENVIRONMENT VARIABLES CONFIGURATION FOR PRODUCTION

## Issue Identified

The debug function revealed that Netlify Functions cannot access environment variables with the `VITE_` prefix. These prefixed variables are only available during the Vite build process, not in the serverless functions runtime.

## Current Status

✅ **BREVO_PASSWORD** - Available in production  
❌ **RECAPTCHA_SECRET_KEY** - Missing in production  
❌ **RECAPTCHA_SITE_KEY** - Missing in production  
❌ **RECAPTCHA_PROJECT_ID** - Missing in production  

## Required Action: Add Environment Variables to Netlify Dashboard

You need to add these environment variables to your Netlify dashboard without the `VITE_` prefix:

### Step 1: Access Netlify Dashboard
1. Go to https://app.netlify.com/
2. Select your kdadks site
3. Navigate to **Site settings** → **Environment variables**

### Step 2: Add These Environment Variables

Add the following variables with their exact values from your `.env` file:

```
Variable Name: RECAPTCHA_SECRET_KEY
Value: 6LdQV6srAAAAAO79W16J3y7jCS6LOFkdQrlQ-6fm

Variable Name: RECAPTCHA_SITE_KEY  
Value: 6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r

Variable Name: RECAPTCHA_PROJECT_ID
Value: kdadks-1724138158434
```

### Step 3: Trigger Deployment

After adding the environment variables:
1. Go to **Deploys** tab
2. Click **Trigger deploy** → **Deploy site**
3. Wait for deployment to complete

## How This Fixes the Issue

1. **Netlify Functions** will now have access to `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_SITE_KEY`, and `RECAPTCHA_PROJECT_ID`
2. **The send-email function** is already configured to use production variables first, then fall back to VITE_ prefixed ones for development
3. **reCAPTCHA verification** will work properly in production
4. **Email sending** will proceed after successful reCAPTCHA verification

## Verification

After adding the environment variables and deploying:
1. Test the debug endpoint: https://kdadks.netlify.app/.netlify/functions/debug
2. Check that `hasRecaptchaSecretKey`, `hasRecaptchaSiteKey`, and `hasRecaptchaProjectId` show as `true`
3. Test the contact form to ensure emails are sent successfully

## Environment Variable Naming Convention

- **Development (local)**: Use `VITE_` prefix in `.env` files
- **Production (Netlify)**: Use variables without prefix in Netlify dashboard
- **Functions code**: Check for production names first, then fall back to VITE_ names

This ensures compatibility between development and production environments.
