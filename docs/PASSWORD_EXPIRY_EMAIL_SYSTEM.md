# Password Expiry Email System - Implementation Guide

## 📧 Overview

Automated email reminder system to notify employees about password expiry **BEFORE** their accounts get locked. This prevents the issue where employees only discover their expired passwords when trying to login.

## 🎯 Problem Solved

**Before**: Employees weren't getting email reminders → Passwords expired → Accounts locked → Employees couldn't access portal

**After**: Employees receive timely email reminders → Can change password proactively → No account lockouts → Smooth user experience

## 🚀 Features Implemented

### 1. Password Expiry Email Service

**File**: `src/services/emailService.ts`

Added two new email methods:

#### `sendPasswordExpiryReminder()`
- Sends reminder emails to employees about upcoming password expiry
- Two urgency levels:
  - **Normal** (10-4 days before): Yellow theme, friendly reminder
  - **Urgent** (3-1 days before): Red theme, urgent warning
- Professional HTML email template with:
  - Countdown display
  - Step-by-step instructions
  - Password requirements checklist
  - Direct link to portal

#### `sendPasswordResetNotification()`
- Sends email when admin resets an employee's password
- Contains the temporary password
- Security instructions
- First-time login guidance

### 2. Scheduled Function for Daily Checks

**File**: `netlify/functions/check-password-expiry.js`

Automated Netlify scheduled function that:
- **Runs**: Daily at 9:00 AM IST (3:30 AM UTC)
- **Checks**: All active employees' password ages
- **Sends reminders at**: 10, 7, 5, 3, 2, 1 days before expiry
- **Auto-locks**: Accounts with expired passwords (> 90 days)
- **Reports**: Daily execution statistics

**Configuration**: `netlify.toml`
```toml
[functions."check-password-expiry"]
  schedule = "30 3 * * *"
```

### 3. Admin Password Reset with Email

**File**: `src/components/hr/EmploymentDocuments.tsx`

Updated two locations:

**a) New Employee Creation** (Line ~370)
- Generates temporary password
- **Sends email automatically** to new employee
- Shows password to admin as backup

**b) Password Reset Button** (Line ~2300)
- Admin clicks "Reset Password" button
- **Sends email automatically** to employee
- Shows password to admin as backup

## 📋 Email Schedule

| Days Before Expiry | Email Sent | Urgency Level |
|--------------------|------------|---------------|
| 10 days            | ✅ Yes     | Normal        |
| 7 days             | ✅ Yes     | Normal        |
| 5 days             | ✅ Yes     | Normal        |
| 3 days             | ✅ Yes     | **Urgent**    |
| 2 days             | ✅ Yes     | **Urgent**    |
| 1 day (tomorrow)   | ✅ Yes     | **Urgent**    |
| 0 days (expired)   | 🔒 Account Locked |         |

## 🛠️ Setup Instructions

### 1. Environment Variables

Add to Netlify environment variables:

```bash
# Required for scheduled function
VITE_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Required for sending emails
RESEND_API_KEY=your_resend_api_key_here
SENDER_EMAIL=hr@kdadks.com  # Or your verified domain
```

