# 🚀 Production Deployment Checklist

## Required Netlify Environment Variables

### ⚡ Quick Setup List

Copy and paste these into Netlify Dashboard → Environment Variables:

```
HOSTINGER_SMTP_USER=info@kdadks.com
HOSTINGER_SMTP_PASSWORD=your_hostinger_password

VITE_SUPABASE_URL=https://npsptvuevwracyzzmktl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
VITE_RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
VITE_RECAPTCHA_VERSION=enterprise

GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
GOOGLE_APPLICATION_CREDENTIALS=./etc/credentials/google-service-account.json
```

---

## 📝 Step-by-Step Instructions

### 1. Access Netlify Dashboard
- Go to: https://app.netlify.com
- Select your site
- Navigate to: **Site settings** → **Environment variables**

### 2. Get Your Credentials

#### Hostinger Email
- [ ] Log in to [Hostinger](https://hpanel.hostinger.com)
- [ ] Go to **Emails** section
- [ ] Copy your email address (e.g., info@kdadks.com)
- [ ] Use your email password

#### Supabase Database
- [ ] Log in to [Supabase](https://app.supabase.com)
- [ ] Select project
- [ ] Go to **Settings** → **API**
- [ ] Copy **Project URL** and **anon key**

#### Google reCAPTCHA
- [ ] Log in to [Google Cloud](https://console.cloud.google.com)
- [ ] Select project: `kdadks-service-p-1755602644470`
- [ ] Go to **Security** → **reCAPTCHA Enterprise**
- [ ] Copy **Site Key** and **Secret Key**

#### Google Cloud API
- [ ] In Google Cloud Console
- [ ] Go to **APIs & Services** → **Credentials**
- [ ] Copy your **API Key**

### 3. Add Variables to Netlify

For each variable:
1. Click **Add a variable**
2. Enter **Key** (e.g., `HOSTINGER_SMTP_USER`)
3. Enter **Value** (your actual value)
4. Select **Scopes**: Choose **All**
5. Click **Save**

### 4. Deploy

After adding all variables:
- [ ] Go to **Deploys** tab
- [ ] Click **Trigger deploy** → **Clear cache and deploy site**

### 5. Test

After deployment:
- [ ] Test contact form
- [ ] Test admin login
- [ ] Check email delivery
- [ ] Verify reCAPTCHA works

---

## ✅ Variables Checklist

Copy this and check off as you add each one:

### Email Service
- [ ] `HOSTINGER_SMTP_USER`
- [ ] `HOSTINGER_SMTP_PASSWORD`

### Database
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

### reCAPTCHA
- [ ] `VITE_RECAPTCHA_SITE_KEY`
- [ ] `VITE_RECAPTCHA_SECRET_KEY`
- [ ] `VITE_RECAPTCHA_VERSION`

### Google Cloud
- [ ] `GOOGLE_CLOUD_PROJECT_ID`
- [ ] `GOOGLE_CLOUD_API_KEY`
- [ ] `GOOGLE_APPLICATION_CREDENTIALS`

---

## 🔧 Alternative: Using Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Set variables
netlify env:set HOSTINGER_SMTP_USER "info@kdadks.com"
netlify env:set HOSTINGER_SMTP_PASSWORD "your_password"
netlify env:set VITE_SUPABASE_URL "https://npsptvuevwracyzzmktl.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your_anon_key"
netlify env:set VITE_RECAPTCHA_SITE_KEY "6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r"
netlify env:set VITE_RECAPTCHA_SECRET_KEY "your_secret_key"
netlify env:set VITE_RECAPTCHA_VERSION "enterprise"
netlify env:set GOOGLE_CLOUD_PROJECT_ID "kdadks-service-p-1755602644470"
netlify env:set GOOGLE_CLOUD_API_KEY "your_api_key"
netlify env:set GOOGLE_APPLICATION_CREDENTIALS "./etc/credentials/google-service-account.json"

# Verify
netlify env:list

# Deploy
netlify deploy --prod
```

---

## 🆘 Troubleshooting

### Variables not working?
1. Clear cache: **Trigger deploy** → **Clear cache and deploy site**
2. Check spelling: Variable names are case-sensitive
3. Check scopes: Ensure "Production" is selected

### Still having issues?
- Check Netlify function logs: **Functions** → **send-email** → **Logs**
- Review: `NETLIFY_ENVIRONMENT_VARIABLES.md` for detailed guide
- Contact support with specific error messages

---

## 📚 Documentation

- **Full Guide**: `NETLIFY_ENVIRONMENT_VARIABLES.md`
- **Migration**: `HOSTINGER_SMTP_MIGRATION.md`
- **Setup**: `HOSTINGER_SMTP_SETUP.md`

---

**Last Updated**: October 17, 2025
