const crypto = require('crypto');

// Initialize Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase;
if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('Supabase configuration missing for payment verification');
}

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
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
    console.log('🔍 Payment verification request received');
    
    if (!supabase) {
      console.error('❌ Supabase not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database not configured' })
      };
    }

    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      payment_request_id
    } = JSON.parse(event.body);

    console.log('📝 Verification data:', {
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      payment_request_id
    });

    // Verify signature
    const razorpaySecret = process.env.RAZORPAY_SECRET;
    if (!razorpaySecret) {
      console.error('❌ Razorpay secret not configured');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Payment gateway not configured' })
      };
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', razorpaySecret)
      .update(body.toString())
      .digest('hex');

    const isValidSignature = expectedSignature === razorpay_signature;
    console.log('🔐 Signature verification:', isValidSignature ? 'VALID' : 'INVALID');

    if (!isValidSignature) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid signature',
          verified: false 
        })
      };
    }

    // Get payment request details
    const { data: paymentRequest, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('id', payment_request_id)
      .single();

    if (fetchError || !paymentRequest) {
      console.error('❌ Payment request not found:', fetchError);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Payment request not found' })
      };
    }

    // Update payment_transactions table
    const { data: transactionUpdate, error: transactionError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'success',
        gateway_payment_id: razorpay_payment_id,
        payment_method: 'razorpay',
        payment_method_details: {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature
        },
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('payment_request_id', payment_request_id)
      .select();

    if (transactionError) {
      console.error('❌ Error updating payment_transactions:', transactionError);
    } else {
      console.log('✅ payment_transactions updated:', transactionUpdate);
    }

    // Update payment_requests table
    const { data: requestUpdate, error: requestError } = await supabase
      .from('payment_requests')
      .update({
        status: 'completed',
        gateway_payment_id: razorpay_payment_id,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', payment_request_id)
      .select();

    if (requestError) {
      console.error('❌ Error updating payment_requests:', requestError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to update payment status',
          verified: true 
        })
      };
    }

    console.log('✅ payment_requests updated:', requestUpdate);

    // Log the verification event
    const { error: logError } = await supabase
      .from('payment_logs')
      .insert({
        payment_request_id,
        event_type: 'payment_verified',
        gateway_type: 'razorpay',
        gateway_payment_id: razorpay_payment_id,
        data: {
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          verified: true
        },
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('⚠️ Warning: Could not log verification event:', logError);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        verified: true,
        message: 'Payment verified and status updated successfully',
        payment_request_id,
        razorpay_payment_id
      })
    };

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Payment verification failed',
        verified: false,
        details: error.message 
      })
    };
  }
};
