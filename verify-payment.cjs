// Manual Payment Verification Service
const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function verifyAndUpdatePaymentStatus(paymentId) {
  try {
    console.log('🔍 Verifying payment:', paymentId);

    // Get Razorpay gateway settings
    const { data: gateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('settings')
      .eq('provider_type', 'razorpay')
      .eq('is_active', true)
      .single();

    if (gatewayError || !gateway) {
      throw new Error('Razorpay gateway not found or configured');
    }

    // Initialize Razorpay client
    const razorpay = new Razorpay({
      key_id: gateway.settings.key_id,
      key_secret: gateway.settings.key_secret
    });

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(paymentId);
    console.log('📄 Payment details from Razorpay:', payment);

    // Find corresponding transaction in database
    const { data: transaction, error: transactionError } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('gateway_payment_id', paymentId)
      .or(`gateway_transaction_id.eq.${payment.order_id}`)
      .single();

    if (transactionError || !transaction) {
      console.log('❌ Transaction not found in database');
      return { success: false, error: 'Transaction not found' };
    }

    console.log('📋 Current transaction status:', transaction.status);

    // Update transaction based on Razorpay status
    let newStatus = 'pending';
    if (payment.status === 'captured') {
      newStatus = 'success';
    } else if (payment.status === 'failed') {
      newStatus = 'failed';
    }

    if (transaction.status !== newStatus) {
      console.log('🔄 Updating transaction status from', transaction.status, 'to', newStatus);

      // Update transaction
      const { error: updateError } = await supabase
        .from('payment_transactions')
        .update({
          status: newStatus,
          gateway_payment_id: payment.id,
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
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (updateError) {
        throw updateError;
      }

      // Update payment request if successful
      if (newStatus === 'success') {
        const { error: requestUpdateError } = await supabase
          .from('payment_requests')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            gateway_payment_id: payment.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', transaction.payment_request_id);

        if (requestUpdateError) {
          console.error('❌ Failed to update payment request:', requestUpdateError);
        }

        console.log('✅ Payment verified and status updated to success');
        return { 
          success: true, 
          status: 'updated', 
          payment: payment,
          transaction: transaction 
        };
      }
    } else {
      console.log('ℹ️  Transaction status already up to date');
      return { 
        success: true, 
        status: 'already_updated', 
        payment: payment,
        transaction: transaction 
      };
    }

    return { 
      success: true, 
      status: 'verified', 
      payment: payment,
      transaction: transaction 
    };

  } catch (error) {
    console.error('❌ Payment verification failed:', error);
    return { success: false, error: error.message };
  }
}

// Run verification if payment ID provided as argument
if (process.argv.length > 2) {
  const paymentId = process.argv[2];
  console.log('🚀 Starting manual payment verification...');
  console.log('Payment ID:', paymentId);

  verifyAndUpdatePaymentStatus(paymentId)
    .then(result => {
      console.log('📊 Verification result:', result);
      if (result.success) {
        console.log('✅ Payment verification completed successfully');
      } else {
        console.log('❌ Payment verification failed:', result.error);
      }
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Verification script failed:', error);
      process.exit(1);
    });
} else {
  console.log('Usage: node verify-payment.cjs <razorpay_payment_id>');
  console.log('Example: node verify-payment.cjs pay_XXXXXXXXXXXXXXX');
  process.exit(1);
}

// Export for use in other scripts
module.exports = { verifyAndUpdatePaymentStatus };
