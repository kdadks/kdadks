const nodemailer = require('nodemailer');

// For local development - this will be used when running on localhost:3001
module.exports = async (req, res) => {
  // Enable CORS for local development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).json({ message: 'CORS preflight check' });
    return;
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { to, from, subject, text, html } = req.body;

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      res.status(400).json({ 
        error: 'Missing required fields: to, subject, and text/html are required' 
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      res.status(400).json({ 
        error: 'Invalid email address format' 
      });
      return;
    }

    // Get Hostinger SMTP credentials from environment
    const hostingerUser = process.env.HOSTINGER_SMTP_USER;
    const hostingerPassword = process.env.HOSTINGER_SMTP_PASSWORD;
    
    if (!hostingerUser || !hostingerPassword) {
      console.error('HOSTINGER_SMTP_USER or HOSTINGER_SMTP_PASSWORD environment variable is not set');
      res.status(500).json({ 
        error: 'Email service configuration error - Hostinger SMTP credentials not set' 
      });
      return;
    }

    // Configure Hostinger SMTP transporter
    const transporter = nodemailer.createTransporter({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: hostingerUser,
        pass: hostingerPassword
      },
      // Additional options for better reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      rateDelta: 1000,
      rateLimit: 5
    });

    // Prepare email options
    const mailOptions = {
      from: '"KDADKS Service Private Limited" <support@kdadks.com>', // Official sender
      to: to,
      subject: subject,
      text: text,
      html: html,
      // Set reply-to if different from sender
      replyTo: from || undefined
    };

    // Add attachment support for invoice PDFs (if provided)
    if (req.body.attachment) {
      mailOptions.attachments = [{
        filename: req.body.attachment.filename || 'invoice.pdf',
        content: req.body.attachment.content,
        encoding: 'base64'
      }];
    }

    console.log('📧 [LOCAL DEV] Sending email via Hostinger SMTP...');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', mailOptions.from);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ [LOCAL DEV] Email sent successfully:', info.messageId);

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId,
      envelope: info.envelope
    });

  } catch (error) {
    console.error('❌ [LOCAL DEV] Email sending failed:', error);

    // Handle specific SMTP errors
    let errorMessage = 'Failed to send email';
    let statusCode = 500;

    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed - please check SMTP credentials';
      statusCode = 401;
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Failed to connect to email server';
      statusCode = 503;
    } else if (error.code === 'EMESSAGE') {
      errorMessage = 'Invalid email message format';
      statusCode = 400;
    } else if (error.responseCode === 550) {
      errorMessage = 'Email address rejected by recipient server';
      statusCode = 400;
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(statusCode).json({
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
