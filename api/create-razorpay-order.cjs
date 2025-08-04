const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Headers for CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { gatewayId, amount, currency, receipt, notes } = JSON.parse(event.body);

    if (!gatewayId || !amount || !currency) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: gatewayId, amount, currency' 
        })
      };
    }

    // Get Razorpay gateway settings from database
    const { data: gateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('id', gatewayId)
      .eq('provider_type', 'razorpay')
      .eq('is_active', true)
      .single();

    if (gatewayError || !gateway) {
      console.error('Gateway fetch error:', gatewayError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Payment gateway not found' })
      };
    }

    const settings = gateway.settings;
    if (!settings.key_id || !settings.key_secret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Payment gateway not properly configured' })
      };
    }

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: settings.key_id,
      key_secret: settings.key_secret
    });

    // Convert amount to smallest unit (paise for INR)
    const amountInSmallestUnit = Math.round(amount * 100);

    // Create order with Razorpay
    const orderOptions = {
      amount: amountInSmallestUnit,
      currency: currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: notes || {}
    };

    console.log('Creating Razorpay order with options:', orderOptions);

    const order = await razorpay.orders.create(orderOptions);

    console.log('Razorpay order created successfully:', order);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: {
          id: order.id,
          entity: order.entity,
          amount: order.amount,
          amount_paid: order.amount_paid,
          amount_due: order.amount_due,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          attempts: order.attempts,
          notes: order.notes,
          created_at: order.created_at
        }
      })
    };

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to create payment order',
        details: error.message
      })
    };
  }
};
