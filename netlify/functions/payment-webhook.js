const crypto = require('crypto');
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
    if (path.includes('/razorpay')) {
      return await handleRazorpayWebhook(body, headers);
    } else if (path.includes('/stripe')) {
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

async function handleRazorpayWebhook(body, headers) {
  try {
    const signature = headers['x-razorpay-signature'];
    if (!signature) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing signature' }) };
    }

    // Get Razorpay gateway settings from database
    const { data: gateway } = await supabase
      .from('payment_gateways')
      .select('settings')
      .eq('provider_type', 'razorpay')
      .eq('is_active', true)
      .single();

    if (!gateway) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Gateway not configured' }) };
    }

    // Verify webhook signature
    const webhookSecret = gateway.settings.webhook_secret;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature' }) };
    }

    const event = JSON.parse(body);
    console.log('Razorpay webhook event:', event.event);

    // Log webhook event
    await supabase.from('payment_webhooks').insert([{
      gateway_type: 'razorpay',
      event_type: event.event,
      payload: event,
      signature: signature,
      status: 'received'
    }]);

    // Process payment events
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      
      // Update transaction with payment method details
      const { data: updatedTransaction } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          payment_method: payment.method,
          payment_method_details: {
            method: payment.method,
            bank: payment.bank,
            wallet: payment.wallet,
            vpa: payment.vpa,
            card_id: payment.card_id,
            email: payment.email,
            contact: payment.contact
          },
          gateway_fee: payment.fee ? payment.fee / 100 : null,
          processed_at: new Date().toISOString()
        })
        .eq('gateway_transaction_id', payment.order_id)
        .select()
        .single();

      // Update payment request status
      const { data: transaction } = await supabase
        .from('payment_transactions')
        .select('payment_request_id')
        .eq('gateway_transaction_id', payment.order_id)
        .single();

      if (transaction) {
        const { data: updatedRequest } = await supabase
          .from('payment_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            gateway_payment_id: payment.id
          })
          .eq('id', transaction.payment_request_id)
          .select('*, invoice_id, customer_email, customer_name, amount, currency')
          .single();

        // Send payment confirmation email
        if (updatedRequest && payment.email) {
          try {
            const emailData = {
              to: payment.email,
              subject: 'Payment Confirmation - KDADKS Service Private Limited',
              template: 'payment_confirmation',
              templateData: {
                customerName: payment.contact || updatedRequest.customer_name || 'Valued Customer',
                paymentId: payment.id,
                orderId: payment.order_id,
                amount: payment.amount / 100, // Convert from paise to rupees
                currency: payment.currency,
                paymentMethod: payment.method,
                transactionDate: new Date().toLocaleDateString('en-IN'),
                invoiceId: updatedRequest.invoice_id,
                companyName: 'KDADKS Service Private Limited'
              }
            };

            // Send email via the email service
            const emailResponse = await fetch(process.env.URL + '/.netlify/functions/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emailData)
            });

            if (emailResponse.ok) {
              console.log('Payment confirmation email sent successfully');
            } else {
              console.error('Failed to send payment confirmation email');
            }
          } catch (emailError) {
            console.error('Error sending payment confirmation email:', emailError);
          }
        }
      }

    } else if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      
      await supabase
        .from('payment_transactions')
        .update({
          status: 'failed',
          failure_code: payment.error_code,
          failure_reason: payment.error_description,
          processed_at: new Date().toISOString()
        })
        .eq('gateway_transaction_id', payment.order_id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true })
    };

  } catch (error) {
    console.error('Razorpay webhook error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Processing failed' })
    };
  }
}

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
