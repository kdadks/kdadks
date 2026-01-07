# 🚨 URGENT: Missing Environment Variables Fix

## The Issue
Your email service is failing because the `BREVO_PASSWORD` environment variable is not set in Netlify.

## Immediate Fix Required

### 1. Go to Netlify Dashboard
Visit: https://app.netlify.com/sites/kdadks/settings/env-vars

### 2. Add Required Environment Variable
Click "**Add a new variable**" and add:

```
Name: BREVO_PASSWORD
Value: [Your Brevo SMTP password from Brevo dashboard]
```

### 3. Get Your Brevo Password
1. Go to: https://app.brevo.com/settings/keys/smtp
2. Copy your SMTP password 
3. If you don't have one, generate a new SMTP key

### 4. Optional: Add reCAPTCHA Secret Key
For proper reCAPTCHA verification (currently bypassed):

```
Name: RECAPTCHA_SECRET_KEY  
Value: [Your Google reCAPTCHA v3 secret key]
```

### 5. Deploy Changes
After adding the environment variables:
- Go to: https://app.netlify.com/sites/kdadks/deploys
- Click "**Trigger deploy**" → "**Deploy site**"

## How to Get Brevo SMTP Credentials

If you don't have Brevo set up:

1. **Create Brevo Account**: https://app.brevo.com/account/register
2. **Verify your domain**: Add kdadks.com 
3. **Generate SMTP key**: Go to Settings → SMTP & API → SMTP Keys
4. **Copy the password**: Use this as `BREVO_PASSWORD`

## Alternative Quick Fix

If you want to test with a different email service temporarily, I can set up:
- Gmail SMTP
- SendGrid
- Or any other email provider

## Current Status

❌ **BREVO_PASSWORD**: Missing (causing 500 error)  
⚠️ **RECAPTCHA_SECRET_KEY**: Missing (currently bypassed)  
✅ **Function deployment**: Working  
✅ **API endpoints**: Working  

Once you add `BREVO_PASSWORD`, your contact forms will work immediately!
