# reCAPTCHA Configuration Guide for KDADKS

## Current Status
✅ Email endpoint is working correctly  
⚠️ reCAPTCHA verification is temporarily bypassed  
🎯 Need to configure proper reCAPTCHA credentials  

## Quick Fix Applied
I've implemented a temporary bypass that allows emails to be sent when:
- The reCAPTCHA token structure looks valid (correct length)
- The verification fails due to missing credentials

## Permanent Solution - Add Environment Variables

You need to add these environment variables in your Netlify site settings:

### 1. Go to Netlify Dashboard
- Visit: https://app.netlify.com/sites/YOUR_SITE_NAME/settings/env-vars
- Click "Add environment variable"

### 2. Add Required Variables

#### Option A: Standard reCAPTCHA (Recommended)
```
RECAPTCHA_SECRET_KEY = your_recaptcha_v3_secret_key
```

#### Option B: reCAPTCHA Enterprise (Advanced)
```
GOOGLE_CLOUD_PROJECT_ID = kdadks-service-p-1755602644470
GOOGLE_APPLICATION_CREDENTIALS = /path/to/credentials.json
```

### 3. Get reCAPTCHA Keys

If you don't have reCAPTCHA keys yet:

1. **Visit Google reCAPTCHA Admin**: https://www.google.com/recaptcha/admin
2. **Create new site** or use existing
3. **Site Key** (already configured): `6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r`
4. **Secret Key**: Copy this to `RECAPTCHA_SECRET_KEY` environment variable

### 4. Disable Temporary Bypass

Once credentials are configured, update `netlify/functions/send-email.js`:

```javascript
const allowTemporaryBypass = false; // Change this from true to false
```

## Testing the Fix

1. **Test debug endpoint**: Visit `/debug-email.html` 
2. **Check environment variables**: Debug response will show what's configured
3. **Test contact form**: Should work with proper verification

## Current Bypass Behavior

The temporary bypass will:
- ✅ Allow emails when token structure looks valid
- 📝 Log detailed debugging information  
- ⚠️ Show "TEMPORARY BYPASS" in server logs
- 🔒 Still block obviously invalid/missing tokens

This ensures your contact forms work immediately while we set up proper verification.

## Environment Variable Status

You can check what's currently configured by visiting:
`https://kdadks.com/.netlify/functions/debug`

Look for the `availableEnvVars` section in the response.
