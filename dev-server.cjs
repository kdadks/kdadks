const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const Razorpay = require('razorpay');
require('dotenv').config();

const app = express();
const PORT = 3005;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration in environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Razorpay order creation endpoint
app.post('/api/create-razorpay-order', async (req, res) => {
  try {
    const { gatewayId, amount, currency, receipt, notes } = req.body;

    console.log('Received order creation request:', { gatewayId, amount, currency, receipt, notes });

    if (!gatewayId || !amount || !currency) {
      return res.status(400).json({ 
        error: 'Missing required fields: gatewayId, amount, currency' 
      });
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
      return res.status(404).json({ error: 'Payment gateway not found' });
    }

    const settings = gateway.settings;
    if (!settings.key_id || !settings.key_secret) {
      return res.status(500).json({ error: 'Payment gateway not properly configured' });
    }

    console.log('Using Razorpay credentials:', { key_id: settings.key_id });

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

    res.json({
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
    });

  } catch (error) {
    console.error('Razorpay order creation error:', error);
    
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Development Razorpay server is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Development Razorpay server running on http://localhost:${PORT}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST http://localhost:${PORT}/api/create-razorpay-order`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`\n⚠️  Make sure to set these environment variables:`);
  console.log(`   VITE_SUPABASE_URL`);
  console.log(`   VITE_SUPABASE_ANON_KEY`);
});

module.exports = app;
