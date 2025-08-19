const nodemailer = require('nodemailer');
const fetch = require('node-fetch');
const {RecaptchaEnterpriseServiceClient} = require('@google-cloud/recaptcha-enterprise');

/**
  * Create an assessment to analyze the risk of a UI action.
  *
  * projectID: Your Google Cloud Project ID.
  * recaptchaSiteKey: The reCAPTCHA key associated with the site/app
  * token: The generated token obtained from the client.
  * recaptchaAction: Action name corresponding to the token.
  */
async function createAssessment({
  // TODO: Replace the token and reCAPTCHA action variables before running the sample.
  projectID = "kdadks-service-p-1755602644470",
  recaptchaKey = "6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r",
  token = "action-token",
  recaptchaAction = "action-name",
}) {
  // Create the reCAPTCHA client.
  // TODO: Cache the client generation code (recommended) or call client.close() before exiting the method.
  const client = new RecaptchaEnterpriseServiceClient();
  const projectPath = client.projectPath(projectID);

  // Build the assessment request.
  const request = ({
    assessment: {
      event: {
        token: token,
        siteKey: recaptchaKey,
      },
    },
    parent: projectPath,
  });

  const [ response ] = await client.createAssessment(request);

  // Check if the token is valid.
  if (!response.tokenProperties.valid) {
    console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
    return null;
  }

  // Check if the expected action was executed.
  // The `action` property is set by user client in the grecaptcha.enterprise.execute() method.
  if (response.tokenProperties.action === recaptchaAction) {
    // Get the risk score and the reason(s).
    // For more information on interpreting the assessment, see:
    // https://cloud.google.com/recaptcha-enterprise/docs/interpret-assessment
    console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
    response.riskAnalysis.reasons.forEach((reason) => {
      console.log(reason);
    });

    return response.riskAnalysis.score;
  } else {
    console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
    return null;
  }
}

// Function to verify reCAPTCHA Enterprise token using Google Cloud client
async function verifyRecaptcha(token, action = 'submit') {
  console.log('🔍 verifyRecaptcha called with:', { token: !!token, action });
  console.log('🔍 Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    RECAPTCHA_DEVELOPMENT_BYPASS: process.env.RECAPTCHA_DEVELOPMENT_BYPASS,
    GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID
  });
  
  const projectID = process.env.GOOGLE_CLOUD_PROJECT_ID || "kdadks-service-p-1755602644470";
  const recaptchaKey = process.env.VITE_RECAPTCHA_SITE_KEY || "6LdQV6srAAAAADPSVG-sDb2o2Mv3pJqYhr6QZa9r";
  
  if (!token) {
    console.log('❌ No token provided');
    return { success: false, error: 'reCAPTCHA token is required' };
  }

  // Check if we're in development environment
  const isProduction = process.env.NODE_ENV === 'production';
  const hasGoogleCredentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const isDevelopmentBypass = process.env.RECAPTCHA_DEVELOPMENT_BYPASS === 'true';
  
  console.log('🔍 Bypass check:', { isProduction, hasGoogleCredentials: !!hasGoogleCredentials, isDevelopmentBypass });
  
  // In development without proper Google Cloud authentication, allow with warning
  if (!isProduction && (!hasGoogleCredentials || isDevelopmentBypass)) {
    console.log('⚠️ Development mode: reCAPTCHA verification bypassed (no Google Cloud authentication)');
    return { success: true, bypass: true, score: 0.9 };
  }

  try {
    console.log('🔍 Attempting reCAPTCHA Enterprise verification with Google Cloud client...');
    
    // Use the official Google Cloud client for assessment
    const score = await createAssessment({
      projectID: projectID,
      recaptchaKey: recaptchaKey,
      token: token,
      recaptchaAction: action
    });

    if (score !== null) {
      console.log(`✅ reCAPTCHA Enterprise verification successful, score: ${score}`);
      
      // Adjust threshold as needed (0.0 to 1.0, higher is better)
      const threshold = 0.3;
      
      if (score >= threshold) {
        return { success: true, score: score };
      } else {
        return { 
          success: false, 
          error: `reCAPTCHA score too low (${score}) - suspected bot activity`,
          score: score
        };
      }
    } else {
      console.error('❌ reCAPTCHA Enterprise assessment failed');
      
      // Fallback to standard verification if Enterprise fails
      return await fallbackToStandardRecaptcha(token);
    }
  } catch (error) {
    console.error('🚨 reCAPTCHA Enterprise client error:', error.message);
    
    // If Google Cloud client fails (e.g., auth issues), fallback to standard
    return await fallbackToStandardRecaptcha(token);
  }
}

// Fallback to standard reCAPTCHA verification
async function fallbackToStandardRecaptcha(token) {
  const secretKey = process.env.VITE_RECAPTCHA_SECRET_KEY;
  
  if (!secretKey) {
    console.warn('⚠️ No reCAPTCHA secret key configured - skipping verification');
    return { success: true, bypass: true }; // Allow in development
  }

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
      return { success: true, score: data.score || 0.5 };
    } else {
      console.error('❌ Standard reCAPTCHA verification failed:', data['error-codes']);
      
      // Handle specific error codes
      const errorCodes = data['error-codes'] || [];
      let errorMessage = 'reCAPTCHA verification failed';
      
      if (errorCodes.includes('invalid-input-secret')) {
        errorMessage = 'Invalid reCAPTCHA secret key - please check your configuration';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = 'Invalid reCAPTCHA token - please try again';
      } else if (errorCodes.includes('bad-request')) {
        errorMessage = 'reCAPTCHA request malformed - please check configuration';
      } else if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = 'reCAPTCHA token expired or already used - please try again';
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: errorCodes 
      };
    }
  } catch (error) {
    console.error('🚨 Both Enterprise and standard reCAPTCHA verification failed:', error);
    return { 
      success: false, 
      error: 'reCAPTCHA verification service unavailable - please try again later' 
    };
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
    const { to, from, subject, text, html, recaptchaToken, recaptchaAction } = req.body;

    // Verify reCAPTCHA first with action context
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, recaptchaAction || 'submit');
    if (!recaptchaResult.success) {
      console.error('❌ reCAPTCHA verification failed:', recaptchaResult.error);
      res.status(400).json({ 
        error: recaptchaResult.error || 'reCAPTCHA verification failed',
        details: recaptchaResult.details,
        score: recaptchaResult.score
      });
      return;
    }

    if (recaptchaResult.bypass) {
      console.log('⚠️ reCAPTCHA verification bypassed for development');
    } else {
      console.log(`✅ reCAPTCHA verification successful (score: ${recaptchaResult.score})`);
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
