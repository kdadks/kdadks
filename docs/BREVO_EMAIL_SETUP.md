# Brevo Email Integration Setup Guide

This guide explains how to set up the Brevo email integration for the contact form on your KDADKS website.

## Overview

The email system has been migrated from EmailJS to Brevo SMTP for more reliable email delivery. The integration includes:

- Frontend contact form (React)
- Backend email service (Node.js/Express)
- Brevo SMTP configuration
- Support for both development and production environments

## Prerequisites

1. **Brevo Account**: You need a Brevo (formerly Sendinblue) account
2. **SMTP Credentials**: The following are already configured:
   - SMTP Server: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: `900018001@smtp-brevo.com`

## Setup Instructions

### 1. Get Your Brevo SMTP Password

1. Log in to your Brevo account
2. Go to **Account** → **SMTP & API**
3. Find your SMTP password or generate a new one
4. Copy the password (you'll need this for the next step)

### 2. Environment Configuration

#### For Development:
1. Create a `.env` file in the root directory:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Brevo password:
   ```env
   BREVO_PASSWORD=your_actual_brevo_smtp_password
   PORT=3001
   NODE_ENV=development
   ```

#### For Production:
Set the environment variable `BREVO_PASSWORD` on your hosting platform:
- **Vercel**: Add in Project Settings → Environment Variables
- **Netlify**: Add in Site Settings → Environment Variables
- **Railway**: Add in Project Settings → Variables
- **Other platforms**: Consult their documentation for environment variables

### 3. Development Setup

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

   This will start both:
   - Frontend (Vite): `http://localhost:5173`
   - Backend (Express): `http://localhost:3001`

3. **Test the email service**:
   - Visit `http://localhost:3001/api/health` to check if the server is running
   - Fill out the contact form on your website to test email sending

### 4. Production Deployment

The email integration supports multiple deployment platforms:

#### Vercel
- The `api/send-email.js` file is automatically deployed as a serverless function
- Set the `BREVO_PASSWORD` environment variable in Vercel dashboard

#### Netlify
- The function is configured to work with Netlify Functions
- Set the `BREVO_PASSWORD` environment variable in Netlify dashboard

#### Traditional Hosting
- Deploy the `server.js` file to your server
- Ensure `BREVO_PASSWORD` environment variable is set
- Run with: `npm run server`

## File Structure

```
├── src/
│   ├── components/
│   │   └── Contact.tsx          # Updated contact form component
│   ├── config/
│   │   └── brevo.ts            # Brevo configuration types
│   └── services/
│       └── emailService.ts     # Email service with Brevo integration
├── api/
│   └── send-email.js           # Serverless function for deployments
├── server.js                   # Development/production server
├── .env.example               # Environment variables template
└── BREVO_EMAIL_SETUP.md       # This setup guide
```

## Features

### Email Template
The system automatically generates professional HTML and text emails with:
- Contact form data (name, email, company, message)
- Responsive HTML formatting
- Plain text fallback
- Reply-to header set to the form submitter's email

### Error Handling
- Form validation (required fields, email format)
- SMTP connection verification
- Detailed error messages for different failure scenarios
- Graceful fallback error messages for users

### Security
- CORS protection
- Input validation
- Environment variable protection for sensitive data
- Production-safe error handling

## Testing

### Local Testing
1. Start the development server: `npm run dev`
2. Open `http://localhost:5173`
3. Navigate to the contact section
4. Fill out and submit the form
5. Check the terminal for success/error messages

### Production Testing
1. Deploy to your hosting platform
2. Set the `BREVO_PASSWORD` environment variable
3. Test the contact form on your live website
4. Monitor email delivery in your Brevo dashboard

## Troubleshooting

### Common Issues

1. **"Email service not configured"**
   - Ensure `BREVO_PASSWORD` environment variable is set
   - Check that the password is correct in your Brevo account

2. **"Authentication failed"**
   - Verify your Brevo SMTP password
   - Check that the username `900018001@smtp-brevo.com` is correct

3. **"Connection failed"**
   - Check your internet connection
   - Verify Brevo service status
   - Ensure port 587 is not blocked by firewall

4. **Form submission hangs**
   - Check if the backend server is running (development)
   - Verify the API endpoint is accessible
   - Check browser console for network errors

### Debug Mode
For detailed error information, you can:
1. Check browser console for frontend errors
2. Check server logs for backend errors
3. Visit `/api/health` endpoint to verify server status

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Brevo account status and SMTP settings
3. Review server logs for detailed error messages
4. Contact your hosting provider if deployment issues persist

## Migration from EmailJS

The old EmailJS configuration has been replaced. If you need to revert:
1. The old EmailJS code is preserved in the git history
2. You can restore the previous version from your version control
3. Don't forget to remove the new dependencies if reverting

---

**Note**: Keep your Brevo SMTP password secure and never commit it to version control.