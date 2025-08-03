// =====================================================
// Payment Providers - Gateway Implementations
// =====================================================
// Abstract provider implementations for Razorpay, Stripe, and PayPal
// Handles payment processing, verification, and webhook management

import type {
  PaymentProvider,
  PaymentGateway,
  PaymentRequest,
  PaymentTransaction,
  PaymentProviderResponse,
  PaymentProviderPaymentDetails,
  PaymentWebhookResult,
  RefundTransaction,
  RazorpaySettings,
  RazorpayOrderRequest,
  RazorpayOrderResponse,
  RazorpayPaymentResponse,
  StripeSettings,
  StripePaymentIntentRequest,
  StripePaymentIntentResponse,
  PayPalSettings,
  PayPalOrderRequest,
  PayPalOrderResponse
} from '../types/payment';

// =====================================================
// BASE PAYMENT PROVIDER CLASS
// =====================================================

abstract class BasePaymentProvider implements PaymentProvider {
  abstract name: string;
  abstract type: string;

  abstract createPaymentRequest(request: PaymentRequest): Promise<PaymentProviderResponse>;
  abstract verifyPayment(paymentId: string, request: PaymentRequest): Promise<PaymentTransaction>;
  abstract processRefund(transactionId: string, amount: number, reason?: string): Promise<RefundTransaction>;
  abstract getPaymentDetails(paymentId: string): Promise<PaymentProviderPaymentDetails>;
  abstract handleWebhook(payload: any, signature: string): Promise<PaymentWebhookResult>;

