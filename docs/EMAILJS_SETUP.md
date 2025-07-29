# EmailJS Setup Guide

This guide explains how to set up EmailJS to enable email functionality in the contact form.

## Overview

The contact form has been configured to send emails to `kdadks@outlook.com` with all the details entered by users including:
- Full Name
- Email Address  
- Company Name (optional)
- Message

## Setup Steps

### 1. Create EmailJS Account
1. Go to [EmailJS.com](https://www.emailjs.com/)
2. Sign up for a free account
3. Verify your email address

### 2. Add Email Service
1. In your EmailJS dashboard, go to "Email Services"
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions for your provider
5. Note down the **Service ID** (e.g., `service_abc123`)

### 3. Create Email Template
1. Go to "Email Templates" in your dashboard
2. Click "Create New Template"
3. Use this template content:

**Template Name:** Contact Form Submission

**Subject:** New Contact Form Submission from {{from_name}}

**Content:**
```
Hello,

You have received a new contact form submission from your website.

Details:
- Name: {{from_name}}
- Email: {{from_email}}
- Company: {{company}}
- Message: {{message}}

You can reply directly to this email to respond to {{from_name}}.

Best regards,
Website Contact Form
```

4. Set the template settings:
   - **To Email:** kdadks@outlook.com
   - **From Name:** {{from_name}}
   - **From Email:** Use your verified sender email
   - **Reply To:** {{reply_to}}

5. Save the template and note down the **Template ID** (e.g., `template_xyz789`)

### 4. Get Public Key
1. Go to "Account" > "API Keys"
2. Copy your **Public Key** (e.g., `user_abcdef123456`)

### 5. Update Configuration
Edit the file `src/config/emailjs.ts` and replace the placeholder values:

```typescript
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: 'your_actual_public_key',
  SERVICE_ID: 'your_actual_service_id', 
  TEMPLATE_ID: 'your_actual_template_id',
}
```

### 6. Test the Form
1. Start your development server: `npm run dev`
2. Navigate to the contact section
3. Fill out and submit the test form
4. Check that the email arrives at kdadks@outlook.com

## Security Notes

- EmailJS public keys are safe to use in frontend code
- The actual email sending happens on EmailJS servers
- Rate limiting is automatically applied to prevent spam
- Consider setting up additional spam protection in EmailJS dashboard

## Troubleshooting

### Common Issues:

1. **"EmailJS not configured" error**
   - Make sure you've replaced all placeholder values in the config file

2. **Email not received**
   - Check your EmailJS dashboard for delivery logs
   - Verify the template is correctly configured
   - Check spam folder

3. **CORS errors**
   - EmailJS should work from any domain, but check your service settings

4. **Rate limiting**
   - Free tier has monthly limits
   - Consider upgrading for high-volume usage

## Alternative Solutions

If you prefer a different email service, you could also use:
- Formspree
- Netlify Forms (if hosting on Netlify)
- Custom backend with Nodemailer
- SendGrid
- Amazon SES

## Environment Variables (Optional)

For better security in production, you can use environment variables:

1. Create a `.env` file:
```
VITE_EMAILJS_PUBLIC_KEY=your_public_key
VITE_EMAILJS_SERVICE_ID=your_service_id  
VITE_EMAILJS_TEMPLATE_ID=your_template_id
```

2. Update the config to use environment variables:
```typescript
export const EMAILJS_CONFIG = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'fallback_key',
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'fallback_service',
  TEMPLATE_ID: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'fallback_template',
}
```

Note: Add `.env` to your `.gitignore` file to keep credentials secure.