**Where to get**:
- **Supabase Service Role Key**: Supabase Dashboard → Settings → API → `service_role` key (secret)
- **Resend API Key**: [resend.com](https://resend.com) → API Keys
- **Sender Email**: Must be verified in Resend dashboard

### 2. Deploy to Netlify

The scheduled function will automatically deploy with your next build.

**Verify deployment**:
1. Go to Netlify Dashboard → Functions
2. You should see `check-password-expiry` function
3. Check "Scheduled functions" section
4. Verify schedule: `30 3 * * *` (daily at 3:30 AM UTC)

### 3. Manual Testing (Optional)

Test the scheduled function manually:

```bash
# Using Netlify CLI
netlify functions:invoke check-password-expiry

# Or via HTTP (if deployed)
curl -X POST https://your-site.netlify.app/.netlify/functions/check-password-expiry
```

### 4. Test Email Sending

**Test Password Reset Email**:
1. Go to Admin → HR → Employees
2. Click the "Reset Password" (Key icon) button for any employee
3. Employee should receive email immediately
4. Check Netlify Functions logs for confirmation

**Test Expiry Reminder** (manual trigger):
```javascript
// In browser console on admin page
const { EmailService } = await import('./src/services/emailService.ts');
await EmailService.sendPasswordExpiryReminder(
  'employee@example.com',
  'Employee Name',
  7  // days until expiry
);
```

## 📊 Monitoring

### Check Function Execution

**Netlify Dashboard → Functions → check-password-expiry**
- View execution logs
- Check for errors
- See email send statistics

### Console Output Format

```
🔐 Starting password expiry check...
📊 Found 42 active employees to check
📧 Sending reminder to John Doe (john@example.com) - 7 days until expiry
✅ Reminder sent successfully to john@example.com
⚠️ Employee Jane Smith (jane@example.com) - Password already expired (2 days ago)
📊 Password expiry check completed: {
  checked: 42,
  sent: 8,
  expired: 2,
  skipped: 32,
  errors: []
}
```

## 🔒 Security Features

1. **Sensitive Data Protection**:
   - Temporary passwords sent via email (encrypted in transit)
   - Passwords also shown to admin as backup
   - Passwords must be changed on first login

2. **Auto-Lockout**:
   - Expired accounts automatically locked
   - Cannot login until admin resets password

3. **Service Role Key**:
   - Scheduled function uses Supabase service role key
   - Bypasses RLS for admin operations
   - Stored securely in Netlify environment variables

## 📧 Email Templates

### Password Expiry Reminder

**Subject**: 
- Normal: `⚠️ Reminder: Your Password Expires in X Days`
- Urgent: `🚨 URGENT: Your Password Expires in X Days!`

**Content**:
- Countdown timer (visual display)
- Warning about account lockout
- Step-by-step password change instructions
- Password requirements checklist
- Direct link to employee portal
- HR contact information

**Design**: Professional, branded, mobile-responsive

### Password Reset Notification

**Subject**: `🔐 Your Password Has Been Reset - KDADKS`

**Content**:
- Temporary password (displayed prominently)
- Security instructions
- Login instructions
- First-time login guidance
- Password requirements
- HR contact for security concerns

## 🔧 Troubleshooting

### Emails Not Sending

**Check**:
1. Resend API key is valid
2. Sender email is verified in Resend
3. Employee email addresses are valid
4. Netlify environment variables are set
5. Check Netlify function logs for errors

**Common Issues**:
- `Missing Resend API key` → Add `RESEND_API_KEY` to Netlify
- `Resend API error: 403` → Verify sender domain in Resend
- `Employee not found` → Check employee status is 'active'

### Scheduled Function Not Running

**Check**:
1. Netlify site has scheduled functions enabled (Pro plan)
2. Function is deployed (check Netlify Functions dashboard)
3. Schedule is correct in `netlify.toml`
4. No errors in function logs

**Note**: Netlify scheduled functions require **Netlify Pro plan** or higher.

### Employee Not Receiving Emails

**Check**:
1. Employee email is correct in database
2. Check spam/junk folder
3. Resend dashboard → Logs → Check delivery status
4. Employee status is 'active' and not 'account_locked'

## 🎯 Testing Checklist

### Before Production

- [ ] Environment variables set in Netlify
- [ ] Scheduled function deployed and visible
- [ ] Test password reset email (create new employee)
- [ ] Test password reset email (reset existing employee)
- [ ] Check email delivery in Resend logs
- [ ] Verify email content and formatting
- [ ] Test on mobile devices (email responsive)
- [ ] Verify scheduled function runs (check logs next day)
- [ ] Test with expired password (should lock account)
- [ ] Verify admin can unlock via password reset

### Production Monitoring

- [ ] Daily: Check scheduled function execution logs
- [ ] Weekly: Review email delivery rates in Resend
- [ ] Monthly: Review employee feedback on email reminders
- [ ] Monitor: Account lockout rates (should decrease)

## 📝 Database Schema

No changes required. Uses existing fields:

```sql
-- employees table (existing)
password_changed_at     TIMESTAMPTZ  -- Used to calculate expiry
account_locked          BOOLEAN      -- Set to TRUE when expired
employment_status       TEXT         -- Only 'active' employees checked
email                   TEXT         -- Where to send notifications
```

## 🔄 Password Expiry Logic

```
Days Since Password Change = Today - password_changed_at
Days Until Expiry = 90 - Days Since Password Change

IF Days Until Expiry <= 0:
  → Lock account
  → Deny login
  → Require admin password reset

IF Days Until Expiry IN [10, 7, 5, 3, 2, 1]:
  → Send reminder email

IF Days Until Expiry <= 3:
  → Use urgent email template
```

## 📞 Support

If employees are not receiving emails:

1. **Immediate**: Admin can reset password manually (includes email)
2. **Communication**: Inform employees via alternate channels (SMS, Slack, etc.)
3. **Verification**: Check Resend dashboard for failed deliveries
4. **Escalation**: Contact support@resend.com for delivery issues

## 🎉 Benefits

✅ **Proactive**: Employees notified before problems occur
✅ **Automated**: Zero manual intervention required
✅ **Reliable**: Daily scheduled checks
✅ **Professional**: Branded, well-designed emails
✅ **Compliant**: Meets 90-day password policy requirement
✅ **User-Friendly**: Clear instructions and direct links

## 📚 Related Files

- `src/services/emailService.ts` - Email templates and sending logic
- `netlify/functions/check-password-expiry.js` - Scheduled function
- `src/components/hr/EmploymentDocuments.tsx` - Admin password reset
- `src/services/employeeAuthService.ts` - Password management
- `netlify.toml` - Scheduled function configuration
- `.env.example` - Environment variable reference

---

**Last Updated**: 2026-06-08
**Status**: ✅ Ready for Production