  protected formatError(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.description) return error.error.description;
    return 'Unknown payment provider error';
  }

  protected generateReceipt(): string {
    return `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}

// =====================================================
// RAZORPAY PROVIDER
// =====================================================

class RazorpayProvider extends BasePaymentProvider {
  name = 'Razorpay';
  type = 'razorpay';
  private settings: RazorpaySettings;
  private razorpay: any;

  constructor(gateway: PaymentGateway) {
    super();
    this.settings = gateway.settings as RazorpaySettings;
    
    // Initialize Razorpay (client-side)
    if (typeof window !== 'undefined') {
      this.initializeRazorpay();
    }
  }

  private async initializeRazorpay() {
    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      await this.loadRazorpayScript();
    }
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  }

  async createPaymentRequest(request: PaymentRequest): Promise<PaymentProviderResponse> {
    try {
      // Server-side order creation
      const orderData: RazorpayOrderRequest = {
        amount: this.convertToSmallestUnit(request.amount, request.currency),
        currency: request.currency,
        receipt: this.generateReceipt(),
        notes: {
          payment_request_id: request.id,
          invoice_id: request.invoice_id || '',
          customer_email: request.customer_email || ''
        }
      };

      // In a real implementation, this would be a server-side API call
      const order = await this.createRazorpayOrder(orderData);

      // Generate payment URL for checkout
      const paymentUrl = this.generateRazorpayCheckoutUrl(order, request);

      return {
        success: true,
        paymentUrl,
        orderId: request.id,
        providerOrderId: order.id
      };

    } catch (error) {
      return {
        success: false,
        paymentUrl: '',
        orderId: request.id,
        error: this.formatError(error)
      };
    }
  }

  private async createRazorpayOrder(orderData: RazorpayOrderRequest): Promise<RazorpayOrderResponse> {
    // This would typically be a server-side API call to Razorpay
    // For demo purposes, we'll return a mock order
    return {
      id: `order_${Date.now()}`,
      entity: 'order',
      amount: orderData.amount,
      amount_paid: 0,
      amount_due: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
      status: 'created',
      attempts: 0,
      notes: orderData.notes || {},
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  private generateRazorpayCheckoutUrl(order: RazorpayOrderResponse, request: PaymentRequest): string {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      order_id: order.id,
      amount: order.amount.toString(),
      currency: order.currency,
      name: 'KDADKS Service Private Limited',
      description: request.description || 'Invoice Payment',
      prefill_email: request.customer_email || '',
      prefill_contact: request.customer_phone || '',
      callback_url: `${baseUrl}/payment/${request.id}?gateway=razorpay`,
      cancel_url: `${baseUrl}/payment/${request.id}?status=cancelled`
    });

    return `${baseUrl}/payment/razorpay-checkout?${params.toString()}`;
  }

  async verifyPayment(paymentId: string, request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      // Server-side payment verification
      const payment = await this.getRazorpayPayment(paymentId);

      const transaction: Omit<PaymentTransaction, 'id' | 'created_at'> = {
        payment_request_id: request.id,
        gateway_transaction_id: payment.id,
        amount: this.convertFromSmallestUnit(payment.amount, payment.currency),
        currency: payment.currency,
        status: this.mapRazorpayStatus(payment.status),
        payment_method: payment.method,
        payment_method_details: {
          card_id: payment.card_id,
          bank: payment.bank,
          wallet: payment.wallet,
          vpa: payment.vpa
        },
        gateway_response: payment,
        gateway_fee: payment.fee ? this.convertFromSmallestUnit(payment.fee, payment.currency) : undefined,
        processed_at: new Date(payment.created_at * 1000).toISOString(),
        failure_code: payment.error_code,
        failure_reason: payment.error_description
      };

      return transaction as PaymentTransaction;

    } catch (error) {
      throw new Error(`Razorpay payment verification failed: ${this.formatError(error)}`);
    }
  }

  private async getRazorpayPayment(paymentId: string): Promise<RazorpayPaymentResponse> {
    // This would be a server-side API call to Razorpay
    // Mock response for demo
    return {
      id: paymentId,
      entity: 'payment',
      amount: 100000, // ₹1000 in paise
      currency: 'INR',
      status: 'captured',
      method: 'card',
      captured: true,
      email: 'customer@example.com',
      contact: '+919876543210',
      notes: {},
      created_at: Math.floor(Date.now() / 1000)
    };
  }

  private mapRazorpayStatus(status: string): PaymentTransaction['status'] {
    const statusMap: Record<string, PaymentTransaction['status']> = {
      'created': 'pending',
      'authorized': 'processing',
      'captured': 'success',
      'refunded': 'refunded',
      'failed': 'failed'
    };

    return statusMap[status] || 'failed';
  }

  async processRefund(transactionId: string, amount: number, reason?: string): Promise<RefundTransaction> {
    try {
      // Server-side refund processing
      const refund = await this.createRazorpayRefund(transactionId, amount, reason);

      return {
        id: refund.id,
        amount: this.convertFromSmallestUnit(refund.amount, 'INR'),
        reason: reason || 'Customer requested refund',
        created_at: new Date().toISOString(),
        gateway_refund_id: refund.id,
        status: 'success'
      };

    } catch (error) {
      throw new Error(`Razorpay refund failed: ${this.formatError(error)}`);
    }
  }

  private async createRazorpayRefund(paymentId: string, amount: number, reason?: string): Promise<any> {
    // Mock refund response
    return {
      id: `rfnd_${Date.now()}`,
      amount: this.convertToSmallestUnit(amount, 'INR'),
      currency: 'INR',
      payment_id: paymentId,
      reason: reason || 'requested_by_customer',
      status: 'processed'
    };
  }

  async getPaymentDetails(paymentId: string): Promise<PaymentProviderPaymentDetails> {
    const payment = await this.getRazorpayPayment(paymentId);

    return {
      id: payment.id,
      status: payment.status,
      amount: this.convertFromSmallestUnit(payment.amount, payment.currency),
      currency: payment.currency,
      payment_method: payment.method,
      created_at: new Date(payment.created_at * 1000).toISOString(),
      updated_at: new Date(payment.created_at * 1000).toISOString(),
      metadata: {
        captured: payment.captured,
        email: payment.email,
        contact: payment.contact
      }
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<PaymentWebhookResult> {
    try {
      // Verify webhook signature
      const isValid = this.verifyRazorpaySignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const event = payload.event;
      const paymentEntity = payload.payload?.payment?.entity;

      let result: PaymentWebhookResult = { processed: false };

      switch (event) {
        case 'payment.captured':
          result = await this.handlePaymentCaptured(paymentEntity);
          break;
        case 'payment.failed':
          result = await this.handlePaymentFailed(paymentEntity);
          break;
        case 'refund.created':
          result = await this.handleRefundCreated(payload.payload?.refund?.entity);
          break;
        default:
          result = { processed: false, action_taken: 'ignored_unknown_event' };
      }

      return result;

    } catch (error) {
      return {
        processed: false,
        error: this.formatError(error)
      };
    }
  }

  private verifyRazorpaySignature(payload: any, signature: string): boolean {
    // In a real implementation, verify using Razorpay's webhook secret
    // This is a simplified version
    return Boolean(signature && signature.length > 0);
  }

  private async handlePaymentCaptured(payment: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: payment.notes?.payment_request_id,
      action_taken: 'payment_captured'
    };
  }

  private async handlePaymentFailed(payment: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: payment.notes?.payment_request_id,
      action_taken: 'payment_failed'
    };
  }

  private async handleRefundCreated(refund: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      action_taken: 'refund_created'
    };
  }

  private convertToSmallestUnit(amount: number, currency: string): number {
    // Convert to paise for INR, cents for others
    const multipliers: Record<string, number> = {
      'INR': 100,
      'USD': 100,
      'EUR': 100,
      'GBP': 100
    };

    return Math.round(amount * (multipliers[currency] || 100));
  }

  private convertFromSmallestUnit(amount: number, currency: string): number {
    const multipliers: Record<string, number> = {
      'INR': 100,
      'USD': 100,
      'EUR': 100,
      'GBP': 100
    };

    return amount / (multipliers[currency] || 100);
  }
}

// =====================================================
// STRIPE PROVIDER
// =====================================================

class StripeProvider extends BasePaymentProvider {
  name = 'Stripe';
  type = 'stripe';
  private settings: StripeSettings;

  constructor(gateway: PaymentGateway) {
    super();
    this.settings = gateway.settings as StripeSettings;
  }

  async createPaymentRequest(request: PaymentRequest): Promise<PaymentProviderResponse> {
    try {
      const paymentIntentData: StripePaymentIntentRequest = {
        amount: this.convertToSmallestUnit(request.amount, request.currency),
        currency: request.currency.toLowerCase(),
        payment_method_types: ['card'],
        description: request.description,
        receipt_email: request.customer_email,
        metadata: {
          payment_request_id: request.id,
          invoice_id: request.invoice_id || '',
          customer_name: request.customer_name || ''
        },
        return_url: `${window.location.origin}/payment/${request.id}?gateway=stripe`
      };

      const paymentIntent = await this.createStripePaymentIntent(paymentIntentData);
      const paymentUrl = this.generateStripeCheckoutUrl(paymentIntent, request);

      return {
        success: true,
        paymentUrl,
        orderId: request.id,
        providerOrderId: paymentIntent.id
      };

    } catch (error) {
      return {
        success: false,
        paymentUrl: '',
        orderId: request.id,
        error: this.formatError(error)
      };
    }
  }

  private async createStripePaymentIntent(data: StripePaymentIntentRequest): Promise<StripePaymentIntentResponse> {
    // This would be a server-side API call to Stripe
    // Mock response for demo
    return {
      id: `pi_${Date.now()}`,
      object: 'payment_intent',
      amount: data.amount,
      currency: data.currency,
      status: 'requires_payment_method',
      client_secret: `pi_${Date.now()}_secret_${Math.random().toString(36).substring(2)}`,
      description: data.description,
      receipt_email: data.receipt_email,
      payment_method_types: data.payment_method_types || ['card'],
      metadata: data.metadata || {},
      created: Math.floor(Date.now() / 1000)
    };
  }

  private generateStripeCheckoutUrl(paymentIntent: StripePaymentIntentResponse, request: PaymentRequest): string {
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      payment_intent: paymentIntent.id,
      client_secret: paymentIntent.client_secret || '',
      return_url: `${baseUrl}/payment/${request.id}?gateway=stripe`
    });

    return `${baseUrl}/payment/stripe-checkout?${params.toString()}`;
  }

  async verifyPayment(paymentId: string, request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      const paymentIntent = await this.getStripePaymentIntent(paymentId);

      const transaction: Omit<PaymentTransaction, 'id' | 'created_at'> = {
        payment_request_id: request.id,
        gateway_transaction_id: paymentIntent.id,
        amount: this.convertFromSmallestUnit(paymentIntent.amount, paymentIntent.currency),
        currency: paymentIntent.currency.toUpperCase(),
        status: this.mapStripeStatus(paymentIntent.status),
        payment_method: paymentIntent.payment_method_types[0] || 'card',
        payment_method_details: {
          payment_method: paymentIntent.payment_method
        },
        gateway_response: paymentIntent,
        processed_at: new Date(paymentIntent.created * 1000).toISOString(),
        failure_code: paymentIntent.last_payment_error?.code,
        failure_reason: paymentIntent.last_payment_error?.message
      };

      return transaction as PaymentTransaction;

    } catch (error) {
      throw new Error(`Stripe payment verification failed: ${this.formatError(error)}`);
    }
  }

  private async getStripePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntentResponse> {
    // This would be a server-side API call to Stripe
    // Mock response for demo
    return {
      id: paymentIntentId,
      object: 'payment_intent',
      amount: 5000, // $50.00 in cents
      currency: 'usd',
      status: 'succeeded',
      payment_method_types: ['card'],
      metadata: {},
      created: Math.floor(Date.now() / 1000)
    };
  }

  private mapStripeStatus(status: string): PaymentTransaction['status'] {
    const statusMap: Record<string, PaymentTransaction['status']> = {
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'processing': 'processing',
      'succeeded': 'success',
      'canceled': 'cancelled'
    };

    return statusMap[status] || 'failed';
  }

  async processRefund(transactionId: string, amount: number, reason?: string): Promise<RefundTransaction> {
    try {
      const refund = await this.createStripeRefund(transactionId, amount, reason);

      return {
        id: refund.id,
        amount: this.convertFromSmallestUnit(refund.amount, 'USD'),
        reason: reason || 'requested_by_customer',
        created_at: new Date().toISOString(),
        gateway_refund_id: refund.id,
        status: 'success'
      };

    } catch (error) {
      throw new Error(`Stripe refund failed: ${this.formatError(error)}`);
    }
  }

  private async createStripeRefund(paymentIntentId: string, amount: number, reason?: string): Promise<any> {
    // Mock refund response
    return {
      id: `re_${Date.now()}`,
      amount: this.convertToSmallestUnit(amount, 'USD'),
      currency: 'usd',
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer',
      status: 'succeeded'
    };
  }

  async getPaymentDetails(paymentId: string): Promise<PaymentProviderPaymentDetails> {
    const paymentIntent = await this.getStripePaymentIntent(paymentId);

    return {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: this.convertFromSmallestUnit(paymentIntent.amount, paymentIntent.currency),
      currency: paymentIntent.currency.toUpperCase(),
      payment_method: paymentIntent.payment_method_types[0],
      created_at: new Date(paymentIntent.created * 1000).toISOString(),
      updated_at: new Date(paymentIntent.created * 1000).toISOString(),
      metadata: paymentIntent.metadata
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<PaymentWebhookResult> {
    try {
      // Verify webhook signature
      const isValid = this.verifyStripeSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const event = payload.type;
      const paymentIntent = payload.data?.object;

      let result: PaymentWebhookResult = { processed: false };

      switch (event) {
        case 'payment_intent.succeeded':
          result = await this.handlePaymentSucceeded(paymentIntent);
          break;
        case 'payment_intent.payment_failed':
          result = await this.handlePaymentFailed(paymentIntent);
          break;
        default:
          result = { processed: false, action_taken: 'ignored_unknown_event' };
      }

      return result;

    } catch (error) {
      return {
        processed: false,
        error: this.formatError(error)
      };
    }
  }

  private verifyStripeSignature(payload: any, signature: string): boolean {
    // In a real implementation, verify using Stripe's webhook secret
    return Boolean(signature && signature.length > 0);
  }

  private async handlePaymentSucceeded(paymentIntent: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: paymentIntent.metadata?.payment_request_id,
      action_taken: 'payment_succeeded'
    };
  }

  private async handlePaymentFailed(paymentIntent: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: paymentIntent.metadata?.payment_request_id,
      action_taken: 'payment_failed'
    };
  }

  private convertToSmallestUnit(amount: number, currency: string): number {
    // Convert to cents for USD/EUR/GBP, etc.
    const multipliers: Record<string, number> = {
      'USD': 100,
      'EUR': 100,
      'GBP': 100,
      'CAD': 100,
      'AUD': 100,
      'JPY': 1, // Yen has no subdivision
      'KRW': 1  // Won has no subdivision
    };

    return Math.round(amount * (multipliers[currency.toUpperCase()] || 100));
  }

  private convertFromSmallestUnit(amount: number, currency: string): number {
    const multipliers: Record<string, number> = {
      'USD': 100,
      'EUR': 100,
      'GBP': 100,
      'CAD': 100,
      'AUD': 100,
      'JPY': 1,
      'KRW': 1
    };

    return amount / (multipliers[currency.toUpperCase()] || 100);
  }
}

// =====================================================
// PAYPAL PROVIDER
// =====================================================

class PayPalProvider extends BasePaymentProvider {
  name = 'PayPal';
  type = 'paypal';
  private settings: PayPalSettings;

  constructor(gateway: PaymentGateway) {
    super();
    this.settings = gateway.settings as PayPalSettings;
  }

  async createPaymentRequest(request: PaymentRequest): Promise<PaymentProviderResponse> {
    try {
      const orderData: PayPalOrderRequest = {
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: request.currency,
            value: request.amount.toFixed(2)
          },
          description: request.description,
          custom_id: request.id,
          invoice_id: request.invoice_id
        }],
        application_context: {
          return_url: `${window.location.origin}/payment/${request.id}?gateway=paypal&status=success`,
          cancel_url: `${window.location.origin}/payment/${request.id}?gateway=paypal&status=cancelled`,
          brand_name: 'KDADKS Service Private Limited',
          landing_page: 'BILLING',
          user_action: 'PAY_NOW'
        }
      };

      const order = await this.createPayPalOrder(orderData);
      const approvalUrl = order.links.find(link => link.rel === 'approve')?.href || '';

      return {
        success: true,
        paymentUrl: approvalUrl,
        orderId: request.id,
        providerOrderId: order.id
      };

    } catch (error) {
      return {
        success: false,
        paymentUrl: '',
        orderId: request.id,
        error: this.formatError(error)
      };
    }
  }

  private async createPayPalOrder(orderData: PayPalOrderRequest): Promise<PayPalOrderResponse> {
    // This would be a server-side API call to PayPal
    // Mock response for demo
    return {
      id: `ORDER_${Date.now()}`,
      status: 'CREATED',
      links: [
        {
          href: `https://www.sandbox.paypal.com/checkoutnow?token=ORDER_${Date.now()}`,
          rel: 'approve',
          method: 'GET'
        },
        {
          href: `${window.location.origin}/api/paypal/capture`,
          rel: 'capture',
          method: 'POST'
        }
      ],
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
  }

  async verifyPayment(paymentId: string, request: PaymentRequest): Promise<PaymentTransaction> {
    try {
      const order = await this.getPayPalOrder(paymentId);

      const transaction: Omit<PaymentTransaction, 'id' | 'created_at'> = {
        payment_request_id: request.id,
        gateway_transaction_id: paymentId,
        amount: request.amount,
        currency: request.currency,
        status: this.mapPayPalStatus(order.status),
        payment_method: 'paypal',
        payment_method_details: {
          order_id: order.id
        },
        gateway_response: order,
        processed_at: new Date().toISOString()
      };

      return transaction as PaymentTransaction;

    } catch (error) {
      throw new Error(`PayPal payment verification failed: ${this.formatError(error)}`);
    }
  }

  private async getPayPalOrder(orderId: string): Promise<any> {
    // This would be a server-side API call to PayPal
    // Mock response for demo
    return {
      id: orderId,
      status: 'COMPLETED',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    };
  }

  private mapPayPalStatus(status: string): PaymentTransaction['status'] {
    const statusMap: Record<string, PaymentTransaction['status']> = {
      'CREATED': 'pending',
      'SAVED': 'pending',
      'APPROVED': 'processing',
      'COMPLETED': 'success',
      'VOIDED': 'cancelled',
      'PAYER_ACTION_REQUIRED': 'pending'
    };

    return statusMap[status] || 'failed';
  }

  async processRefund(transactionId: string, amount: number, reason?: string): Promise<RefundTransaction> {
    try {
      const refund = await this.createPayPalRefund(transactionId, amount, reason);

      return {
        id: refund.id,
        amount: amount,
        reason: reason || 'requested_by_customer',
        created_at: new Date().toISOString(),
        gateway_refund_id: refund.id,
        status: 'success'
      };

    } catch (error) {
      throw new Error(`PayPal refund failed: ${this.formatError(error)}`);
    }
  }

  private async createPayPalRefund(captureId: string, amount: number, reason?: string): Promise<any> {
    // Mock refund response
    return {
      id: `REFUND_${Date.now()}`,
      status: 'COMPLETED',
      amount: {
        currency_code: 'USD',
        value: amount.toFixed(2)
      }
    };
  }

  async getPaymentDetails(paymentId: string): Promise<PaymentProviderPaymentDetails> {
    const order = await this.getPayPalOrder(paymentId);

    return {
      id: order.id,
      status: order.status,
      amount: 0, // Amount would be extracted from order details
      currency: 'USD',
      payment_method: 'paypal',
      created_at: order.create_time,
      updated_at: order.update_time,
      metadata: order
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<PaymentWebhookResult> {
    try {
      // Verify webhook signature
      const isValid = this.verifyPayPalSignature(payload, signature);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const eventType = payload.event_type;
      const resource = payload.resource;

      let result: PaymentWebhookResult = { processed: false };

      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          result = await this.handlePaymentCompleted(resource);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          result = await this.handlePaymentDenied(resource);
          break;
        default:
          result = { processed: false, action_taken: 'ignored_unknown_event' };
      }

      return result;

    } catch (error) {
      return {
        processed: false,
        error: this.formatError(error)
      };
    }
  }

  private verifyPayPalSignature(payload: any, signature: string): boolean {
    // In a real implementation, verify using PayPal's webhook verification
    return Boolean(signature && signature.length > 0);
  }

  private async handlePaymentCompleted(resource: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: resource.custom_id,
      action_taken: 'payment_completed'
    };
  }

  private async handlePaymentDenied(resource: any): Promise<PaymentWebhookResult> {
    return {
      processed: true,
      payment_request_id: resource.custom_id,
      action_taken: 'payment_denied'
    };
  }
}

