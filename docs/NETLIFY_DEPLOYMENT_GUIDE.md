# Netlify Deployment Guide for Brevo Email Integration

## Production Deployment Steps

### 1. Environment Variables Setup
In your Netlify dashboard, go to **Site Settings** → **Environment Variables** and add:

```
BREVO_PASSWORD=your_real_brevo_smtp_password
NODE_ENV=production
```

### 2. Deploy Command
Run this command to deploy to Netlify:

```bash
npm run deploy:netlify
```

Or manually:
```bash
npm run build
npx netlify deploy --prod --dir=dist
```

### 3. Netlify Configuration
The `netlify.toml` file is configured to:
- Use `netlify/functions` directory for serverless functions
- Handle the email API at `/.netlify/functions/send-email`
- Set proper CORS headers
- Redirect SPA routes correctly

### 4. Function Structure
The email function is located at:
```
netlify/functions/send-email.js
```

This handles:
- POST requests to send emails
- CORS preflight requests
- Environment variable validation
- Brevo SMTP integration

### 5. Frontend Configuration
The frontend automatically detects the environment:
- **Development**: Uses `http://localhost:3001/api/send-email`
- **Production**: Uses `/.netlify/functions/send-email`

## Testing Production Deployment

### 1. Check Function Status
Visit: `https://your-site.netlify.app/.netlify/functions/send-email`
- Should return "Method not allowed" (this is correct for GET requests)

### 2. Test Contact Form
- Fill out the contact form on your live site
- Submit the form
- Check for success message
- Verify email delivery to kdadks@outlook.com

### 3. Debug Issues
If issues occur:
1. Check Netlify function logs in the dashboard
2. Verify `BREVO_PASSWORD` environment variable is set
3. Ensure the function deployed successfully
4. Check browser console for errors

## File Structure for Deployment

```
├── netlify/
│   └── functions/
│       └── send-email.js       # Serverless function
├── netlify.toml                # Netlify configuration
├── src/
│   └── services/
│       └── emailService.ts     # Frontend service
└── dist/                       # Built frontend files
```

## Environment Variables Required

### Netlify Dashboard
Set these in **Site Settings** → **Environment Variables**:
- `BREVO_PASSWORD` - Your Brevo SMTP password
- `NODE_ENV` - Set to "production"

### Local Development
Your `.env` file should contain:
- `BREVO_PASSWORD` - Your Brevo SMTP password
- `PORT` - 3001 (for local server)
- `NODE_ENV` - development

## Deployment Checklist

- [ ] Environment variables set in Netlify dashboard
- [ ] `netlify.toml` configured correctly
- [ ] Function deployed to `netlify/functions/send-email.js`
- [ ] Frontend built and deployed to `dist/`
- [ ] CORS headers configured
- [ ] Contact form tested on live site
- [ ] Email delivery verified

## Common Issues & Solutions

### 404 Error on Function
- **Cause**: Function not deployed or wrong path
- **Solution**: Check `netlify.toml` functions directory setting

### CORS Errors
- **Cause**: Missing CORS headers
- **Solution**: Verify headers in function response

### Authentication Errors
- **Cause**: Missing or wrong `BREVO_PASSWORD`
- **Solution**: Check environment variable in Netlify dashboard

### Function Timeout
- **Cause**: SMTP connection issues
- **Solution**: Check Brevo service status and credentials

## Success Indicators

✅ Function appears in Netlify dashboard under "Functions"
✅ Contact form submits without errors
✅ Success message displays to user
✅ Email delivered to kdadks@outlook.com
✅ No 404 or CORS errors in browser console

Your Brevo email integration is now production-ready on Netlify!