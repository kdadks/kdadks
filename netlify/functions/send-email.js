const nodemailer = require('nodemailer');

// Import Google Cloud reCAPTCHA Enterprise (optional in serverless environment)
let RecaptchaEnterpriseServiceClient;
try {
  const recaptcha = require('@google-cloud/recaptcha-enterprise');
  RecaptchaEnterpriseServiceClient = recaptcha.RecaptchaEnterpriseServiceClient;
} catch (error) {
  console.log('reCAPTCHA Enterprise not available (install @google-cloud/recaptcha-enterprise if needed)');
}

// Verify reCAPTCHA Enterprise token
async function verifyRecaptcha(token, action, expectedAction) {
  if (!RecaptchaEnterpriseServiceClient) {
    console.log('⚠️ reCAPTCHA Enterprise not available, skipping verification');
    return { success: true, score: 0.9, reason: 'Library not available' };
  }

  try {
    const client = new RecaptchaEnterpriseServiceClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'kdadks-service-p-1755602644470'
    });
    
    const projectPath = client.projectPath(process.env.GOOGLE_CLOUD_PROJECT_ID || 'kdadks-service-p-1755602644470');
    
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: process.env.VITE_RECAPTCHA_SITE_KEY || '6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r',
          expectedAction: expectedAction || action
        },
      },
      parent: projectPath,
    };

    const [response] = await client.createAssessment(request);
    
    const score = response.riskAnalysis.score;
    console.log(`✅ reCAPTCHA Enterprise verification successful, score: ${score}`);
    
    return {
      success: response.tokenProperties.valid && score >= 0.5,
      score: score,
      reason: response.tokenProperties.invalidReason || 'Valid'
    };
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error);
    return {
      success: false,
      score: 0,
      reason: error.message
    };
  }
}

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
    const { to, from, subject, text, html, attachments, attachment, recaptchaToken, recaptchaAction } = body;

    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      console.log('🔍 Verifying reCAPTCHA token...');
      const verification = await verifyRecaptcha(recaptchaToken, recaptchaAction, recaptchaAction);
      
      if (!verification.success) {
        console.error('❌ reCAPTCHA verification failed:', verification.reason);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'reCAPTCHA verification failed',
            details: verification.reason
          })
        };
      }
      
      console.log(`✅ reCAPTCHA verified successfully (score: ${verification.score})`);
    }

    // Debug: Log email content to see if URLs are present
    console.log('=== EMAIL CONTENT ANALYSIS ===');
    console.log('- To:', to);
    console.log('- Subject:', subject);
    console.log('- HTML content length:', html ? html.length : 0);
    
    let debugInfo = {
      hasLiteralPlaceholder: false,
      hasHttpUrls: false,
      buttonHtml: '',
      fallbackHtml: ''
    };

    if (html) {
      // Check for literal template placeholders
      if (html.includes('${paymentUrl}')) {
        console.log('❌ WARNING: HTML contains literal ${paymentUrl} - template not interpolated!');
        debugInfo.hasLiteralPlaceholder = true;
      }
      
      // Check for actual HTTP URLs
      if (html.includes('http')) {
        console.log('✅ HTML contains http URLs - likely interpolated correctly');
        debugInfo.hasHttpUrls = true;
      }
      
      // Extract button HTML for debugging
      const buttonStart = html.indexOf('<a href=');
      if (buttonStart !== -1) {
        const buttonEnd = html.indexOf('</a>', buttonStart) + 4;
        debugInfo.buttonHtml = html.substring(buttonStart, buttonEnd);
        console.log('🔘 Button HTML:', debugInfo.buttonHtml);
      }
      
      // Extract fallback section for debugging
      const fallbackStart = html.indexOf('Alternative Payment Link');
      if (fallbackStart !== -1) {
        const fallbackEnd = html.indexOf('</div>', fallbackStart + 300) + 6;
        debugInfo.fallbackHtml = html.substring(fallbackStart, Math.min(fallbackEnd, fallbackStart + 500));
        console.log('🔄 Fallback section:', debugInfo.fallbackHtml);
      }
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

    // Return success response with debugging info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        messageId: info.messageId,
        recaptchaScore: recaptchaToken ? verification?.score : undefined,
        debug: debugInfo // Include debugging information
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
