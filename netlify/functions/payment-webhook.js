const { supabase } = require('./lib/supabase');

// This is a Netlify function to handle payment gateway webhooks
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const path = event.path;
    const body = event.body;
    const headers = event.headers;
    
    console.log('Webhook received:', { path, headers: Object.keys(headers) });

    // Route to appropriate webhook handler
    if (path.includes('/stripe')) {
      return await handleStripeWebhook(body, headers);
    } else if (path.includes('/paypal')) {
      return await handlePayPalWebhook(body, headers);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Webhook endpoint not found' })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
};

async function handleStripeWebhook(body, headers) {
  // Similar implementation for Stripe
  console.log('Stripe webhook received');
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true, note: 'Stripe webhook implementation needed' })
  };
}

async function handlePayPalWebhook(body, headers) {
  // Similar implementation for PayPal
  console.log('PayPal webhook received');
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true, note: 'PayPal webhook implementation needed' })
  };
}
