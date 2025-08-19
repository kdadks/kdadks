# reCAPTCHA Enterprise Implementation Guide

## Overview

This implementation uses **Google reCAPTCHA Enterprise** instead of standard reCAPTCHA. Enterprise provides better bot protection, advanced risk analysis, and improved security features.

## Key Differences from Standard reCAPTCHA

### Standard reCAPTCHA
- Uses `https://www.google.com/recaptcha/api.js`
- Checkbox or invisible widget
- Basic bot detection

### reCAPTCHA Enterprise
- Uses `https://www.google.com/recaptcha/enterprise.js`
- Invisible, always runs in background
- Advanced AI-powered risk scoring (0.0 to 1.0)
- Better fraud detection
- Integration with Google Cloud

## Implementation Details

### 1. HTML Integration

The reCAPTCHA Enterprise script is loaded in `index.html`:

```html
<script src="https://www.google.com/recaptcha/enterprise.js" async defer></script>
```

### 2. Client-Side Integration

Uses `ReCaptchaEnterprise` component that:
- Executes `grecaptcha.enterprise.execute()` on form submission
- Invisible to users (no checkbox)
- Returns a token for server-side verification
- Provides loading states and error handling

### 3. Server-Side Verification

Two verification methods:
1. **Enterprise API** (primary) - Advanced scoring and analysis
2. **Standard API** (fallback) - Basic verification if Enterprise fails

## Configuration

### Environment Variables

```bash
# Your actual Enterprise site key
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r

# Enterprise secret key (get from Google Cloud Console)
VITE_RECAPTCHA_SECRET_KEY=your_enterprise_secret_key

# Specify Enterprise version
VITE_RECAPTCHA_VERSION=enterprise
```

### Google Cloud Setup Required

For full Enterprise verification, you need:

1. **Google Cloud Project** with reCAPTCHA Enterprise API enabled
2. **Service Account** with proper permissions
3. **API Key** or **Service Account Credentials**

## Risk Scoring

Enterprise provides risk scores (0.0 to 1.0):
- **0.9 - 1.0**: Very likely legitimate user
- **0.7 - 0.9**: Likely legitimate user  
- **0.3 - 0.7**: Neutral (requires review)
- **0.1 - 0.3**: Likely bot
- **0.0 - 0.1**: Very likely bot

Current threshold: **0.3** (adjustable in server code)

## Form Integration

### Updated Forms
- **Customer Support**: Action `customer_support`
- **Service Inquiry**: Action `service_inquiry`
- **Book Consultation**: Action `book_consultation`
- **Partnership**: Action `partnership`
- **Contact**: Action `contact`

### User Experience
- No visible reCAPTCHA widget
- Automatic verification on form submission
- Loading indicator during verification
- Error handling for failed verification

## Deployment Steps

### 1. Get Enterprise Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable reCAPTCHA Enterprise API
3. Create or use existing site key: `6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r`
4. Get your secret key for Enterprise API

### 2. Update Environment

```bash
# Production environment
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
VITE_RECAPTCHA_SECRET_KEY=your_actual_enterprise_secret_key
VITE_RECAPTCHA_VERSION=enterprise
```

### 3. Test Verification

1. Submit a form
2. Check browser console for reCAPTCHA execution
3. Verify server logs show successful verification
4. Confirm emails are sent

## Troubleshooting

### Common Issues

1. **Script not loading**
   - Check `index.html` has the Enterprise script
   - Verify network access to Google services

2. **"grecaptcha is not defined"**
   - Ensure script loads before React app
   - Check for JavaScript errors in console

3. **Enterprise API errors**
   - Verify Google Cloud project setup
   - Check API key permissions
   - Falls back to standard verification

4. **Low risk scores**
   - Adjust threshold in server code
   - Review user behavior patterns
   - Consider allowlisting trusted users

### Verification Fallback

If Enterprise verification fails, the system automatically falls back to standard reCAPTCHA verification using the same keys.

## Security Benefits

- **Advanced Bot Detection**: AI-powered risk analysis
- **Real-time Scoring**: Continuous risk assessment
- **Fraud Prevention**: Enhanced security features
- **Invisible UX**: No user interaction required
- **Enterprise Support**: Google Cloud backing

## Migration from Standard reCAPTCHA

The implementation maintains backward compatibility:
- Same environment variable names
- Graceful fallback to standard verification
- No changes required in most cases
- Just update the site key and version

## Monitoring and Analytics

Monitor these metrics:
- **Form submission rates**
- **reCAPTCHA scores distribution**  
- **Verification success rates**
- **Bot detection accuracy**
- **False positive rates**

Access detailed analytics in Google Cloud Console for deeper insights into traffic patterns and security threats.

## Next Steps

1. Deploy with the provided site key
2. Configure Enterprise secret key
3. Test all forms thoroughly
4. Monitor scores and adjust thresholds
5. Set up Cloud monitoring and alerts

The Enterprise implementation provides superior bot protection while maintaining a seamless user experience.
