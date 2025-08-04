import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  CreditCard
} from 'lucide-react';
import { paymentService } from '../../services/paymentService';
import type { PaymentRequest, PaymentTransaction } from '../../types/payment';

export const PaymentPage: React.FC = () => {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get status from URL params (from webhook redirect)
  const statusFromUrl = searchParams.get('status');
  const gatewayRef = searchParams.get('payment_id') || searchParams.get('razorpay_payment_id');

  useEffect(() => {
    if (requestId) {
      loadPaymentData();
    }
  }, [requestId]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load payment request
      const request = await paymentService.getPaymentRequestById(requestId!);
      if (!request) {
        throw new Error('Payment request not found');
      }
      setPaymentRequest(request);

      // Load associated transactions
      const txns = await paymentService.getTransactionsByPaymentRequest(requestId!);
      setTransactions(txns);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPaymentData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-12 h-12 text-green-500" />;
      case 'failed':
        return <XCircle className="w-12 h-12 text-red-500" />;
      case 'pending':
        return <Clock className="w-12 h-12 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-12 h-12 text-gray-500" />;
      default:
        return <AlertTriangle className="w-12 h-12 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'failed':
        return 'text-red-800 bg-red-100 border-red-200';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'cancelled':
        return 'text-gray-800 bg-gray-100 border-gray-200';
      default:
        return 'text-orange-800 bg-orange-100 border-orange-200';
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully.'
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again or contact support.'
        };
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Your payment is being processed. Please wait for confirmation.'
        };
      case 'cancelled':
        return {
          title: 'Payment Cancelled',
          message: 'The payment was cancelled. You can try again if needed.'
        };
      case 'expired':
        return {
          title: 'Payment Expired',
          message: 'This payment request has expired. Please request a new payment link.'
        };
      default:
        return {
          title: 'Payment Status Unknown',
          message: 'We are checking your payment status. Please wait a moment.'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Loading Payment Status
          </h2>
          <p className="text-gray-600 text-center">Please wait while we check your payment...</p>
        </div>
      </div>
    );
  }

  if (error && !paymentRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-center text-gray-900 mb-2">
            Payment Not Found
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

  const latestTransaction = transactions.length > 0 ? transactions[0] : null;
  const currentStatus = statusFromUrl || paymentRequest?.status || latestTransaction?.status || 'pending';
  const statusInfo = getStatusMessage(currentStatus);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            {getStatusIcon(currentStatus)}
            <h1 className="text-2xl font-bold text-gray-900 mt-4 mb-2">
              {statusInfo.title}
            </h1>
            <p className="text-gray-600">{statusInfo.message}</p>
          </div>

          {/* Status Badge */}
          <div className="flex justify-center mb-6">
            <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(currentStatus)}`}>
              {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}
            </span>
          </div>

          {/* Payment Details */}
          {paymentRequest && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-600">Amount</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(paymentRequest.amount, paymentRequest.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Payment ID</span>
                  <p className="text-sm font-medium text-gray-900">{paymentRequest.id}</p>
                </div>
                {paymentRequest.description && (
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-600">Description</span>
                    <p className="text-sm text-gray-900">{paymentRequest.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600">Created</span>
                  <p className="text-sm text-gray-900">
                    {new Date(paymentRequest.created_at).toLocaleString()}
                  </p>
                </div>
                {latestTransaction?.processed_at && (
                  <div>
                    <span className="text-sm text-gray-600">Processed</span>
                    <p className="text-sm text-gray-900">
                      {new Date(latestTransaction.processed_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gateway Reference */}
          {gatewayRef && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Gateway Reference:</span>
                <span className="text-sm font-medium text-gray-900">{gatewayRef}</span>
              </div>
            </div>
          )}
        </div>

        {/* Transaction History */}
        {transactions.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className={`border rounded-lg p-4 ${
                    index === 0 ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(transaction.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Transaction ID:</span>
                      <p className="font-medium text-gray-900 break-all">
                        {transaction.gateway_transaction_id}
                      </p>
                    </div>
                    {transaction.payment_method && (
                      <div>
                        <span className="text-gray-600">Payment Method:</span>
                        <p className="font-medium text-gray-900">{transaction.payment_method}</p>
                      </div>
                    )}
                    {transaction.gateway_fee && (
                      <div>
                        <span className="text-gray-600">Gateway Fee:</span>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(transaction.gateway_fee, transaction.currency)}
                        </p>
                      </div>
                    )}
                  </div>

                  {transaction.failure_reason && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                      <span className="text-sm text-red-800 font-medium">Failure Reason:</span>
                      <p className="text-sm text-red-700 mt-1">{transaction.failure_reason}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {currentStatus === 'failed' && paymentRequest && (
            <button
              onClick={() => navigate(`/payment/checkout/${paymentRequest.id}`)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          )}

          {currentStatus === 'completed' && (
            <button
              onClick={() => {
                // Generate receipt download
                window.print();
              }}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download Receipt</span>
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </button>
        </div>

        {/* Support Notice */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-600">
            Having issues with your payment?{' '}
            <a href="/contact" className="text-blue-600 hover:text-blue-700 underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};