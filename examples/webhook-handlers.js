// Webhook API Route Examples for Payment Gateway Integration
// These would typically go in your backend API routes

// Example: Express.js webhook handlers
import express from 'express';
import crypto from 'crypto';
import { paymentService } from '../services/paymentService';

const router = express.Router();

// Razorpay Webhook Handler
router.post('/webhooks/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body;

    // Verify webhook signature
    const gateway = await paymentService.getPaymentGatewayByType('razorpay');
    const webhookSecret = gateway.settings.webhook_secret;
    
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body.toString());
    
    // Log webhook event
    await paymentService.logWebhookEvent({
      gateway_type: 'razorpay',
      event_type: event.event,
      payload: event,
      signature: signature
    });

    // Process payment event
    if (event.event === 'payment.captured') {
      await paymentService.updateTransactionStatus(
        event.payload.payment.entity.order_id,
        'success',
        {
          payment_id: event.payload.payment.entity.id,
          method: event.payload.payment.entity.method,
          amount: event.payload.payment.entity.amount / 100,
          fee: event.payload.payment.entity.fee / 100
        }
      );
    } else if (event.event === 'payment.failed') {
      await paymentService.updateTransactionStatus(
        event.payload.payment.entity.order_id,
        'failed',
        {
          error_code: event.payload.payment.entity.error_code,
          error_description: event.payload.payment.entity.error_description
        }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Razorpay webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Stripe Webhook Handler
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const body = req.body;

    const gateway = await paymentService.getPaymentGatewayByType('stripe');
    const webhookSecret = gateway.settings.webhook_secret;

    // Verify webhook signature (you'd use Stripe SDK here)
    // const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    const event = JSON.parse(body.toString()); // Simplified for example

    // Log webhook event
    await paymentService.logWebhookEvent({
      gateway_type: 'stripe',
      event_type: event.type,
      payload: event,
      signature: sig
    });

    // Process payment event
    if (event.type === 'payment_intent.succeeded') {
      await paymentService.updateTransactionStatus(
        event.data.object.metadata.payment_request_id,
        'success',
        {
          payment_id: event.data.object.id,
          amount: event.data.object.amount / 100,
          currency: event.data.object.currency
        }
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      await paymentService.updateTransactionStatus(
        event.data.object.metadata.payment_request_id,
        'failed',
        {
          error_message: event.data.object.last_payment_error?.message
        }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// PayPal Webhook Handler
router.post('/webhooks/paypal', express.json(), async (req, res) => {
  try {
    const event = req.body;

    // Log webhook event
    await paymentService.logWebhookEvent({
      gateway_type: 'paypal',
      event_type: event.event_type,
      payload: event,
      signature: req.headers['paypal-transmission-sig']
    });

    // Process payment event
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const payment = event.resource;
      await paymentService.updateTransactionStatus(
        payment.custom_id, // Should contain payment_request_id
        'success',
        {
          payment_id: payment.id,
          amount: parseFloat(payment.amount.value),
          currency: payment.amount.currency_code
        }
      );
    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const payment = event.resource;
      await paymentService.updateTransactionStatus(
        payment.custom_id,
        'failed',
        {
          error_message: 'Payment was denied'
        }
      );
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;

// Usage in main app:
// app.use('/api', webhookRoutes);
