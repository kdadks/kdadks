// Netlify Scheduled Function - Check Password Expiry Daily
// Schedule: Run daily at 9:00 AM IST (3:30 AM UTC)
// Configure in netlify.toml: schedule = "30 3 * * *"

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Email service configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'hr@kdadks.com';

// Password expiry configuration
const PASSWORD_EXPIRY_DAYS = 90;
const REMINDER_INTERVALS = [10, 7, 5, 3, 2, 1]; // Send reminders at these many days before expiry

// Send email via Resend
async function sendEmail(to, subject, html, text) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `KDADKS HR Department <${SENDER_EMAIL}>`,
        to: [to],
        subject,
        html,
        text
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Resend API error: ${data.message || response.status}`);
    }

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
}

// Generate password expiry reminder email
function generateExpiryEmail(employeeName, daysUntilExpiry, urgency) {
  const subject = urgency 
    ? `🚨 URGENT: Your Password Expires in ${daysUntilExpiry} Day${daysUntilExpiry === 1 ? '' : 's'}!`
    : `⚠️ Reminder: Your Password Expires in ${daysUntilExpiry} Days`;

  const textEmail = `
Dear ${employeeName},

${urgency ? '🚨 URGENT SECURITY NOTICE' : '⚠️ PASSWORD EXPIRY REMINDER'}

Your password ${daysUntilExpiry === 1 ? 'expires TOMORROW' : `expires in ${daysUntilExpiry} days`}!

For security compliance, all employee passwords must be changed every 90 days.

WHAT HAPPENS IF YOU DON'T CHANGE IT:
${urgency ? '⚠️ Your account will be LOCKED and you will not be able to access the employee portal.' : '• Your account will be locked after expiry\n• You will lose access to the employee portal\n• An administrator will need to reset your password'}

HOW TO CHANGE YOUR PASSWORD NOW:
1. Go to: https://kdadks.com/employee/login
2. Log in with your current password
3. Click on "Change Password" in your profile
4. Create a new strong password

PASSWORD REQUIREMENTS:
• At least 8 characters long
• Must contain uppercase letters (A-Z)
• Must contain lowercase letters (a-z)
• Must contain numbers (0-9)
• Must contain special characters (!@#$%^&*)

Please change your password immediately to avoid account lockout.

If you need assistance, contact HR at hr@kdadks.com or call +91 7982303199.

Best regards,
HR Department
KDADKS Service Private Limited
  `.trim();

  const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; color: #1f2937; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
        .header { background: ${urgency ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #f59e0b, #d97706)'}; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 40px 30px; }
        .countdown { text-align: center; font-size: 48px; font-weight: bold; color: ${urgency ? '#dc2626' : '#f59e0b'}; margin: 20px 0; padding: 20px; background: ${urgency ? '#fef2f2' : '#fffbeb'}; border-radius: 8px; }
        .alert-box { background: ${urgency ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${urgency ? '#dc2626' : '#f59e0b'}; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .alert-box h2 { margin: 0 0 10px 0; color: ${urgency ? '#991b1b' : '#92400e'}; font-size: 20px; }
        .alert-box p { margin: 0; color: ${urgency ? '#7f1d1d' : '#78350f'}; line-height: 1.5; }
        .instructions { background: #f8fafc; border-radius: 8px; padding: 25px; margin: 25px 0; }
        .instructions h3 { margin: 0 0 15px 0; color: #1f2937; }
        .instructions ol { margin: 0; padding-left: 20px; color: #4b5563; }
        .instructions li { margin: 8px 0; line-height: 1.6; }
        .requirements { background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .requirements h3 { margin: 0 0 12px 0; color: #065f46; }
        .requirements ul { margin: 0; padding-left: 20px; color: #064e3b; }
        .requirements li { margin: 6px 0; }
        .cta-button { text-align: center; margin: 30px 0; }
        .cta-button a { display: inline-block; background: ${urgency ? '#dc2626' : '#2563eb'}; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; }
        .warning { background: #fef2f2; border: 2px solid #fca5a5; border-radius: 8px; padding: 15px; margin: 20px 0; color: #991b1b; font-weight: 500; }
        .footer { background: #f9fafb; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">${urgency ? '🚨' : '⚠️'}</div>
            <h1>${urgency ? 'URGENT' : ''} Password Expiry Notice</h1>
            <p>Security Compliance Required</p>
        </div>
        <div class="content">
            <p style="font-size: 18px; color: #374151;">Dear ${employeeName},</p>
            <div class="alert-box">
                <h2>${urgency ? '🚨 IMMEDIATE ACTION REQUIRED' : '⚠️ Password Expiry Reminder'}</h2>
                <p>Your employee portal password is about to expire. You must change it to maintain access.</p>
            </div>
            <div class="countdown">${daysUntilExpiry === 1 ? 'EXPIRES<br>TOMORROW' : `${daysUntilExpiry}<br>DAYS LEFT`}</div>
            ${urgency ? '<div class="warning"><strong>⚠️ Warning:</strong> If you don\'t change your password before it expires, your account will be <strong>LOCKED</strong>.</div>' : ''}
            <div class="instructions">
                <h3>📝 How to Change Your Password</h3>
                <ol>
                    <li>Go to: <a href="https://kdadks.com/employee/login">kdadks.com/employee/login</a></li>
                    <li>Log in with your current credentials</li>
                    <li>Navigate to your profile and click "Change Password"</li>
                    <li>Create a new strong password</li>
                </ol>
            </div>
            <div class="requirements">
                <h3>🔒 Password Requirements</h3>
                <ul>
                    <li>At least <strong>8 characters</strong> long</li>
                    <li><strong>Uppercase</strong> letters (A-Z)</li>
                    <li><strong>Lowercase</strong> letters (a-z)</li>
                    <li><strong>Numbers</strong> (0-9)</li>
                    <li><strong>Special characters</strong> (!@#$%^&*)</li>
                </ul>
            </div>
            <div class="cta-button">
                <a href="https://kdadks.com/employee/login">🔐 Change Password Now</a>
            </div>
            <p style="color: #4b5563;">Need help? Contact HR at <a href="mailto:hr@kdadks.com">hr@kdadks.com</a> or call +91 7982303199</p>
        </div>
        <div class="footer">
            <p><strong>KDADKS Service Private Limited</strong></p>
            <p>This is an automated security notification.</p>
        </div>
    </div>
</body>
</html>
  `.trim();

  return { subject, text: textEmail, html: htmlEmail };
}

