# How to Find reCAPTCHA Authorized Domains in Google Cloud Console

## 🎯 Navigate to reCAPTCHA Enterprise

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `kdadks-service-p-1755602644470`
3. **Navigate to Security** → **reCAPTCHA Enterprise**
   - Or search "reCAPTCHA" in the top search bar

## 🔍 Check Authorized Domains

### Method 1: From reCAPTCHA Enterprise Dashboard
1. Look for your site key: `6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r`
2. Click on the **key name** or **key ID**
3. In the key details page, look for:
   - **"Domains"** section
   - **"Authorized domains"** section
   - **"Website domains"** section

### Method 2: Direct URL
Visit: https://console.cloud.google.com/security/recaptcha/keys

## 📋 What You Should See

### ✅ **If Configured Correctly:**
```
Authorized Domains:
- localhost
- 127.0.0.1
- kdadks.com
- www.kdadks.com
```

### ❌ **If Missing localhost:**
```
Authorized Domains:
- kdadks.com
- www.kdadks.com
```

## 🛠️ **How to Add localhost**

1. **Click "Edit" or "Manage" on your key**
2. **Find the "Domains" field**
3. **Add these domains** (one per line):
   ```
   localhost
   127.0.0.1
   kdadks.com
   www.kdadks.com
   ```
4. **Click "Save" or "Update"**

## 🚨 **If You Don't See Any Keys**

This means you need to create a reCAPTCHA Enterprise key:

1. **Click "Create Key"**
2. **Choose "Website"**
3. **Enter Label**: "KDADKS Website"
4. **Add domains**:
   ```
   localhost
   127.0.0.1
   kdadks.com
   www.kdadks.com
   ```
5. **Click "Create"**
6. **Copy the new site key** and update your .env file

## 📱 **Alternative: Use Classic reCAPTCHA for Development**

If Enterprise setup is complex, you can temporarily use classic reCAPTCHA v3:

1. Go to https://www.google.com/recaptcha/admin
2. Create a new site with reCAPTCHA v3
3. Add localhost domain
4. Use the classic keys in your .env file

## 🎯 **What to Look For**

In the Google Cloud Console, you're looking for something like this:

```
Key Details
├── Key ID: 6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
├── Label: Website Key
├── Type: Website
├── Domains: 
│   ├── localhost          ← THIS IS WHAT YOU NEED
│   ├── 127.0.0.1         ← THIS TOO
│   ├── kdadks.com
│   └── www.kdadks.com
└── Integration Type: Score-based
```

The key issue is that `localhost` needs to be in the authorized domains list for your development environment to work.
