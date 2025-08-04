import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CreditCard, 
  Lock, 
  ArrowLeft, 
  Check, 
  AlertCircle,
  Loader,
  Shield,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import { PaymentProviderFactory } from '../../services/paymentProviders';
import type { PaymentRequest, PaymentGateway } from '../../types/payment';
import type { Invoice } from '../../types/invoice';

export const CheckoutPage: React.FC = () => {
  const { requestId, token } = useParams<{ requestId?: string; token?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get token from query parameters if not in URL params
  const queryToken = searchParams.get('token');
  const actualToken = token || queryToken;
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [invoice] = useState<Invoice | null>(null);
  const [availableGateways, setAvailableGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (requestId || actualToken) {
      loadPaymentRequest();
    } else {
      setError('Payment request ID or token is required');
      setLoading(false);
    }
  }, [requestId, actualToken]);

  const loadPaymentRequest = async () => {
    try {
      setLoading(true);
      setError(null);

      console.group('🔍 CHECKOUT PAGE DEBUG');
      console.log('requestId from URL params:', requestId);
      console.log('token from URL params:', token);
      console.log('queryToken from search params:', queryToken);
      console.log('actualToken being used:', actualToken);
      console.log('Current URL:', window.location.href);
      console.groupEnd();

      let request: PaymentRequest | null = null;

      // Load payment request either by ID or by token
      if (actualToken) {
        console.log('Loading payment request by token:', actualToken);
        // If we have a token, get the payment link first and then the request
        const paymentLink = await paymentService.getPaymentLinkByToken(actualToken);
        console.log('Payment link lookup result:', paymentLink);
        
        if (!paymentLink) {
          throw new Error('Payment link not found or expired');
        }
        
        // Get the actual payment request using the payment_request_id
        if (paymentLink.payment_request_id) {
          console.log('Loading payment request by ID:', paymentLink.payment_request_id);
          request = await paymentService.getPaymentRequestById(paymentLink.payment_request_id);
        } else {
          throw new Error('Payment request not found for this link');
        }
      } else if (requestId) {
        console.log('Loading payment request by request ID:', requestId);
        // Load payment request by ID directly
        request = await paymentService.getPaymentRequestById(requestId);
      }

      console.log('Final payment request loaded:', request);

      if (!request) {
        throw new Error('Payment request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('This payment request is no longer available');
      }

      if (request.expires_at && new Date(request.expires_at) < new Date()) {
        throw new Error('This payment request has expired');
      }

      setPaymentRequest(request);

      // Pre-fill customer information if available
      if (request.customer_name || request.customer_email) {
        setCustomerInfo(prev => ({
          ...prev,
          name: request.customer_name || '',
          email: request.customer_email || ''
        }));
      }

      // Load invoice details if available
      if (request.invoice_id) {
        // Mock implementation - in real app, you'd have this method
        // const invoiceData = await paymentService.getInvoiceForPayment(request.invoice_id);
        // For now, skip invoice loading
        // setInvoice(invoiceData);
      }

      // Load available payment gateways
      const allGateways = await paymentService.getPaymentGateways();
      const activeGateways = allGateways.filter(g => 
        g.is_active && g.currency_support.includes(request.currency)
      );
      setAvailableGateways(activeGateways);

      // Select default gateway
      if (activeGateways.length > 0) {
        setSelectedGateway(activeGateways[0]);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment request');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentRequest || !selectedGateway) {
      setError('Payment information is incomplete');
      return;
    }

    if (!customerInfo.name || !customerInfo.email) {
      setError('Please provide your name and email address');
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // Create payment provider instance
      const provider = PaymentProviderFactory.createProvider(
        selectedGateway.provider_type,
        selectedGateway
      );

      // Create payment with provider
      const paymentData = await provider.createPaymentRequest({
        id: paymentRequest.id,
        invoice_id: paymentRequest.invoice_id,
        gateway_id: selectedGateway.id,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        description: paymentRequest.description || `Payment for Invoice ${invoice?.invoice_number || paymentRequest.id}`,
        status: paymentRequest.status,
        customer_email: customerInfo.email,
        customer_phone: customerInfo.phone,
        customer_name: customerInfo.name,
        created_at: paymentRequest.created_at,
        updated_at: paymentRequest.updated_at,
        expires_at: paymentRequest.expires_at,
        metadata: {
          payment_request_id: paymentRequest.id,
          invoice_id: paymentRequest.invoice_id,
          reference_id: paymentRequest.id
        }
      } as PaymentRequest);

      // Record payment attempt in database
      await paymentService.createPaymentTransaction({
        payment_request_id: paymentRequest.id,
        gateway_transaction_id: paymentData.orderId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        gateway_response: paymentData
      });

      // Redirect to payment gateway or handle payment completion
      if (paymentData.paymentUrl) {
        window.location.href = paymentData.paymentUrl;
      } else if (paymentData.success) {
        // Payment completed immediately (rare case)
        navigate(`/payment/success/${paymentRequest.id}`);
      } else {
        // Payment failed or requires additional action
        setError(paymentData.error || 'Payment processing failed');
      }

    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err instanceof Error ? err.message : 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Loading Payment Details
          </h2>
          <p className="text-gray-600 text-center">Please wait while we prepare your payment...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Payment Not Available
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure Payment</h1>
          <p className="text-gray-600">Complete your payment securely</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Summary</h2>
            
            {/* Payment Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(paymentRequest!.amount, paymentRequest!.currency)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Reference</span>
                <span className="font-medium text-gray-900">
                  {paymentRequest!.id || 'N/A'}
                </span>
              </div>
              
              {paymentRequest!.description && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-600">Description</span>
                  <span className="font-medium text-gray-900 text-right max-w-xs">
                    {paymentRequest!.description}
                  </span>
                </div>
              )}
              
              {paymentRequest!.expires_at && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Expires</span>
                  <span className="font-medium text-gray-900">
                    {new Date(paymentRequest!.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Invoice Details */}
            {invoice && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Invoice #{invoice.invoice_number}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      Date: {new Date(invoice.invoice_date).toLocaleDateString()}
                    </span>
                  </div>
                  {invoice.due_date && (
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Secure Payment</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your payment information is encrypted and secure. We do not store your payment details.
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Information</h2>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Gateway Selection */}
              {availableGateways.length > 1 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Method</h3>
                  <div className="space-y-3">
                    {availableGateways.map((gateway) => (
                      <label
                        key={gateway.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedGateway?.id === gateway.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_gateway"
                          value={gateway.id}
                          checked={selectedGateway?.id === gateway.id}
                          onChange={() => setSelectedGateway(gateway)}
                          className="sr-only"
                        />
                        <div className="flex items-center space-x-3">
                          <CreditCard className="w-6 h-6 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900">{gateway.name}</div>
                            <div className="text-sm text-gray-600 capitalize">
                              {gateway.provider_type} • {gateway.currency_support.join(', ')}
                            </div>
                          </div>
                        </div>
                        {selectedGateway?.id === gateway.id && (
                          <Check className="w-5 h-5 text-blue-600 ml-auto" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800">{error}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing || !selectedGateway}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {processing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    <span>Pay {formatCurrency(paymentRequest!.amount, paymentRequest!.currency)}</span>
                  </>
                )}
              </button>

              {/* Payment Gateway Info */}
              {selectedGateway && (
                <div className="text-center text-sm text-gray-600">
                  <p>
                    You will be redirected to {selectedGateway.name} to complete your payment securely.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-700 flex items-center justify-center space-x-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
};