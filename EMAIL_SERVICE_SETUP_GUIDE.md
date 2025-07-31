# EMAIL SERVICE SETUP AND TESTING GUIDE

## The Issue
You're getting a 404 error because the email service endpoint doesn't exist. I've now created both local development and production email services.

## What I've Created

### 1. Local Development Email Service
- **File**: `server.js` - Local Express server running on port 3001
- **File**: `api/send-email.js` - Local email API endpoint
- **Endpoint**: `http://localhost:3001/api/send-email`

### 2. Production Email Service  
- **File**: `netlify/functions/send-email.js` - Netlify serverless function
- **Endpoint**: `https://your-site.netlify.app/.netlify/functions/send-email`

### 3. Smart Endpoint Detection
Updated `InvoiceManagement.tsx` to automatically use:
- Local endpoint when testing on localhost
- Netlify function when deployed to production

## Setup Instructions

### Step 1: Configure Brevo Password
Edit your `.env` file and replace the placeholder with your actual Brevo SMTP password:

```bash
# Replace this line in .env:
BREVO_PASSWORD=your_actual_brevo_smtp_password_here

# With your actual password:
BREVO_PASSWORD=your_real_brevo_password_from_dashboard
```

### Step 2: Start Local Development
You now have multiple options:

**Option A: Full Development (Recommended)**
```bash
npm run dev:full
```
This starts both the Vite dev server (port 3000) AND the email server (port 3001)

**Option B: Just the Email Server**
```bash
npm run dev:email
```

**Option C: Traditional Development**
```bash
npm run dev
# Plus in another terminal:
npm run dev:email
```

### Step 3: Test Email Functionality
1. Open your website at `http://localhost:3000`
2. Navigate to the admin panel
3. Try sending an invoice email
4. The system will automatically use the local email server

## Troubleshooting

### If you get 404 errors:
1. Make sure the email server is running (`npm run dev:email`)
2. Check that you see: "🚀 KDADKS Email Service running on http://localhost:3001"
3. Test the health endpoint: `http://localhost:3001/health`

### If you get authentication errors:
1. Check your `.env` file has the correct BREVO_PASSWORD
2. Verify your Brevo account is active
3. Check the server console for detailed error messages

### If emails aren't sending:
1. Check server console for error details
2. Verify internet connection for SMTP
3. Test with a simple email first

## Testing Commands

### Health Check
```bash
curl http://localhost:3001/health
```

### Test Email Sending
```bash
curl -X POST http://localhost:3001/api/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email"
  }'
```

## For Production Deployment

When you deploy to Netlify:
1. The Netlify function will automatically be used
2. Add BREVO_PASSWORD to your Netlify environment variables
3. The system will automatically detect it's in production

## Next Steps

1. **Configure your Brevo password** in the `.env` file
2. **Start the full development environment**: `npm run dev:full`
3. **Test the invoice email functionality**
4. **Deploy to Netlify** when ready for production

The 404 error should now be completely resolved!
