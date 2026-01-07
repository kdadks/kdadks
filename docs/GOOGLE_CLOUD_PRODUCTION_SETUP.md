# Google Cloud Service Account Setup for reCAPTCHA Enterprise Production

## 📋 Overview

Currently, your reCAPTCHA Enterprise implementation works in development with bypass logic. For production deployment, you need to authenticate with Google Cloud to use the reCAPTCHA Enterprise Assessment API for server-side verification.

## 🚀 Step-by-Step Production Setup

### Step 1: Access Google Cloud Console

1. **Navigate to Google Cloud Console**
   - Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Select Your Project**
   - Click on the project dropdown at the top
   - Select your project: `kdadks-service-p-1755602644470`
   - If you don't see it, ensure you have the correct permissions

### Step 2: Enable Required APIs

1. **Navigate to APIs & Services**
   - In the left sidebar, click **"APIs & Services"** → **"Library"**

2. **Enable reCAPTCHA Enterprise API**
   - Search for "reCAPTCHA Enterprise API"
   - Click on it and press **"Enable"**
   - Wait for the API to be enabled (may take a few minutes)

### Step 3: Create a Service Account

1. **Navigate to IAM & Admin**
   - In the left sidebar, click **"IAM & Admin"** → **"Service Accounts"**

2. **Create New Service Account**
   - Click **"+ CREATE SERVICE ACCOUNT"**
   - Fill in the details:
     ```
     Service account name: kdadks-recaptcha-service
     Service account ID: kdadks-recaptcha-service (auto-generated)
     Description: Service account for reCAPTCHA Enterprise API access
     ```
   - Click **"CREATE AND CONTINUE"**

3. **Grant Service Account Permissions**
   - In the "Grant this service account access to project" section
   - Click **"Select a role"** dropdown
   - Search for and select: **"reCAPTCHA Enterprise Agent"**
   - Click **"CONTINUE"**

4. **Grant User Access (Optional)**
   - You can skip this step for now
   - Click **"DONE"**

### Step 4: Generate Service Account Key

1. **Access Service Account**
   - You should now see your service account in the list
   - Click on the service account email (kdadks-recaptcha-service@kdadks-service-p-1755602644470.iam.gserviceaccount.com)

2. **Create JSON Key**
   - Click on the **"KEYS"** tab
   - Click **"ADD KEY"** → **"Create new key"**
   - Select **"JSON"** format
   - Click **"CREATE"**

3. **Download Key File**
   - A JSON file will automatically download
   - **IMPORTANT**: Keep this file secure - it contains sensitive credentials
   - Rename it to something meaningful: `kdadks-recaptcha-service-account.json`

### Step 5: Configure Your Production Environment

#### Option A: Linux/Unix Server Environment (For VPS/Dedicated Servers)

**Note**: These commands are for Linux/Unix servers, not Windows development machines.

1. **Upload Key to Your Server**
   ```bash
   # Create a secure directory for credentials (on your Linux server)
   sudo mkdir -p /etc/google-cloud/credentials
   
   # Upload your JSON key file to the server (via SCP/SFTP)
   sudo cp kdadks-recaptcha-service-account.json /etc/google-cloud/credentials/
   
   # Set secure permissions
   sudo chmod 600 /etc/google-cloud/credentials/kdadks-recaptcha-service-account.json
   sudo chown www-data:www-data /etc/google-cloud/credentials/kdadks-recaptcha-service-account.json
   ```

2. **Set Environment Variable**
   ```bash
   # Add to your production environment file (.env.production) on the server
   GOOGLE_APPLICATION_CREDENTIALS=/etc/google-cloud/credentials/kdadks-recaptcha-service-account.json
   NODE_ENV=production
   RECAPTCHA_DEVELOPMENT_BYPASS=false
   ```

#### Option B: Netlify Environment (Recommended for Your Setup)

1. **Convert JSON to Base64**
   ```bash
   # On your local machine
   base64 -i kdadks-recaptcha-service-account.json -o service-account-base64.txt
   ```

2. **Add Netlify Environment Variables**
   - Go to your Netlify dashboard
   - Navigate to **Site settings** → **Environment variables**
   - Add these variables:
   
   ```
   GOOGLE_APPLICATION_CREDENTIALS_BASE64=<paste the base64 content>
   NODE_ENV=production
   RECAPTCHA_DEVELOPMENT_BYPASS=false
   ```

3. **Update Your Code for Netlify**
   - Modify your `api/send-email.cjs` to handle base64 credentials:

```javascript
// Add this code at the top of your send-email.cjs file
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
  const credentials = Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 
    'base64'
  ).toString('utf-8');
  
  // Write temporary credentials file
  const fs = require('fs');
  const path = require('path');
  const tmpDir = '/tmp';
  const credentialsPath = path.join(tmpDir, 'google-credentials.json');
  
  fs.writeFileSync(credentialsPath, credentials);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}
```

#### Option C: Windows Development Testing (For Local Testing Only)

**Warning**: Only for testing on your Windows development machine, not for production.

