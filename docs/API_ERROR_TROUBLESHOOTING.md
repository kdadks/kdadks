# 🔧 Production API Error Troubleshooting Guide

## Issue: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

### What This Error Means
This error occurs when your frontend is trying to call an API endpoint that returns HTML instead of JSON. This typically happens when:

1. **Netlify Functions are not deployed properly**
2. **API endpoint path is incorrect**
3. **Function has syntax errors**
4. **Environment variables are missing**

### Quick Diagnostic Steps

#### 1. Test Netlify Function Directly
Open your browser and navigate to:
```
https://your-site.netlify.app/.netlify/functions/test
```

If you see a JSON response like:
```json
{"success": true, "message": "Netlify Function is working!"}
```
Then functions are working.

#### 2. Test Email Function
Try calling:
```
https://your-site.netlify.app/.netlify/functions/send-email
```

You should get a CORS response or a proper error, not HTML.

#### 3. Check Netlify Deploy Logs
1. Go to your Netlify dashboard
2. Click on your site
3. Go to "Functions" tab
4. Check if `send-email` function is listed and deployed

### Enhanced Error Detection

The latest code includes detailed logging. Check your browser console for:

```
🔍 Making API call to: /.netlify/functions/send-email
🔍 Environment: production Production: true
🔍 Response status: 404
🔍 Response headers: {...}
❌ API endpoint returned HTML instead of JSON
HTML response preview: <!DOCTYPE html><html>...
```

### Solutions by Error Type

#### If Functions Are Not Deployed
1. Check `netlify.toml` has correct function directory:
   ```toml
   [build]
     functions = "netlify/functions"
   ```

2. Ensure function files are in the correct location:
   ```
   netlify/functions/send-email.js
   netlify/functions/package.json
   ```

3. Redeploy your site

#### If Dependencies Are Missing
The function needs these dependencies in `netlify/functions/package.json`:
```json
{
  "dependencies": {
    "nodemailer": "^6.9.8",
    "@google-cloud/recaptcha-enterprise": "^5.6.0"
  }
}
```

#### If Environment Variables Are Missing
Set these in Netlify dashboard:
```
HOSTINGER_SMTP_USER=your_email@yourdomain.com
HOSTINGER_SMTP_PASSWORD=your_smtp_password
GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
```

### Immediate Workaround

If Netlify Functions are not working, you can temporarily use a direct API endpoint by updating `src/services/emailService.ts`:

```typescript
private static getApiEndpoint(): string {
  if (import.meta.env.PROD) {
    // Temporary: Use your backend server directly
    return 'https://your-backend-server.com/api/send-email'
  } else {
    return '/api/send-email'
  }
}
```

### Testing Commands

#### Local Function Testing (if Netlify CLI is installed)
```bash
netlify dev
```

#### Function Logs in Production
```bash
netlify functions:logs send-email
```

### Common File Issues

1. **Missing netlify.toml redirect**:
   ```toml
   [[redirects]]
     from = "/api/send-email"
     to = "/.netlify/functions/send-email"
     status = 200
     force = true
   ```

2. **Function syntax errors**: Check Netlify deploy logs for JavaScript errors

3. **Wrong content-type**: Function must return `application/json`

### Contact Support

If none of these solutions work:
1. Share the exact error from browser console
2. Share your Netlify site URL
3. Share the Netlify function deploy logs
4. Check if the function appears in your Netlify dashboard under "Functions"

The enhanced error handling will now provide much more specific information about what's going wrong!
