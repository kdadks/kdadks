// Alternative Gmail SMTP configuration for immediate setup
// Replace the Hostinger SMTP configuration in send-email.js with this

// Alternative Email Setup Options
// Replace the Hostinger SMTP configuration in send-email.js with this

// Gmail SMTP Configuration (if you prefer Gmail over Hostinger)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Your Gmail address
    pass: 'your-app-password'     // Gmail App Password (not regular password)
  }
});

/* 
To use Gmail:
1. Enable 2FA on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Add these environment variables in Netlify:
   - GMAIL_USER: your-email@gmail.com
   - GMAIL_PASSWORD: your-16-character-app-password

4. Update the transporter config to use process.env.GMAIL_USER and process.env.GMAIL_PASSWORD
*/
