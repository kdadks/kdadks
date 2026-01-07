# 🚀 Production Deployment Guide for reCAPTCHA Enterprise

## 📋 Overview
This guide covers deploying the KDADKS website with Google Cloud reCAPTCHA Enterprise integration to production environments.

## 🔧 Prerequisites
- Google Cloud Account with reCAPTCHA Enterprise API enabled
- reCAPTCHA Enterprise site key configured with production domains
- Service account with reCAPTCHA Enterprise Admin permissions

## 📁 File Structure
```
kdadks/
├── etc/
│   └── credentials/
│       └── google-service-account.json    # Service account credentials
├── .env.production                        # Production environment variables
└── ...
```

## 🌐 Environment Configuration

### Production Environment Variables
The production environment uses these key variables:

```bash
# Google Cloud reCAPTCHA Enterprise
GOOGLE_APPLICATION_CREDENTIALS=./etc/credentials/google-service-account.json
GOOGLE_CLOUD_API_KEY=AIzaSyBGnC4n3hZefogU0nh6S-7FAGAeSbEuAM8
VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
NODE_ENV=production
RECAPTCHA_DEVELOPMENT_BYPASS=false

# Other configurations...
```

## 🔐 Security Setup

### 1. Google Cloud Service Account
- **Location**: `etc/credentials/google-service-account.json`
- **Permissions**: reCAPTCHA Enterprise Admin
- **Project**: kdadks-service-p-1755602644470

### 2. Site Key Configuration
- **Site Key**: 6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
- **Type**: reCAPTCHA Enterprise v3 (Score-based)
- **Domains**: Must include your production domain and localhost for testing

### 3. Authorized Domains
Make sure your reCAPTCHA Enterprise key includes:
- `localhost` (for development)
- `your-production-domain.com`
- Any staging domains

## 🚀 Deployment Options

### Option 1: Netlify Deployment
1. **Environment Variables** in Netlify Dashboard:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./etc/credentials/google-service-account.json
   GOOGLE_CLOUD_API_KEY=AIzaSyBGnC4n3hZefogU0nh6S-7FAGAeSbEuAM8
   VITE_RECAPTCHA_SITE_KEY=6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r
   NODE_ENV=production
   RECAPTCHA_DEVELOPMENT_BYPASS=false
   ```

2. **File Upload**: Upload `google-service-account.json` to `etc/credentials/` in your repository

3. **Build Command**: `npm run build`

4. **Publish Directory**: `dist`

### Option 2: Manual Server Deployment
1. Copy all project files to server
2. Install dependencies: `npm install`
3. Copy service account JSON to `etc/credentials/`
4. Set environment variables or use `.env.production`
5. Build: `npm run build`
6. Serve the `dist` directory

### Option 3: Docker Deployment
Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 🧪 Testing Production Setup

### Local Production Testing
```bash
# Use production environment
cp .env.production .env

# Start backend in production mode
NODE_ENV=production node dev-server.cjs

# Start frontend
npm run dev

# Test reCAPTCHA forms
# Check console for successful token generation
```

### Verification Checklist
- [ ] reCAPTCHA script loads with site key parameter
- [ ] Forms generate tokens without "Invalid site key" errors
- [ ] Backend receives and validates tokens with Google Cloud
- [ ] Email notifications work properly
- [ ] No console errors related to reCAPTCHA

## 🔍 Troubleshooting

### Common Issues

**1. Invalid Site Key Errors**
- Verify site key is correct in environment variables
- Check authorized domains in Google Cloud Console
- Ensure script loads with `?render=SITE_KEY` parameter

**2. Credential Path Issues**
- Use relative path: `./etc/credentials/google-service-account.json`
- Verify file exists and has correct permissions
- Check Google Cloud API is enabled

**3. CORS Issues**
- Add production domain to reCAPTCHA Enterprise authorized domains
- Configure any reverse proxy or CDN settings

**4. Environment Variables**
- Verify all required variables are set
- Check if deployment platform requires special syntax
- Ensure no quotes around environment variable values

## 📊 Monitoring & Analytics

### Google Cloud Console
- Monitor reCAPTCHA Enterprise usage
- Check assessment analytics
- Review potential security threats

### Application Logs
- Frontend: Browser console for reCAPTCHA errors
- Backend: Server logs for assessment results
- Network: Check API calls to Google Cloud

## 🔄 Updates & Maintenance

### Updating Credentials
1. Generate new service account key in Google Cloud
2. Replace `etc/credentials/google-service-account.json`
3. Redeploy application

### Rotating Site Keys
1. Create new reCAPTCHA Enterprise key
2. Update `VITE_RECAPTCHA_SITE_KEY` environment variable
3. Update HTML script tag if needed
4. Redeploy application

## 📞 Support

For issues with this setup:
1. Check Google Cloud reCAPTCHA Enterprise documentation
2. Verify all environment variables and file paths
3. Test locally before deploying to production
4. Monitor console logs for detailed error messages

---

**Production Status**: ✅ Ready for deployment
**Last Updated**: August 19, 2025
**reCAPTCHA Enterprise**: Fully integrated and tested
