const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

// Function to verify reCAPTCHA Enterprise token
async function verifyRecaptcha(token) {
  const secretKey = process.env.VITE_RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('⚠️ reCAPTCHA Enterprise secret key not configured - skipping verification');
    return { success: true, bypass: true }; // Allow in development
  }

  if (!token) {
    return { success: false, error: 'reCAPTCHA token is required' };
  }

  try {
    // For Enterprise, use the enterprise endpoint
    const response = await fetch('https://recaptchaenterprise.googleapis.com/v1/projects/YOUR_PROJECT_ID/assessments?key=' + secretKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: {
          token: token,
          siteKey: process.env.VITE_RECAPTCHA_SITE_KEY,
          expectedAction: 'submit'
        }
      })
    });

    const data = await response.json();
    
    if (data.tokenProperties && data.tokenProperties.valid) {
      const score = data.riskAnalysis?.score || 0.5;
      console.log('✅ reCAPTCHA Enterprise verification successful, score:', score);
      
      // For Enterprise, you typically check the score (0.0 to 1.0)
      // Higher scores indicate lower risk
      if (score >= 0.3) { // Adjust threshold as needed
        return { success: true, score: score };
      } else {
        return { 
          success: false, 
          error: 'reCAPTCHA score too low - suspected bot activity',
          score: score
        };
      }
    } else {
      console.error('❌ reCAPTCHA Enterprise verification failed:', data);
      
      return { 
        success: false, 
        error: 'reCAPTCHA Enterprise verification failed',
        details: data.tokenProperties?.invalidReason || 'Unknown error'
      };
    }
  } catch (error) {
    console.error('🚨 reCAPTCHA Enterprise verification service error:', error);
    
    // Fallback to standard reCAPTCHA verification if Enterprise fails
    try {
      console.log('📋 Falling back to standard reCAPTCHA verification...');
      const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${secretKey}&response=${token}`
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Standard reCAPTCHA verification successful');
        return { success: true, score: data.score };
      } else {
        return { 
          success: false, 
          error: 'reCAPTCHA verification failed',
          details: data['error-codes']
        };
      }
    } catch (fallbackError) {
      console.error('🚨 Both Enterprise and standard reCAPTCHA verification failed:', fallbackError);
      return { 
        success: false, 
        error: 'reCAPTCHA verification service unavailable - please try again later' 
      };
    }
  }
}

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
    const { to, from, subject, text, html, recaptchaToken } = req.body;

    // Verify reCAPTCHA first
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      console.error('❌ reCAPTCHA verification failed:', recaptchaResult.error);
      res.status(400).json({ 
        error: recaptchaResult.error || 'reCAPTCHA verification failed',
        details: recaptchaResult.details
      });
      return;
    }

    if (recaptchaResult.bypass) {
      console.log('⚠️ reCAPTCHA verification bypassed for development');
    } else {
      console.log('✅ reCAPTCHA verification successful');
    }

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

    // Get Brevo SMTP password from environment
    const brevoPassword = process.env.BREVO_PASSWORD;
    if (!brevoPassword) {
      console.error('BREVO_PASSWORD environment variable is not set');
      res.status(500).json({ 
        error: 'Email service configuration error - BREVO_PASSWORD not set' 
      });
      return;
    }

    // Configure Brevo SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // TLS
      auth: {
        user: '900018001@smtp-brevo.com',
        pass: brevoPassword
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
      from: from || 'support@kdadks.com', // Default sender
      to: to,
      subject: subject,
      text: text,
      html: html,
      // Set reply-to if different from sender
      replyTo: from && from !== 'support@kdadks.com' ? from : undefined
    };

    // Add attachment support for invoice PDFs (if provided)
    if (req.body.attachment) {
      mailOptions.attachments = [{
        filename: req.body.attachment.filename || 'invoice.pdf',
        content: req.body.attachment.content,
        encoding: 'base64'
      }];
    }

    console.log('📧 [LOCAL DEV] Sending email via Brevo SMTP...');
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
