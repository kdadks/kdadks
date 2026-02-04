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
import { EmailService } from '../../services/emailService';
import { PaymentStatusService } from '../../services/paymentStatusService';
import type { PaymentRequest, PaymentGateway } from '../../types/payment';
import type { Invoice } from '../../types/invoice';
import { useToast } from '../ui/ToastProvider';

export const CheckoutPage: React.FC = () => {
  const { showError } = useToast();
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

  // Razorpay modal handler
  const handleRazorpayModal = async (
    providerData: Record<string, any>, 
    customer: typeof customerInfo, 
    request: PaymentRequest
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Force console output with alert fallback
      console.group('🔍 RAZORPAY MODAL DEBUG - START');
      console.log('Provider data received:', providerData);
      console.log('Customer info:', customer);
      console.log('Payment request:', request);
      console.log('Razorpay script available:', !!(window as any).Razorpay);
      console.log('Window Razorpay object:', (window as any).Razorpay);
      console.groupEnd();
      
      // Alert for debugging if console is not visible - keeping for initial testing
      console.log('Debug Info - Provider Data Keys:', Object.keys(providerData));
      console.log('Debug Info - Razorpay Available:', !!(window as any).Razorpay);
      console.log('Debug Info - Provider Key:', providerData.key);
      console.log('Debug Info - Order ID:', providerData.order_id);
      console.log('Debug Info - Amount:', providerData.amount);

      // Ensure Razorpay script is loaded
      if (!(window as any).Razorpay) {
        console.error('❌ RAZORPAY SCRIPT NOT LOADED');
        reject(new Error('Payment system not initialized. Please refresh and try again.'));
        return;
      }

      // Validate required provider data
      if (!providerData.key || !providerData.order_id || !providerData.amount) {
        const missingFields = {
          key: !!providerData.key,
          order_id: !!providerData.order_id,
          amount: !!providerData.amount
        };
        console.error('❌ MISSING REQUIRED RAZORPAY DATA:', missingFields);
        reject(new Error('Payment configuration incomplete. Please try again.'));
        return;
      }

      const modalOptions = {
        key: providerData.key,
        amount: providerData.amount,
        currency: providerData.currency,
        name: providerData.name,
        description: providerData.description,
        order_id: providerData.order_id,
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone
        },
        theme: {
          color: '#2563eb' // Blue theme matching the site
        },
        handler: async (response: any) => {
          console.log('✅ Razorpay payment success:', response);
          setProcessing(false); // Stop processing on success
          
          // Update payment status directly in database
          try {
            console.log('🔄 Updating payment status in database...');
            
            // Create payment status update data
            const paymentUpdateData = {
              paymentRequestId: request.id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              amount: request.amount,
              currency: request.currency,
              paymentMethod: 'card', // Default, will be updated by webhook
              customerEmail: customer.email,
              customerPhone: customer.phone
            };

            // Update database directly
            const updateSuccess = await PaymentStatusService.updatePaymentStatus(paymentUpdateData);
            
            if (updateSuccess) {
              console.log('✅ Payment status updated in database');
            } else {
              console.warn('⚠️ Payment status update failed, but continuing...');
            }
          } catch (statusError) {
            console.error('❌ Failed to update payment status:', statusError);
            // Don't block the success flow if database update fails
          }
          
          // Send payment confirmation email
          try {
            if (customer.email && paymentRequest) {
              await EmailService.sendPaymentConfirmationEmail(customer.email, {
                customerName: customer.name,
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                amount: paymentRequest.amount,
                currency: paymentRequest.currency,
                paymentMethod: 'Razorpay',
                transactionDate: new Date().toLocaleDateString('en-IN'),
                invoiceNumber: paymentRequest.invoice?.invoice_number || paymentRequest.invoice_id
              });
              console.log('✅ Payment confirmation email sent');
            }
          } catch (emailError) {
            console.error('❌ Failed to send confirmation email:', emailError);
            // Don't block the success flow if email fails
          }
          
          // Redirect to success page
          navigate(`/payment/success/${request.id}?payment_id=${response.razorpay_payment_id}`);
          resolve();
        },
        modal: {
          ondismiss: () => {
            console.log('❌ Razorpay modal dismissed by user');
            setProcessing(false); // Stop processing on dismiss
            reject(new Error('Payment cancelled by user'));
          }
        }
      };

      console.log('🔧 Final modal options:', modalOptions);

      // Additional validation of Razorpay data
      const validationChecks = {
        keyValid: modalOptions.key && modalOptions.key.length > 0,
        amountValid: modalOptions.amount && modalOptions.amount > 0,
        orderIdValid: modalOptions.order_id && modalOptions.order_id.length > 0,
        currencyValid: modalOptions.currency && modalOptions.currency.length === 3,
        nameValid: modalOptions.name && modalOptions.name.length > 0
      };
      
      console.log('Validation checks:', validationChecks);
      
      if (!validationChecks.keyValid || !validationChecks.amountValid || !validationChecks.orderIdValid) {
        console.error('Critical validation failed! Modal will likely fail.');
        reject(new Error('Payment data validation failed. Please try again.'));
        return;
      }

      try {
        console.log('🚀 Creating Razorpay instance...');
        const rzp = new (window as any).Razorpay(modalOptions);
        console.log('✅ Razorpay instance created successfully:', rzp);
        
        // Add error handler before opening
        rzp.on('payment.failed', function (response: any) {
          console.error('Razorpay payment failed:', response);
          setProcessing(false);
          reject(new Error(`Payment failed: ${response.error?.description || 'Unknown error'}`));
        });
        
        console.log('🚀 Opening Razorpay modal...');
        rzp.open();
        console.log('✅ Razorpay modal opened successfully');
      } catch (razorpayError) {
        console.error('❌ Error with Razorpay modal:', razorpayError);
        const errorMessage = razorpayError instanceof Error ? razorpayError.message : String(razorpayError);
        showError(`Razorpay error: ${errorMessage}`);
        setProcessing(false);
        reject(new Error('Failed to open payment window. Please try again.'));
      }
    });
  };

  useEffect(() => {
    // Load Razorpay script if not already loaded
    if (!(window as any).Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        console.log('Razorpay script loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        setError('Payment system failed to initialize. Please refresh the page and try again.');
      };
      document.head.appendChild(script);
    } else {
      console.log('Razorpay script already loaded');
    }
  }, []);

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
      const allGateways = await paymentService.getActivePaymentGateways();
      console.log('🔍 All active gateways loaded:', allGateways);
      
      // Debug the actual gateway structure
      if (allGateways.length > 0) {
        console.log('🔍 First gateway details:', {
          name: allGateways[0].name,
          currency_support: allGateways[0].currency_support,
          type: typeof allGateways[0].currency_support,
          is_array: Array.isArray(allGateways[0].currency_support)
        });
      }
      console.log('🔍 Payment request currency:', request.currency);
      
      const activeGateways = allGateways.filter(g => {
        // Handle currency_support as either string or array
        let currencySupport: string[];
        if (typeof g.currency_support === 'string') {
          currencySupport = (g.currency_support as string).split(',').map((c: string) => c.trim());
        } else if (Array.isArray(g.currency_support)) {
          currencySupport = g.currency_support;
        } else {
          currencySupport = [];
        }
        
        // Case-insensitive comparison for currency codes
        const normalizedCurrency = request.currency.trim().toUpperCase();
        const supportsCurrency = currencySupport.some(currency => 
          currency.trim().toUpperCase() === normalizedCurrency
        );
        
        console.log(`🔍 Gateway ${g.name}: supports ${request.currency}=${supportsCurrency}, currencies=${g.currency_support} (parsed: ${currencySupport.join(', ')})`);
        return supportsCurrency;
      });
      
      console.log('🔍 Filtered gateways for currency:', activeGateways);
      setAvailableGateways(activeGateways);

      // Select default gateway
      if (activeGateways.length > 0) {
        console.log('🔍 Setting selected gateway to:', activeGateways[0]);
        setSelectedGateway(activeGateways[0]);
      } else {
        console.log('🚨 No gateways found for currency:', request.currency);
        
        // Emergency fallback: If no gateway matched but we have gateways, use the first one
        // This is a temporary fix to ensure customers can pay
        if (allGateways.length > 0) {
          console.log('🔧 EMERGENCY FALLBACK: Using first available gateway despite currency mismatch');
          setSelectedGateway(allGateways[0]);
        } else {
          setError(`No payment gateways available for ${request.currency}. Please contact support.`);
        }
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
    let isRazorpayModal = false; // Track if we're opening Razorpay modal

    try {
      // Debug gateway data before creating provider
      console.group('🔍 CHECKOUT PAYMENT DEBUG');
      console.log('Selected gateway:', selectedGateway);
      console.log('Gateway settings:', selectedGateway.settings);
      console.log('Provider type:', selectedGateway.provider_type);
      console.log('Is active:', selectedGateway.is_active);
      console.log('Currency support:', selectedGateway.currency_support);
      console.log('Gateway ID:', selectedGateway.id);
      console.groupEnd();

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

      console.log('Payment provider response:', paymentData);

      // Update payment request with gateway order ID (critical for Razorpay)  
      if (paymentData.providerOrderId) {
        console.log('🔄 Updating payment request with gateway_order_id:', paymentData.providerOrderId);
        await paymentService.updatePaymentRequestStatus(
          paymentRequest.id,
          'pending',
          { gateway_order_id: paymentData.providerOrderId }
        );
      }

      // Record payment attempt in database
      await paymentService.createPaymentTransaction({
        payment_request_id: paymentRequest.id,
        gateway_transaction_id: paymentData.providerOrderId || paymentData.orderId, // Use provider order ID first
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        status: 'pending',
        gateway_response: paymentData
      });

      // Handle different payment provider responses
      if (paymentData.paymentUrl) {
        // External redirect (PayPal, Stripe, etc.)
        window.location.href = paymentData.paymentUrl;
      } else if (paymentData.providerData?.modal && selectedGateway.provider_type === 'razorpay') {
        // Razorpay modal payment
        isRazorpayModal = true;
        try {
          await handleRazorpayModal(paymentData.providerData, customerInfo, paymentRequest);
          // Note: setProcessing(false) is handled inside handleRazorpayModal
          return; // Don't call setProcessing(false) in finally block
        } catch (modalError) {
          console.error('Razorpay modal error:', modalError);
          setError(modalError instanceof Error ? modalError.message : 'Payment modal failed');
          setProcessing(false);
          return;
        }
      } else if (paymentData.success) {
        // Payment completed immediately (rare case)
        navigate(`/payment/success/${paymentRequest.id}`);
      } else {
        // Payment failed or requires additional action
        const errorMsg = paymentData.error || 'Payment processing failed';
        setError(errorMsg);
      }

    } catch (err) {
      console.error('Payment processing error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMsg);
    } finally {
      // Only set processing to false if we're not opening a Razorpay modal
      if (!isRazorpayModal) {
        setProcessing(false);
      }
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