exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight check' })
    };
  }

  // Get all environment variables and filter relevant ones
  const allEnvVars = Object.keys(process.env).sort();
  const relevantEnvVars = {};
  
  allEnvVars.forEach(key => {
    if (key.includes('RECAPTCHA') || key.includes('BREVO') || key.includes('VITE') || 
        key.includes('GOOGLE') || key.includes('NETLIFY') || key.includes('DEPLOY') ||
        key.includes('NODE_ENV') || key.includes('CONTEXT') || key.includes('BRANCH')) {
      // Show first 6 characters for security
      relevantEnvVars[key] = process.env[key] ? `${process.env[key].substring(0, 6)}...` : 'Not set';
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      message: 'Debug endpoint working!',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      method: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters,
      availableEnvVars: {
        hasBrevoPassword: !!process.env.BREVO_PASSWORD,
        hasRecaptchaSecretKey: !!process.env.RECAPTCHA_SECRET_KEY,
        hasViteRecaptchaSecretKey: !!process.env.VITE_RECAPTCHA_SECRET_KEY,
        hasRecaptchaSiteKey: !!process.env.VITE_RECAPTCHA_SITE_KEY,
        hasGoogleAppCredentials: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        hasGoogleProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        recaptchaBypass: process.env.RECAPTCHA_BYPASS,
        
        // Additional checks for production environment variables
        hasRecaptchaSecretKeyNoPrefix: !!process.env.RECAPTCHA_SECRET_KEY,
        hasRecaptchaSiteKeyNoPrefix: !!process.env.RECAPTCHA_SITE_KEY,
        hasRecaptchaProjectIdNoPrefix: !!process.env.RECAPTCHA_PROJECT_ID
      },
      netlifyContext: {
        deployId: context.awsRequestId,
        functionName: context.functionName,
        functionVersion: context.functionVersion,
        netlifyEnv: process.env.NETLIFY,
        context: process.env.CONTEXT,
        branch: process.env.BRANCH,
        deployId: process.env.DEPLOY_ID,
        url: process.env.URL,
        deployUrl: process.env.DEPLOY_URL
      },
      allRelevantEnvVars: relevantEnvVars,
      totalEnvVarsCount: allEnvVars.length,
      functionVersion: '3.0.0'
    })
  };
};