// =====================================================
// PROVIDER FACTORY
// =====================================================

export function createPaymentProvider(gateway: PaymentGateway): PaymentProvider {
  switch (gateway.provider_type) {
    case 'razorpay':
      return new RazorpayProvider(gateway);
    case 'stripe':
      return new StripeProvider(gateway);
    case 'paypal':
      return new PayPalProvider(gateway);
    default:
      throw new Error(`Unsupported payment provider: ${gateway.provider_type}`);
  }
}

// Export provider classes for direct use if needed
export { RazorpayProvider, StripeProvider, PayPalProvider };

// =====================================================
// PAYMENT PROVIDER FACTORY
// =====================================================

export class PaymentProviderFactory {
  static createProvider(
    providerType: string,
    gateway: PaymentGateway
  ): BasePaymentProvider {
    switch (providerType.toLowerCase()) {
      case 'razorpay':
        return new RazorpayProvider(gateway);
      case 'stripe':
        return new StripeProvider(gateway);
      case 'paypal':
        return new PayPalProvider(gateway);
      default:
        throw new Error(`Unsupported payment provider: ${providerType}`);
    }
  }

  static getSupportedProviders(): string[] {
    return ['razorpay', 'stripe', 'paypal'];
  }

  static getProviderInfo(providerType: string) {
    const providers: Record<string, any> = {
      razorpay: {
        name: 'Razorpay',
        description: 'Popular Indian payment gateway',
        supportedCurrencies: ['INR'],
        features: ['UPI', 'Cards', 'Net Banking', 'Wallets']
      },
      stripe: {
        name: 'Stripe',
        description: 'Global payment platform',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
        features: ['International Cards', 'Local Payment Methods', '3D Secure']
      },
      paypal: {
        name: 'PayPal',
        description: 'Worldwide payment system',
        supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
        features: ['PayPal Balance', 'Cards', 'Bank Transfers']
      }
    };

    return providers[providerType.toLowerCase()] || null;
  }
}