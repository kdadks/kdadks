require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Brevo SMTP Configuration
const BREVO_CONFIG = {
  SMTP_SERVER: 'smtp-relay.brevo.com',
  PORT: 587,
  USERNAME: '900018001@smtp-brevo.com',
  PASSWORD: process.env.BREVO_PASSWORD || '', // Set this in environment variables
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: BREVO_CONFIG.SMTP_SERVER,
    port: BREVO_CONFIG.PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: BREVO_CONFIG.USERNAME,
      pass: BREVO_CONFIG.PASSWORD,
    },
    tls: {
      rejectUnauthorized: false, // For development only
    }
  });
};

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, from, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !from || !subject || !text) {
      return res.status(400).json({ 
        message: 'Missing required fields: to, from, subject, text' 
      });
    }

    // Check if Brevo password is configured
    if (!BREVO_CONFIG.PASSWORD) {
      return res.status(500).json({ 
        message: 'Email service not configured. Please set BREVO_PASSWORD environment variable.' 
      });
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify connection
    await transporter.verify();
    console.log('SMTP connection verified successfully');

    // Mail options
    const mailOptions = {
      from: `"KDADKS Contact Form" <kdadks@outlook.com>`, // Use verified sender email
      to: to,
      replyTo: from, // Set the form submitter's email as reply-to
      subject: subject,
      text: text,
      html: html || text,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email sent successfully:', info.messageId);
    
    res.status(200).json({ 
      message: 'Email sent successfully',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Email sending failed:', error);
    
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Authentication failed. Please check email credentials.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Connection failed. Please check SMTP settings.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Email server is running',
    timestamp: new Date().toISOString(),
    smtpConfig: {
      server: BREVO_CONFIG.SMTP_SERVER,
      port: BREVO_CONFIG.PORT,
      username: BREVO_CONFIG.USERNAME,
      passwordConfigured: !!BREVO_CONFIG.PASSWORD,
      passwordValue: BREVO_CONFIG.PASSWORD ? 'Hidden for security' : 'Not set'
    }
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  const isConfigured = BREVO_CONFIG.PASSWORD && BREVO_CONFIG.PASSWORD !== 'test_password_replace_with_real_one';
  res.json({
    status: isConfigured ? 'Ready for production' : 'Needs real Brevo password',
    configured: isConfigured,
    message: isConfigured
      ? 'System is ready to send emails'
      : 'Please update BREVO_PASSWORD in .env file with your real Brevo SMTP password'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Email server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`SMTP Server: ${BREVO_CONFIG.SMTP_SERVER}:${BREVO_CONFIG.PORT}`);
  console.log(`SMTP Username: ${BREVO_CONFIG.USERNAME}`);
  console.log(`Password configured: ${BREVO_CONFIG.PASSWORD ? 'Yes' : 'No'}`);
});

module.exports = app;