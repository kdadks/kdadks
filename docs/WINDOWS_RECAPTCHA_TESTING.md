# Quick Windows Testing Guide for reCAPTCHA Enterprise

## 🎯 How to Enable and Test Google Cloud reCAPTCHA on Windows

Since you're on Windows and the Linux commands don't work, here's the Windows-specific approach:

### Step 1: Get Google Cloud Service Account Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select project: `kdadks-service-p-1755602644470`

2. **Create Service Account** (if not done already)
   - Go to IAM & Admin → Service Accounts
   - Create service account: `kdadks-recaptcha-service`
   - Grant role: `reCAPTCHA Enterprise Agent`

3. **Download JSON Key**
   - Click on the service account
   - Go to "Keys" tab → "Add Key" → "Create new key" → JSON
   - Save as: `kdadks-recaptcha-service-account.json`

### Step 2: Windows Local Testing Setup

1. **Create Credentials Folder**
   ```powershell
   # Create a secure folder
   mkdir C:\credentials
   
   # Move your JSON file there
   Move-Item "kdadks-recaptcha-service-account.json" "C:\credentials\"
   ```

2. **Create Production Environment File**
   ```powershell
   # Create .env.production in your project root
   New-Item -Path ".env.production" -ItemType File
   ```

3. **Add Production Configuration**
   Edit `.env.production` with this content:
   ```bash
   # Google Cloud Configuration
   GOOGLE_APPLICATION_CREDENTIALS=C:\credentials\kdadks-recaptcha-service-account.json
   NODE_ENV=production
   RECAPTCHA_DEVELOPMENT_BYPASS=false
   
   # Your existing configuration
   BREVO_PASSWORD=UIORTsz50Y8ca1Ep
   VITE_SUPABASE_URL=https://npsptvuevwracyzzmktl.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wc3B0dnVldndyYWN5enpta3RsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MDA1MDMsImV4cCI6MjA2OTI3NjUwM30.i-bJxP2EP2gp-9ig3AJhuaa05O-jJZNKqPNuhvr2UdE
   VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
   VITE_RECAPTCHA_SECRET_KEY=6LdQV6srAAAAAO79W16J3y7jCS6LOFkdQrlQ-6fm
   VITE_RECAPTCHA_VERSION=enterprise
   GOOGLE_CLOUD_PROJECT_ID=kdadks-service-p-1755602644470
   ```

### Step 3: Test Google Cloud Integration

1. **Stop Current Servers**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **Switch to Production Environment**
   ```powershell
   # Backup current .env
   Copy-Item .env .env.development.backup
   
   # Use production settings
   Copy-Item .env.production .env
   ```

3. **Start Servers with Production Settings**
   ```powershell
   # Terminal 1: Start API server
   node dev-server.cjs
   
   # Terminal 2: Start frontend
   npm run dev
   ```

### Step 4: Verify Google Cloud is Working

1. **Check Server Logs**
   Look for these messages in the API server terminal:
   ```
   🔍 Environment check: {
     NODE_ENV: 'production',
     RECAPTCHA_DEVELOPMENT_BYPASS: 'false',
     GOOGLE_APPLICATION_CREDENTIALS: true,
     GOOGLE_CLOUD_PROJECT_ID: true
   }
   ```

2. **Submit a Form**
   - Go to http://localhost:3000
   - Submit any form (Contact, Book Consultation, etc.)

3. **Look for Google Cloud Logs**
   You should now see:
   ```
   🔍 Attempting reCAPTCHA Enterprise verification with Google Cloud client...
   The reCAPTCHA score is: 0.9
   ✅ reCAPTCHA Enterprise verification successful, score: 0.9
   ```

### Step 5: Switch Back to Development Mode

When you're done testing:

```powershell
# Restore development settings
Copy-Item .env.development.backup .env

# Restart servers
taskkill /F /IM node.exe
node dev-server.cjs  # Terminal 1
npm run dev          # Terminal 2
```

## 🚨 Important Security Notes

1. **Never Commit the JSON File**
   - Add `*.json` to your `.gitignore`
   - Add `C:\credentials\` to `.gitignore`

2. **Production Deployment**
   - For Netlify: Use the base64 method from the main guide
   - For VPS: Use the Linux commands from the main guide
   - Never deploy the JSON file directly to public repositories

## 🎯 Expected Results

### Development Mode (Normal):
```
⚠️ Development mode: reCAPTCHA verification bypassed
```

### Production Mode (With Google Cloud):
```
🔍 Attempting reCAPTCHA Enterprise verification with Google Cloud client...
The reCAPTCHA score is: 0.9
✅ reCAPTCHA Enterprise verification successful, score: 0.9
```

This will let you see the actual Google Cloud reCAPTCHA Enterprise assessment in action on your Windows development machine!
