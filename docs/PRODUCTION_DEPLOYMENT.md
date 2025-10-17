# Production Environment Configuration

## Required Environment Variables for Netlify Deployment

Set these environment variables in your Netlify dashboard under Site Settings > Environment Variables:

### Email Service (Hostinger SMTP)
```bash
HOSTINGER_SMTP_USER=your_email@yourdomain.com
HOSTINGER_SMTP_PASSWORD=your_hostinger_email_password
```

### reCAPTCHA Enterprise (Google Cloud)
```
GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
```

### Google Cloud Service Account (for reCAPTCHA Enterprise)
For the Google Cloud service account credentials, you have two options:

#### Option 1: Upload service account JSON (Recommended)
1. Upload your `service-account-key.json` file to Netlify site files
2. Set environment variable:
```
GOOGLE_APPLICATION_CREDENTIALS=/opt/build/repo/service-account-key.json
```

#### Option 2: Use individual environment variables
Extract from your service account JSON and set:
```
GOOGLE_CLOUD_TYPE=service_account
GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_CLOUD_PRIVATE_KEY=your_private_key
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account_email
GOOGLE_CLOUD_CLIENT_ID=your_client_id
GOOGLE_CLOUD_AUTH_URI=https://accounts.google.com/o/oauth2/auth
GOOGLE_CLOUD_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_CLOUD_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
GOOGLE_CLOUD_CLIENT_X509_CERT_URL=your_cert_url
```

## Deployment Commands

### Build and Deploy
```bash
npm run build
netlify deploy --prod --dir=dist
```

### Environment Check
After deployment, you can test the API endpoints:
```bash
curl -X POST https://your-site.netlify.app/.netlify/functions/send-email \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","text":"Test message"}'
```

## API Endpoints Available in Production

1. **Send Email**: `/.netlify/functions/send-email`
   - With reCAPTCHA Enterprise verification
   - Supports attachments
   - CORS enabled

2. **Create Razorpay Order**: `/.netlify/functions/create-razorpay-order`
   - Payment gateway integration

3. **Payment Webhooks**: `/.netlify/functions/payment-webhook`
   - Handles Razorpay, Stripe, and PayPal webhooks

## Troubleshooting

### Common Issues

1. **"Function not found"**: Ensure functions are in `netlify/functions/` directory
2. **CORS errors**: Functions include CORS headers for all origins
3. **Environment variables**: Double-check variable names and values in Netlify dashboard
4. **reCAPTCHA fails**: Verify site key and domain configuration in Google Cloud Console

### Debug Mode
The send-email function includes detailed logging. Check Netlify function logs for debugging information.

## Security Notes

- All functions include CORS protection
- reCAPTCHA Enterprise provides bot protection with score-based verification
- Environment variables are securely stored in Netlify
- No API keys or secrets are exposed in the frontend code
