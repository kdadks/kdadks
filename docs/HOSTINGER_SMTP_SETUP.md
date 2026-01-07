# Hostinger SMTP Setup Guide

## Quick Setup Instructions

### 1. Get Your Hostinger Email Credentials

To use Hostinger SMTP, you need:
- **Email address**: Your full email (e.g., `info@kdadks.com`)
- **Password**: Your email account password

### 2. Update Environment Variables

#### For Local Development
Create or update `.env` file in the project root:

```bash
# Hostinger SMTP Configuration
HOSTINGER_SMTP_USER=info@kdadks.com
HOSTINGER_SMTP_PASSWORD=your_email_password_here

# Other existing variables...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

#### For Production (Netlify)
1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Add these variables:
   - Key: `HOSTINGER_SMTP_USER`, Value: `info@kdadks.com`
   - Key: `HOSTINGER_SMTP_PASSWORD`, Value: `your_email_password`

### 3. Hostinger Email Settings Reference

If you need to configure email clients or troubleshoot:

| Setting | Value |
|---------|-------|
| **Outgoing (SMTP)** | |
| Server | `smtp.hostinger.com` |
| Port | `465` |
| Encryption | SSL |
| Authentication | Required (your email & password) |
| **Incoming (IMAP)** | |
| Server | `imap.hostinger.com` |
| Port | `993` |
| Encryption | SSL |
| **Incoming (POP3)** | |
| Server | `pop.hostinger.com` |
| Port | `995` |
| Encryption | SSL |

### 4. Test Email Functionality

After updating environment variables:

1. **Restart Development Server** (if running locally):
   ```bash
   npm run dev
   ```

2. **Test Contact Form**:
   - Navigate to the contact page
   - Fill out the form
   - Submit and check if email is received

3. **Check Logs**:
   - Look for "✅ Hostinger SMTP response" in console
   - Verify no authentication errors

### 5. Common Issues & Solutions

#### Authentication Failed
**Error**: "Email authentication failed - check Hostinger SMTP credentials"

**Solutions**:
- Verify email address is correct (full email, not just username)
- Check password (no typos, copy-paste recommended)
- Ensure email account is active in Hostinger
- Try resetting email password in Hostinger control panel

#### Connection Timeout
**Error**: "Failed to connect to email server"

**Solutions**:
- Verify port 465 is not blocked by firewall
- Check if Hostinger services are operational
- Try using port 587 with STARTTLS (requires code change)

#### Environment Variables Not Found
**Error**: "Hostinger SMTP credentials not set"

**Solutions**:
- Verify `.env` file exists in project root (local)
- Check Netlify environment variables are saved (production)
- Restart dev server after adding variables (local)
- Trigger new deployment after adding variables (production)

### 6. Hostinger Control Panel Access

To manage your email or reset password:
1. Log in to [Hostinger Control Panel](https://hpanel.hostinger.com)
2. Go to **Emails** section
3. Find your email account
4. Click **Manage** to view settings or reset password

### 7. Security Best Practices

- ✅ Never commit `.env` file to Git
- ✅ Use strong, unique passwords for email accounts
- ✅ Rotate passwords periodically
- ✅ Monitor email sending logs for suspicious activity
- ✅ Use environment-specific credentials (dev vs. prod)

### 8. Sending Limits

Hostinger email accounts typically have sending limits:
- Check your hosting plan for specific limits
- Default is usually 100-150 emails per hour
- Contact Hostinger support to increase limits if needed

### 9. Support Resources

- **Hostinger Knowledge Base**: https://support.hostinger.com
- **Email Settings Guide**: Search for "Hostinger SMTP settings"
- **Support Ticket**: Available in Hostinger control panel
- **Live Chat**: Available 24/7 for hosting customers

---

## Quick Troubleshooting Commands

### Check Environment Variables (Local)
```bash
# Windows PowerShell
$env:HOSTINGER_SMTP_USER
$env:HOSTINGER_SMTP_PASSWORD

# Linux/Mac
echo $HOSTINGER_SMTP_USER
echo $HOSTINGER_SMTP_PASSWORD
```

### View Netlify Environment Variables
```bash
netlify env:list
```

### Test Email Sending
Use the contact form on your website or check the browser console for detailed error messages.

---

**Last Updated**: October 17, 2025
