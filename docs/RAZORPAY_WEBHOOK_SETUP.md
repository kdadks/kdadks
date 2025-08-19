# Razorpay Webhook Setup Guide

## Setting up Razorpay Webhooks

To ensure payment status is captured in the database, you need to configure webhooks in your Razorpay dashboard.

### Step 1: Access Webhook Settings
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/)
2. Navigate to **Settings** > **Webhooks**
3. Click **+ Add Webhook**

### Step 2: Configure Webhook URL
**For Development:**
- URL: `https://your-netlify-site-url.netlify.app/.netlify/functions/payment-webhook/razorpay`
- Example: `https://kdadks.netlify.app/.netlify/functions/payment-webhook/razorpay`

**For Production:**
- URL: `https://kdadks.com/.netlify/functions/payment-webhook/razorpay`

### Step 3: Select Events
Select these essential events:
- ✅ `payment.captured` - When payment is successfully processed
- ✅ `payment.failed` - When payment fails
- ✅ `order.paid` - When order is fully paid
- ✅ `refund.created` - When refund is processed (optional)

### Step 4: Set Active Status
- Make sure the webhook is set to **Active**

### Step 5: Get Webhook Secret
1. After creating the webhook, copy the **Webhook Secret**
2. Update your database with this secret:

```sql
UPDATE payment_gateways 
SET settings = settings || '{"webhook_secret": "YOUR_ACTUAL_WEBHOOK_SECRET_HERE"}'
WHERE provider_type = 'razorpay';
```

### Step 6: Test Webhook
1. Make a test payment
2. Check the webhook logs in Razorpay dashboard
3. Verify that payment status is updated in your database

## Current Webhook Endpoints

Your application has these webhook endpoints ready:

### 1. Razorpay Webhook
- **URL**: `/.netlify/functions/payment-webhook/razorpay`
- **Method**: POST
- **Purpose**: Handles payment status updates from Razorpay

### 2. What the Webhook Does
1. **Verifies signature** using webhook secret
2. **Updates payment transaction** status in database
3. **Updates payment request** status 
4. **Sends confirmation email** to customer
5. **Logs webhook events** for debugging

## Troubleshooting

### If webhooks are not working:
1. **Check webhook URL** is accessible publicly
2. **Verify webhook secret** in database matches Razorpay
3. **Check webhook logs** in Razorpay dashboard for errors
4. **Test webhook manually** using tools like ngrok for local testing

### Common Issues:
- **Signature verification fails**: Wrong webhook secret
- **URL not accessible**: Netlify function not deployed
- **Database not updating**: RLS policies or authentication issues

## Alternative Solution
If webhooks are not immediately available, the application now also:
- **Sends email confirmation immediately** after successful payment
- **Can be manually updated** using payment verification APIs

This ensures customers get confirmation even if webhooks are delayed.
