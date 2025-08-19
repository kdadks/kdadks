const express = require('express');

// Simple test endpoint to check reCAPTCHA verification
async function testRecaptchaHandler(req, res) {
  try {
    console.log('🧪 Testing reCAPTCHA verification...');
    console.log('Environment variables:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- RECAPTCHA_DEVELOPMENT_BYPASS:', process.env.RECAPTCHA_DEVELOPMENT_BYPASS);
    console.log('- GOOGLE_APPLICATION_CREDENTIALS:', !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log('- GOOGLE_CLOUD_PROJECT_ID:', !!process.env.GOOGLE_CLOUD_PROJECT_ID);
    
    // Test the verification function directly
    const { verifyRecaptcha } = require('./send-email.cjs');
    
    const testToken = 'test-token-123';
    const result = await verifyRecaptcha(testToken, 'test_action');
    
    console.log('📋 reCAPTCHA verification result:', result);
    
    res.json({
      success: true,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        RECAPTCHA_DEVELOPMENT_BYPASS: process.env.RECAPTCHA_DEVELOPMENT_BYPASS,
        hasGoogleCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID
      },
      verificationResult: result
    });
  } catch (error) {
    console.error('❌ Test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    });
  }
}

module.exports = testRecaptchaHandler;
