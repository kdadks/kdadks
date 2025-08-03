const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight check' })
    };
  }

  // Only allow POST method
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { to, from, subject, text, html, attachments, attachment } = body;

    console.log('📧 Netlify function called');
    console.log('Event method:', event.httpMethod);
    console.log('Event headers:', JSON.stringify(event.headers, null, 2));
    console.log('Request body keys:', Object.keys(body || {}));
    console.log('To:', to);
    console.log('Subject:', subject);

    // Validate required fields
    if (!to || !subject || (!text && !html)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: to, subject, and text/html are required' 
        })
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid email address format' 
        })
      };
    }

    // Get Brevo SMTP password from environment
    const brevoPassword = process.env.BREVO_PASSWORD;
    if (!brevoPassword) {
      console.error('BREVO_PASSWORD environment variable is not set');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Email service configuration error' 
        })
      };
    }

    // Configure Brevo SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: 'kdadks@9437208.brevosend.com', // Original working configuration
        pass: brevoPassword
      },
      // Additional options for better reliability
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      rateDelta: 1000,
      rateLimit: 5
    });

    // Prepare email options with Brevo-compliant sender format
    // Note: Use the original working configuration that sends from support@kdadks.com
    const mailOptions = {
      from: from || 'support@kdadks.com', // Use the working production format
      replyTo: 'support@kdadks.com',
      to: to,
      subject: subject,
      text: text,
      html: html
    };

    // Add attachment support for invoice PDFs (new array format and legacy single attachment)
    if (attachments && Array.isArray(attachments)) {
      // New array format for multiple attachments
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename || 'attachment.pdf',
        content: att.content,
        encoding: att.encoding || 'base64',
        contentType: att.type || 'application/pdf'
      }));
    } else if (attachment) {
      // Legacy single attachment format (backward compatibility)
      mailOptions.attachments = [{
        filename: attachment.filename || 'invoice.pdf',
        content: attachment.content,
        encoding: 'base64'
      }];
    }

    console.log('Sending email via Brevo SMTP...');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('From:', mailOptions.from);

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully:', info.messageId);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
        envelope: info.envelope
      })
    };

  } catch (error) {
    console.error('Email sending failed:', error);

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

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
