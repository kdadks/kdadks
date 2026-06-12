# Quick Setup: Password Expiry Email System

## ⚡ 5-Minute Production Setup

### Step 1: Add Environment Variables to Netlify

Go to: **Netlify Dashboard → Site Settings → Environment Variables**

Add these variables:

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_xxxxxxxxxxxx
SENDER_EMAIL=contact@kdadks.com
```

**Get Values**:
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard → Settings → API → Service Role (secret)
- `RESEND_API_KEY`: [resend.com](https://resend.com) → API Keys → Create
- `SENDER_EMAIL`: Resend → Domains → Add your domain and verify

### Step 2: Deploy to Netlify

```bash
git add .
git commit -m "Add password expiry email system"
git push origin main
```

Netlify will automatically deploy the scheduled function.

### Step 3: Verify Deployment

1. **Check Function Deployed**:
   - Netlify Dashboard → Functions
   - Look for `check-password-expiry`
   - Should show "Scheduled" status

2. **Check Schedule**:
   - Should show: `30 3 * * *` (daily at 9 AM IST)

3. **Test Manually**:
   ```bash
   netlify functions:invoke check-password-expiry
   ```

### Step 4: Test Email Sending

1. Go to Admin Dashboard → HR → Employees
2. Click Reset Password (🔑 key icon) for any employee
3. Check:
   - ✅ Employee receives email within 1 minute
   - ✅ Email has temporary password
   - ✅ Admin modal shows password

### Step 5: Monitor

- **Next Day**: Check Netlify Functions logs to verify scheduled run
- **Resend Dashboard**: Check email delivery statistics

## 📋 Verification Checklist

- [ ] Environment variables added to Netlify
- [ ] Code deployed to production
- [ ] Scheduled function visible in Netlify
- [ ] Test email sent successfully
- [ ] Employee received email
- [ ] Email renders correctly (check on mobile)
- [ ] Scheduled function executed next day

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Function not visible | Check Netlify Pro plan (required for scheduled functions) |
| Emails not sending | Verify Resend API key and sender email in Netlify |
| Employee email not received | Check spam folder, verify employee email address |
| Function errors | Check Netlify function logs for details |

## 🎯 Expected Behavior

### Daily Schedule (9 AM IST):
1. Function checks all active employees
2. Sends reminders at: 10, 7, 5, 3, 2, 1 days before expiry
3. Locks accounts with expired passwords (> 90 days)
4. Logs results in Netlify Functions dashboard

### When Admin Resets Password:
1. Temporary password generated
2. Email sent to employee immediately
3. Admin sees password in modal (backup)
4. Employee can login and change password

## 📧 Employee Experience

### Timeline:
- **Day 80**: First reminder email (10 days left)
- **Day 83**: Second reminder (7 days left)
- **Day 85**: Third reminder (5 days left)
- **Day 87**: Urgent reminder (3 days left) - RED alert
- **Day 88**: Urgent reminder (2 days left)
- **Day 89**: Final urgent reminder (tomorrow!)
- **Day 90**: Account locked, must contact admin

### If Locked:
1. Employee tries to login → "Password expired, contact admin"
2. Employee contacts admin/HR
3. Admin resets password → Email sent with new temporary password
4. Employee logs in → Required to change password immediately
5. Account unlocked, back to normal

---

**Need Help?** Check [PASSWORD_EXPIRY_EMAIL_SYSTEM.md](./PASSWORD_EXPIRY_EMAIL_SYSTEM.md) for detailed documentation.
