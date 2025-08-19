# Google reCAPTCHA Implementation Guide

## Overview

Google reCAPTCHA v2 has been implemented across all forms in the Kdadks website to prevent malware attacks and bot submissions. This includes:

- Customer Support forms
- Service Inquiry forms  
- Book Consultation forms
- Partnership Application forms
- Contact forms

## Setup Instructions

### 1. Get reCAPTCHA Keys

1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site with reCAPTCHA v2 ("I'm not a robot" checkbox)
3. Add your domain(s) (e.g., `localhost`, `kdadks.com`)
4. Copy the Site Key and Secret Key

### 2. Environment Configuration

Create a `.env` file (or update existing) with your reCAPTCHA keys:

```bash
# Google reCAPTCHA Configuration
VITE_RECAPTCHA_SITE_KEY=your_site_key_here
VITE_RECAPTCHA_SECRET_KEY=your_secret_key_here
```

**Important Security Notes:**
- The Site Key (VITE_RECAPTCHA_SITE_KEY) is public and safe to expose in client-side code
- The Secret Key (VITE_RECAPTCHA_SECRET_KEY) should be kept secure and only used server-side
- In production, ensure the Secret Key is properly secured in your deployment environment

### 3. Development Mode

If reCAPTCHA keys are not configured, the system will:
- Show a warning message instead of the reCAPTCHA widget
- Allow form submissions to proceed (for development convenience)
- Log a warning about missing configuration

## Implementation Details

### Client-Side Integration

Each form component includes:
1. **ReCaptcha Component**: Reusable component with proper TypeScript types
2. **Token Management**: State management for reCAPTCHA tokens
3. **Form Validation**: Prevents submission without reCAPTCHA completion
4. **Error Handling**: Resets reCAPTCHA on form errors
5. **User Feedback**: Clear loading states and disabled buttons

### Server-Side Verification

The email API (`/api/send-email.cjs`) includes:
1. **Token Verification**: Validates reCAPTCHA tokens with Google's API
2. **Score Analysis**: Checks reCAPTCHA success status
3. **Fallback Handling**: Graceful degradation when reCAPTCHA is not configured
4. **Error Response**: Proper error messages for failed verification

### Security Features

- **Request Validation**: All form submissions require valid reCAPTCHA tokens
- **Token Expiration**: Handles expired tokens gracefully
- **Rate Limiting**: reCAPTCHA provides built-in bot protection
- **CORS Protection**: Proper CORS headers for API security

## Form Components Updated

### 1. Customer Support (`CustomerSupport.tsx`)
- Priority-based support requests
- Service type selection
- Full contact information collection
- Professional email templates

### 2. Service Inquiry (`ServiceInquiry.tsx`)
- Service selection interface
- Budget and timeline options
- Requirements specification
- Multi-service brand coverage

### 3. Book Consultation (`BookConsultation.tsx`)
- Service-specific consultation booking
- Date and time selection
- Consultation type preferences
- Professional scheduling system

### 4. Partnership Application (`Partnership.tsx`)
- Partnership type selection
- Company information collection
- Proposal and goals specification
- Comprehensive application system

### 5. Contact Form (`Contact.tsx`)
- General contact inquiries
- Company information optional
- Simple and effective communication

## User Experience

### Form Flow
1. User fills out form fields
2. reCAPTCHA widget appears before submission
3. User completes "I'm not a robot" verification
4. Submit button becomes enabled
5. Form submits with verification token
6. Server validates token before processing
7. Success/error feedback provided

### Error Handling
- Invalid reCAPTCHA: Form shows error, reCAPTCHA resets
- Expired token: User must complete reCAPTCHA again
- Network issues: Graceful fallback with clear error messages
- Missing configuration: Development warning shown

## Deployment Checklist

### Before Production
- [ ] Obtain production reCAPTCHA keys
- [ ] Configure environment variables
- [ ] Test form submissions
- [ ] Verify email delivery
- [ ] Check error handling
- [ ] Test mobile responsiveness

### Production Monitoring
- [ ] Monitor form submission success rates
- [ ] Track reCAPTCHA verification failures
- [ ] Monitor for potential bot activity
- [ ] Check email delivery rates
- [ ] Review error logs regularly

## Troubleshooting

### Common Issues

1. **reCAPTCHA Not Loading**
   - Check if site key is correctly configured
   - Verify domain is added to reCAPTCHA console
   - Check for JavaScript errors in browser console

2. **Verification Failures**
   - Ensure secret key is correctly configured
   - Check server-side API is accessible
   - Verify network connectivity to Google services

3. **Development Issues**
   - Use `localhost` domain in reCAPTCHA console for local development
   - Check environment variable naming (VITE_ prefix required)
   - Ensure `.env` file is in project root

### Testing

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Test forms with reCAPTCHA
# - Visit each form page
# - Complete form fields
# - Verify reCAPTCHA appears
# - Test successful submission
# - Test error handling
```

## Security Best Practices

1. **Key Management**
   - Never commit secret keys to version control
   - Use environment variables for all sensitive data
   - Rotate keys periodically
   - Monitor key usage in Google Console

2. **Form Protection**
   - Always validate reCAPTCHA server-side
   - Implement additional rate limiting if needed
   - Log and monitor suspicious activity
   - Use HTTPS in production

3. **User Privacy**
   - Include reCAPTCHA in privacy policy
   - Inform users about Google's data collection
   - Comply with GDPR/privacy regulations
   - Provide clear user consent

## Support and Maintenance

For issues with reCAPTCHA implementation:
1. Check Google reCAPTCHA documentation
2. Review browser console for JavaScript errors
3. Verify server logs for API failures
4. Test with different browsers and devices
5. Monitor form submission analytics

The implementation provides robust protection against automated attacks while maintaining a smooth user experience for legitimate users.