1. **Download the Service Account JSON File**
   - After creating the service account key, save it as: `kdadks-recaptcha-service-account.json`
   - Place it in a secure folder on your Windows machine, e.g., `C:\credentials\`

2. **Create a Local Test Environment File**
   - Create `.env.production` in your project root:
   ```bash
   # Local Windows testing only
   GOOGLE_APPLICATION_CREDENTIALS=C:\credentials\kdadks-recaptcha-service-account.json
   NODE_ENV=production
   RECAPTCHA_DEVELOPMENT_BYPASS=false
   
   # Your existing variables
   BREVO_PASSWORD=UIORTsz50Y8ca1Ep
   VITE_SUPABASE_URL=https://npsptvuevwracyzzmktl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
   VITE_RECAPTCHA_SECRET_KEY=6LdQV6srAAAAAO79W16J3y7jCS6LOFkdQrlQ-6fm
   VITE_RECAPTCHA_VERSION=enterprise
   GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
   ```

3. **Test Locally**
   ```powershell
   # Stop current development servers
   taskkill /F /IM node.exe
   
   # Copy production environment
   Copy-Item .env.production .env.local
   
   # Start with production settings
   node dev-server.cjs
   
   # In another terminal
   npm run dev
   ```

4. **Verify Google Cloud Integration**
   - Submit a form and check the server logs
   - You should see: "🔍 Attempting reCAPTCHA Enterprise verification with Google Cloud client..."
   - You should see actual risk scores instead of bypass messages

### Step 6: Update Your Application Code

Your current code is already production-ready! The bypass logic will automatically detect the production environment:

```javascript
// This is already in your send-email.cjs
const isProduction = process.env.NODE_ENV === 'production';
const hasGoogleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const isDevelopmentBypass = process.env.RECAPTCHA_DEVELOPMENT_BYPASS === 'true';

// In production with credentials, full verification will run
if (!isProduction && (!hasGoogleCredentials || isDevelopmentBypass)) {
  // Development bypass (current behavior)
} else {
  // Full Google Cloud verification (production behavior)
}
```

### Step 7: Test Production Configuration

1. **Local Production Test**
   ```bash
   # Set environment variables
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/kdadks-recaptcha-service-account.json"
   export NODE_ENV=production
   export RECAPTCHA_DEVELOPMENT_BYPASS=false
   
   # Start your server
   node dev-server.cjs
   
   # Test a form submission
   npm run dev
   ```

2. **Verify Server Logs**
   - Look for: "🔍 Attempting reCAPTCHA Enterprise verification with Google Cloud client..."
   - Should see actual risk scores instead of bypass messages

### Step 8: Deploy to Production

1. **Netlify Deployment**
   - Push your code to your Git repository
   - Netlify will automatically deploy with the new environment variables

2. **Manual Server Deployment**
   - Upload your code to your production server
   - Ensure the service account key is in place
   - Set environment variables in your production environment
   - Restart your application

### Step 9: Monitor and Verify

1. **Check reCAPTCHA Console**
   - Go to [https://console.cloud.google.com/security/recaptcha](https://console.cloud.google.com/security/recaptcha)
   - Select your project
   - You should see real traffic and assessments

2. **Test Form Submissions**
   - Submit forms on your production site
   - Check server logs for successful verifications
   - Verify emails are being sent successfully

## 🔧 Production Environment Variables

Your final production `.env` should look like:

```bash
# Production Environment
NODE_ENV=production
RECAPTCHA_DEVELOPMENT_BYPASS=false

# Google Cloud Configuration
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470

# reCAPTCHA Enterprise Configuration
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
VITE_RECAPTCHA_SECRET_KEY=6LdQV6srAAAAAO79W16J3y7jCS6LOFkdQrlQ-6fm
VITE_RECAPTCHA_VERSION=enterprise

# Other configuration...
BREVO_PASSWORD=UIORTsz50Y8ca1Ep
VITE_SUPABASE_URL=https://npsptvuevwracyzzmktl.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🚨 Security Best Practices

1. **Never Commit Service Account Keys**
   - Add `*.json` to your `.gitignore`
   - Never include credentials in your code repository

2. **Rotate Keys Regularly**
   - Create new service account keys every 90 days
   - Delete old keys from Google Cloud Console

3. **Limit Permissions**
   - Only grant "reCAPTCHA Enterprise Agent" role
   - Don't give broader permissions than necessary

4. **Monitor Usage**
   - Check Google Cloud Console for unusual API usage
   - Set up billing alerts for unexpected costs

## 🎯 Expected Behavior After Setup

### Development (Current)
- ✅ Forms work with bypass logic
- ✅ No real Google Cloud calls
- ✅ Emails send successfully

### Production (After Setup)
- ✅ Forms make real reCAPTCHA Enterprise assessments
- ✅ Server-side verification with risk scores
- ✅ Enhanced bot protection
- ✅ Full Google Cloud integration

## 📞 Troubleshooting

### Common Issues:

1. **"Invalid credentials" error**
   - Verify JSON file path is correct
   - Check file permissions
   - Ensure service account has correct role

2. **"API not enabled" error**
   - Enable reCAPTCHA Enterprise API in Google Cloud Console
   - Wait a few minutes for propagation

3. **"Insufficient permissions" error**
   - Verify service account has "reCAPTCHA Enterprise Agent" role
   - Check project ID matches your configuration

### Support Resources:
- [reCAPTCHA Enterprise Documentation](https://cloud.google.com/recaptcha-enterprise/docs)
- [Service Account Authentication](https://cloud.google.com/docs/authentication/getting-started)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Note**: Your current development setup is fully functional. This production setup adds enterprise-grade security verification for live traffic.
