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

    // Debug: Log email content to see if URLs are present
    console.log('Email details:');
    console.log('- To:', to);
    console.log('- Subject:', subject);
    console.log('- HTML content length:', html ? html.length : 0);
    if (html && html.includes('paymentUrl')) {
      console.log('WARNING: HTML contains literal ${paymentUrl} - template not interpolated!');
    }
    if (html && html.includes('http')) {
      console.log('✓ HTML contains http URLs - likely interpolated correctly');
    }

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

    // Configure Brevo SMTP transporter with ORIGINAL working settings
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: '900018001@smtp-brevo.com',  // ORIGINAL working username
        pass: brevoPassword
      }
    });

    // Prepare email options with ORIGINAL working format
    const mailOptions = {
      from: from || 'support@kdadks.com',  // ORIGINAL working sender
      to: to,
      subject: subject,
      text: text,
      html: html
    };

    // Add attachment support
    if (attachments && Array.isArray(attachments)) {
      mailOptions.attachments = attachments.map(att => ({
        filename: att.filename || 'attachment.pdf',
        content: att.content,
        encoding: att.encoding || 'base64',
        contentType: att.type || 'application/pdf'
      }));
    } else if (attachment) {
      mailOptions.attachments = [{
        filename: attachment.filename || 'invoice.pdf',
        content: attachment.content,
        encoding: 'base64'
      }];
    }

    // Send email
    const info = await transporter.sendMail(mailOptions);

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId
      })
    };

  } catch (error) {
    console.error('Email sending failed:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send email',
        details: error.message
      })
    };
  }
};
