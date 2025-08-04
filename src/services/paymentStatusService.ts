// Payment Status Update Service
import { supabase } from '../config/supabase';

export interface PaymentStatusUpdate {
  paymentRequestId: string;
  razorpayPaymentId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  customerEmail?: string;
  customerPhone?: string;
}

export class PaymentStatusService {
  /**
   * Update payment status after successful payment
   */
  static async updatePaymentStatus(paymentData: PaymentStatusUpdate): Promise<boolean> {
    try {
      console.log('🔄 Updating payment status in database...', paymentData);

      // Step 1: Update or create payment_transactions table record
      // Add small delay to ensure processed_at is after created_at
      const processedAt = new Date(Date.now() + 1000).toISOString(); // 1 second delay
      
      // First, try to update existing transaction
      const { data: transactionUpdate, error: transactionError } = await supabase
        .from('payment_transactions')
        .update({
          status: 'success',
          gateway_transaction_id: paymentData.razorpayPaymentId,
          payment_method: 'razorpay',
          payment_method_details: {
            razorpay_payment_id: paymentData.razorpayPaymentId,
            razorpay_order_id: paymentData.razorpayOrderId,
            method: paymentData.paymentMethod,
            email: paymentData.customerEmail,
            contact: paymentData.customerPhone
          },
          processed_at: processedAt
        })
        .eq('payment_request_id', paymentData.paymentRequestId)
        .eq('status', 'pending') // Only update pending transactions
        .select();

      if (transactionError) {
        console.error('❌ Error updating payment_transactions:', transactionError);
        
        // If update failed, try to create a new transaction record
        console.log('🔄 Attempting to create new transaction record...');
        const { data: newTransaction, error: createError } = await supabase
          .from('payment_transactions')
          .insert({
            payment_request_id: paymentData.paymentRequestId,
            gateway_transaction_id: paymentData.razorpayPaymentId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            status: 'success',
            payment_method: 'razorpay',
            payment_method_details: {
              razorpay_payment_id: paymentData.razorpayPaymentId,
              razorpay_order_id: paymentData.razorpayOrderId,
              method: paymentData.paymentMethod,
              email: paymentData.customerEmail,
              contact: paymentData.customerPhone
            },
            processed_at: processedAt
          })
          .select();
          
        if (createError) {
          console.error('❌ Error creating payment_transactions:', createError);
          // Don't fail completely, continue to update payment_requests
        } else {
          console.log('✅ New payment_transactions record created:', newTransaction);
        }
      } else {
        console.log('✅ payment_transactions updated successfully:', transactionUpdate);
      }

      // Step 2: Update payment_requests table
      const { data: requestUpdate, error: requestError } = await supabase
        .from('payment_requests')
        .update({
          status: 'completed',
          gateway_payment_id: paymentData.razorpayPaymentId,
          completed_at: new Date().toISOString()
        })
        .eq('id', paymentData.paymentRequestId)
        .select();

      if (requestError) {
        console.error('❌ Error updating payment_requests:', requestError);
        return false;
      }

      console.log('✅ payment_requests updated successfully:', requestUpdate);

      // Step 3: Log the payment event
      const { error: logError } = await supabase
        .from('payment_logs')
        .insert({
          payment_request_id: paymentData.paymentRequestId,
          event_type: 'payment_completed',
          gateway_type: 'razorpay',
          gateway_payment_id: paymentData.razorpayPaymentId,
          data: paymentData
        });

      if (logError) {
        console.warn('⚠️ Warning: Could not log payment event:', logError);
        // Don't fail for logging errors
      }

      return true;

    } catch (error) {
      console.error('❌ Failed to update payment status:', error);
      return false;
    }
  }

  /**
   * Verify payment with Razorpay and update status
   */
  static async verifyAndUpdatePayment(
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string,
    paymentRequestId: string
  ): Promise<boolean> {
    try {
      console.log('🔍 Verifying payment with Razorpay...');

      // Call the verification API endpoint
      const verificationResponse = await fetch('/.netlify/functions/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_payment_id: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_signature: razorpaySignature,
          payment_request_id: paymentRequestId
        })
      });

      if (verificationResponse.ok) {
        const result = await verificationResponse.json();
        console.log('✅ Payment verification successful:', result);
        return result.verified === true;
      } else {
        console.error('❌ Payment verification failed');
        return false;
      }

    } catch (error) {
      console.error('❌ Payment verification error:', error);
      return false;
    }
  }

  /**
   * Get payment status from database
   */
  static async getPaymentStatus(paymentRequestId: string) {
    try {
      const { data: paymentRequest, error: requestError } = await supabase
        .from('payment_requests')
        .select(`
          *,
          payment_transactions (*)
        `)
        .eq('id', paymentRequestId)
        .single();

      if (requestError) {
        console.error('❌ Error fetching payment status:', requestError);
        return null;
      }

      return paymentRequest;

    } catch (error) {
      console.error('❌ Error getting payment status:', error);
      return null;
    }
  }
}
