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
      hasBrevoPassword: !!process.env.BREVO_PASSWORD,
      hasRecaptchaKey: !!process.env.VITE_RECAPTCHA_SITE_KEY,
      functionVersion: '1.0.0'
    })
  };
};
