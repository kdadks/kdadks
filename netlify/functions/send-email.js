const nodemailer = require('nodemailer');

// Brevo SMTP Configuration
const BREVO_CONFIG = {
  SMTP_SERVER: 'smtp-relay.brevo.com',
  PORT: 587,
  USERNAME: '900018001@smtp-brevo.com',
  PASSWORD: process.env.BREVO_PASSWORD || '', // Set this in Netlify environment variables
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

// Netlify function handler
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const { to, from, subject, text, html } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !from || !subject || !text) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Missing required fields: to, from, subject, text' }),
      };
    }

    // Check if Brevo password is configured
    if (!BREVO_CONFIG.PASSWORD) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Email service not configured. Please set BREVO_PASSWORD environment variable.' 
        }),
      };
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Email sent successfully',
        messageId: info.messageId 
      }),
    };

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

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }),
    };
  }
};