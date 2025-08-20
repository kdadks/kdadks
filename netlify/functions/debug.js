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
        recaptchaBypass: process.env.RECAPTCHA_BYPASS
      },
      netlifyContext: {
        deployId: context.awsRequestId,
        functionName: context.functionName,
        functionVersion: context.functionVersion
      },
      functionVersion: '2.0.0'
    })
  };
};
