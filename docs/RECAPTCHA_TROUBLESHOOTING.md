# reCAPTCHA "Invalid Key Type" Error - Troubleshooting Guide

## Error: "Invalid key type" for site owner

This error occurs when you're using the wrong type of reCAPTCHA keys for your implementation.

## ❌ Common Causes

1. **Using reCAPTCHA v3 keys with v2 implementation** (most common)
2. **Mismatched site key and secret key** 
3. **Wrong domain configuration**
4. **Using test/development keys in production**

## ✅ Solution Steps

### 1. Check Your reCAPTCHA Key Type

Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin) and verify:

- **Current implementation uses:** reCAPTCHA v2 (checkbox "I'm not a robot")
- **You need:** reCAPTCHA v2 keys, NOT v3 keys

### 2. Create New reCAPTCHA v2 Keys (if needed)

If your current keys are v3, create new v2 keys:

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Click "Create" or "+"
3. **Important:** Select "reCAPTCHA v2" → "I'm not a robot checkbox"
4. Add your domains:
   - `localhost` (for development)
   - `yourdomain.com` (for production)
   - `www.yourdomain.com` (if using www)
5. Accept terms and create
6. Copy the new Site Key and Secret Key

### 3. Update Environment Variables

Update your production environment variables:

```bash
# Use the NEW v2 keys (not the old v3 keys)
VITE_RECAPTCHA_SITE_KEY=your_new_v2_site_key_here
VITE_RECAPTCHA_SECRET_KEY=your_new_v2_secret_key_here
VITE_RECAPTCHA_VERSION=v2
```

### 4. Verify Key Configuration

**Double-check these details:**

- ✅ Site Key starts with `6L` (public key)
- ✅ Secret Key starts with `6L` (private key) 
- ✅ Both keys are from the SAME reCAPTCHA v2 site
- ✅ Domain is correctly configured in reCAPTCHA console
- ✅ Keys are for v2 ("I'm not a robot" checkbox), not v3

### 5. Test the Fix

1. Deploy with new v2 keys
2. Visit a form page
3. You should see the checkbox reCAPTCHA
4. Complete the form and verify it submits successfully

## 🔧 Alternative: Use reCAPTCHA v3 (if you prefer)

If you want to use your existing v3 keys instead:

1. Update your environment:
```bash
VITE_RECAPTCHA_VERSION=v3
```

2. The implementation will automatically switch to invisible v3 mode

## 🚨 Security Notes

- **Never commit real keys to git**
- **Use different keys for development and production**
- **Keep secret keys secure** - only on server side
- **Regularly rotate keys** for security

## 📋 Quick Checklist

Before deploying:

- [ ] Created reCAPTCHA v2 (checkbox) keys
- [ ] Added production domain to reCAPTCHA console  
- [ ] Updated environment variables with v2 keys
- [ ] Set `VITE_RECAPTCHA_VERSION=v2`
- [ ] Tested form submission in production
- [ ] Verified reCAPTCHA checkbox appears
- [ ] Confirmed email sending works

## 🔍 How to Identify Key Types

### reCAPTCHA v2 (Checkbox)
- Shows "I'm not a robot" checkbox
- User clicks checkbox to verify
- Sometimes shows image challenges
- **This is what our implementation uses**

### reCAPTCHA v3 (Invisible)  
- No visible checkbox
- Runs in background
- Provides a score (0.0 to 1.0)
- Requires different implementation

## 📞 Still Having Issues?

If you continue getting "Invalid key type" error:

1. **Clear browser cache** and test again
2. **Check browser console** for JavaScript errors
3. **Verify network requests** to Google's reCAPTCHA API
4. **Test with different browsers**
5. **Double-check domain spelling** in reCAPTCHA console

## 🎯 Success Indicators

You'll know it's working when:
- ✅ reCAPTCHA checkbox appears on forms
- ✅ Forms can be submitted after checkbox completion
- ✅ No console errors about invalid keys
- ✅ Emails are sent successfully
- ✅ Server logs show successful reCAPTCHA verification

The "Invalid key type" error should be completely resolved once you use the correct reCAPTCHA v2 keys with the checkbox implementation.
