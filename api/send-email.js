const nodemailer = require('nodemailer');

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

// Main handler function
const handler = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    const { to, from, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !from || !subject || !text) {
      res.status(400).json({ message: 'Missing required fields: to, from, subject, text' });
      return;
    }

    // Check if Brevo password is configured
    if (!BREVO_CONFIG.PASSWORD) {
      res.status(500).json({ 
        message: 'Email service not configured. Please set BREVO_PASSWORD environment variable.' 
      });
      return;
    }

    // Create transporter
    const transporter = createTransporter();

    // Verify connection
    await transporter.verify();

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
};

// Export for different deployment platforms
module.exports = handler;

// For Vercel
module.exports.default = handler;

// For Netlify Functions
exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
    body: event.body ? JSON.parse(event.body) : {},
  };
  
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader: function(name, value) {
      this.headers[name] = value;
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.body = JSON.stringify(data);
      return this;
    },
    end: function() {
      return this;
    }
  };

  await handler(req, res);
  
  return {
    statusCode: res.statusCode,
    headers: res.headers,
    body: res.body,
  };
};