// Main handler for scheduled function
exports.handler = async (event, context) => {
  console.log('🔐 Starting password expiry check...');
  
  try {
    // Verify required environment variables
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!RESEND_API_KEY) {
      throw new Error('Missing Resend API key');
    }

    // Fetch all active employees with password information
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, name, email, password_changed_at, employment_status, account_locked')
      .eq('employment_status', 'active')
      .eq('account_locked', false)
      .not('password_changed_at', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch employees: ${fetchError.message}`);
    }

    console.log(`📊 Found ${employees?.length || 0} active employees to check`);

    const results = {
      checked: 0,
      sent: 0,
      expired: 0,
      skipped: 0,
      errors: []
    };

    const now = new Date();

    for (const employee of employees || []) {
      results.checked++;

      try {
        const passwordChangedDate = new Date(employee.password_changed_at);
        const daysSinceChange = Math.floor((now - passwordChangedDate) / (1000 * 60 * 60 * 24));
        const daysUntilExpiry = PASSWORD_EXPIRY_DAYS - daysSinceChange;

        // Check if password has already expired
        if (daysUntilExpiry <= 0) {
          console.log(`⚠️ Employee ${employee.name} (${employee.email}) - Password already expired (${Math.abs(daysUntilExpiry)} days ago)`);
          results.expired++;
          
          // Lock the account if not already locked
          await supabase
            .from('employees')
            .update({ account_locked: true })
            .eq('id', employee.id);
          
          continue;
        }

        // Check if we should send a reminder today
        const shouldSendReminder = REMINDER_INTERVALS.includes(daysUntilExpiry);

        if (shouldSendReminder) {
          console.log(`📧 Sending reminder to ${employee.name} (${employee.email}) - ${daysUntilExpiry} days until expiry`);
          
          const urgency = daysUntilExpiry <= 3;
          const emailContent = generateExpiryEmail(employee.name, daysUntilExpiry, urgency);
          
          await sendEmail(
            employee.email,
            emailContent.subject,
            emailContent.html,
            emailContent.text
          );

          results.sent++;
          console.log(`✅ Reminder sent successfully to ${employee.email}`);
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`❌ Error processing employee ${employee.email}:`, error);
        results.errors.push({
          employee: employee.email,
          error: error.message
        });
      }
    }

    console.log('📊 Password expiry check completed:', results);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Password expiry check completed',
        results
      })
    };

  } catch (error) {
    console.error('❌ Password expiry check failed:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
