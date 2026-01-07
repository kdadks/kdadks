# Netlify Environment Variables Setup

## ⚠️ IMPORTANT: Production Environment Variables

**NEVER** store production credentials in `.env.production` or commit them to Git!

All production environment variables **MUST** be configured in the Netlify Dashboard.

---

## 📋 Required Environment Variables for Netlify

### How to Add Environment Variables in Netlify

1. Log in to [Netlify Dashboard](https://app.netlify.com)
2. Select your site (kdadks)
3. Go to **Site settings** → **Environment variables**
4. Click **Add a variable** or **Add from .env file**
5. Add each variable below

---

## 🔐 Environment Variables List

### 1. Hostinger SMTP (Email Service)

**Required for contact forms and email notifications**

| Variable | Value | Scope |
|----------|-------|-------|
| `HOSTINGER_SMTP_USER` | `your_email@yourdomain.com` | All |
| `HOSTINGER_SMTP_PASSWORD` | `your_hostinger_email_password` | All |

**Where to find:**
- Log in to [Hostinger Control Panel](https://hpanel.hostinger.com)
- Go to **Emails** section
- Use your full email address as the username
- Use your email account password

---

### 2. Supabase (Database & Authentication)

**Required for invoice system, authentication, and data storage**

| Variable | Value | Scope |
|----------|-------|-------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | `your_supabase_anon_key` | All |

**Where to find:**
1. Log in to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon/Public Key** → `VITE_SUPABASE_ANON_KEY`

**Your current values:**
- URL: `https://npsptvuevwracyzzmktl.supabase.co`
- Anon Key: (Found in your Supabase dashboard)

---

### 3. Google reCAPTCHA Enterprise

**Required for spam protection on contact forms**

| Variable | Value | Scope |
|----------|-------|-------|
| `VITE_RECAPTCHA_SITE_KEY` | `6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r` | All |
| `VITE_RECAPTCHA_SECRET_KEY` | `your_recaptcha_secret_key` | All |
| `VITE_RECAPTCHA_VERSION` | `enterprise` | All |

**Where to find:**
1. Log in to [Google Cloud Console](https://console.cloud.google.com)
2. Select project: `kdadks-service-p-1755602644470`
3. Go to **Security** → **reCAPTCHA Enterprise**
4. Find your key or create a new one
5. Copy both Site Key and Secret Key

**Your current site key:** `6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r`

---

### 4. Google Cloud Configuration

**Required for reCAPTCHA Enterprise API**

| Variable | Value | Scope |
|----------|-------|-------|
| `GOOGLE_CLOUD_PROJECT_ID` | `kdadks-service-p-1755602644470` | All |
| `GOOGLE_CLOUD_API_KEY` | `your_google_cloud_api_key` | All |
| `GOOGLE_APPLICATION_CREDENTIALS` | `./etc/credentials/google-service-account.json` | All |

**Where to find:**
1. **Project ID**: Already set to `kdadks-service-p-1755602644470`
2. **API Key**: Google Cloud Console → APIs & Services → Credentials
3. **Service Account**: Should already be in `etc/credentials/` folder

---

### 5. Optional Environment Variables

| Variable | Value | Scope | Description |
|----------|-------|-------|-------------|
| `NODE_ENV` | `production` | All | Node environment |
| `RECAPTCHA_DEVELOPMENT_BYPASS` | `false` | All | Disable for production |

---

## 📝 Step-by-Step Setup Instructions

### Method 1: Manual Entry (Recommended)

1. **Access Netlify Dashboard**
   ```
   https://app.netlify.com/sites/YOUR_SITE_NAME/settings/env
   ```

2. **Add Each Variable**
   - Click **Add a variable**
   - Enter **Key** (variable name)
   - Enter **Value** (actual value)
   - Select **Scopes**: Choose "All" or specific contexts
   - Click **Save**

3. **Required Variables Checklist**
   ```
   ✅ HOSTINGER_SMTP_USER
   ✅ HOSTINGER_SMTP_PASSWORD
   ✅ VITE_SUPABASE_URL
   ✅ VITE_SUPABASE_ANON_KEY
   ✅ VITE_RECAPTCHA_SITE_KEY
   ✅ VITE_RECAPTCHA_SECRET_KEY
   ✅ VITE_RECAPTCHA_VERSION
   ✅ GOOGLE_CLOUD_PROJECT_ID
   ✅ GOOGLE_CLOUD_API_KEY
   ✅ GOOGLE_APPLICATION_CREDENTIALS
   ```

### Method 2: Using Netlify CLI

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Link to your site
netlify link

# Add environment variables
netlify env:set HOSTINGER_SMTP_USER "your_email@yourdomain.com"
netlify env:set HOSTINGER_SMTP_PASSWORD "your_password"
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_anon_key"
netlify env:set VITE_RECAPTCHA_SITE_KEY "6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r"
netlify env:set VITE_RECAPTCHA_SECRET_KEY "your_secret_key"
netlify env:set VITE_RECAPTCHA_VERSION "enterprise"
netlify env:set GOOGLE_CLOUD_PROJECT_ID "kdadks-service-p-1755602644470"
netlify env:set GOOGLE_CLOUD_API_KEY "your_api_key"
netlify env:set GOOGLE_APPLICATION_CREDENTIALS "./etc/credentials/google-service-account.json"

# Verify variables are set
netlify env:list
```

---

## 🔍 Verification Steps

### 1. Check Variables Are Set

```bash
# Using Netlify CLI
netlify env:list

# Or check in Netlify Dashboard
# Site settings → Environment variables
```

### 2. Trigger New Deployment

After adding environment variables:

**Option A: Netlify Dashboard**
- Go to **Deploys** tab
- Click **Trigger deploy** → **Deploy site**

**Option B: Git Push**
```bash
git commit --allow-empty -m "Trigger rebuild with new env vars"
git push origin main
```

**Option C: Netlify CLI**
```bash
netlify deploy --prod
```

### 3. Test Functionality

After deployment, test:
- ✅ Contact form submission (tests email)
- ✅ reCAPTCHA verification
- ✅ Admin login (tests Supabase)
- ✅ Invoice creation (tests Supabase + Email)

---

## 🚨 Security Best Practices

### ✅ DO:
- Store ALL production credentials in Netlify Dashboard
- Use different credentials for development vs. production
- Rotate passwords regularly
- Use `.env.example` as a template (no real values)
- Keep `.env` (local dev) in `.gitignore`
- Use environment-specific scopes in Netlify

### ❌ DON'T:
- Never commit `.env` or `.env.production` with real credentials
- Don't share credentials via email or chat
- Don't use production credentials in development
- Don't commit API keys to Git
- Don't expose secret keys in client-side code

---

## 🔄 Variable Scopes in Netlify

Netlify allows you to set variables for different contexts:

| Scope | When Used | Example Use Case |
|-------|-----------|------------------|
| **Production** | Live site | Real SMTP, real database |
| **Deploy Previews** | PR previews | Test SMTP, test database |
| **Branch Deploys** | Specific branches | Staging environment |
| **All** | Everything | Safe public keys |

**Recommended Scopes:**
- Secrets (passwords, API keys): **Production only**
- Public keys (site keys): **All**
- URLs: **All** (or branch-specific)

---

## 📊 Current Production Setup Summary

Based on your project, here are your known values:

```bash
# Email Service
HOSTINGER_SMTP_USER=info@kdadks.com  # (Update with actual email)
HOSTINGER_SMTP_PASSWORD=***hidden***   # (Get from Hostinger)

# Database
VITE_SUPABASE_URL=https://npsptvuevwracyzzmktl.supabase.co
VITE_SUPABASE_ANON_KEY=***hidden***   # (Get from Supabase)

# reCAPTCHA
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
VITE_RECAPTCHA_SECRET_KEY=***hidden***  # (Get from Google Cloud)
VITE_RECAPTCHA_VERSION=enterprise

# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
GOOGLE_CLOUD_API_KEY=***hidden***      # (Get from Google Cloud)
```

---

## 🆘 Troubleshooting

### Variables Not Taking Effect

1. **Clear build cache**
   - Netlify Dashboard → Deploys → Trigger deploy → **Clear cache and deploy site**

2. **Check variable naming**
   - Variables are case-sensitive
   - Must match exactly (e.g., `VITE_SUPABASE_URL` not `vite_supabase_url`)

3. **Verify scopes**
   - Ensure variables are available in "Production" scope

### Email Not Sending

```bash
# Check these variables are set:
HOSTINGER_SMTP_USER
HOSTINGER_SMTP_PASSWORD

# Check Netlify function logs:
# Dashboard → Functions → send-email → Logs
```

### Database Connection Failed

```bash
# Check these variables:
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

# Verify URL format: https://your-project.supabase.co
```

### reCAPTCHA Not Working

```bash
# Check these variables:
VITE_RECAPTCHA_SITE_KEY
VITE_RECAPTCHA_SECRET_KEY
VITE_RECAPTCHA_VERSION
GOOGLE_CLOUD_PROJECT_ID
```

---

## 📞 Support Resources

- **Netlify Docs**: https://docs.netlify.com/environment-variables/overview/
- **Netlify Support**: https://www.netlify.com/support/
- **Supabase Docs**: https://supabase.com/docs
- **Google Cloud Console**: https://console.cloud.google.com
- **Hostinger Support**: https://support.hostinger.com

---

**Last Updated**: October 17, 2025  
**Status**: ✅ Ready for Production Deployment
