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
    console.log('Fetching gateway with ID:', gatewayId);
    
    const { data: gateway, error: gatewayError } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('id', gatewayId)
      .eq('provider_type', 'razorpay')
      .eq('is_active', true)
      .single();

    console.log('Gateway query result:', { gateway, gatewayError });

    if (gatewayError || !gateway) {
      console.error('Gateway fetch error:', gatewayError);
      console.error('Available gateways check...');
      
      // Try to get all gateways for debugging
      const { data: allGateways, error: allError } = await supabase
        .from('payment_gateways')
        .select('id, name, provider_type, is_active');
        
      console.log('All gateways:', allGateways);
      console.log('All gateways error:', allError);
      
      // Fallback: Use mock gateway for development
      if (allError || !allGateways || allGateways.length === 0) {
        console.log('🔄 Using mock gateway for development testing...');
        
        const mockGateway = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Razorpay India (Test)',
          provider_type: 'razorpay',
          settings: {
            key_id: 'rzp_test_9WVjBCTiCyayCR',
            key_secret: 'REPLACE_WITH_YOUR_ACTUAL_SECRET',
            webhook_secret: 'REPLACE_WITH_WEBHOOK_SECRET',
            environment: 'test'
          },
          is_active: true,
          is_sandbox: true
        };
        
        console.log('Using mock gateway:', mockGateway.name);
        console.log('Mock key_id:', mockGateway.settings.key_id);
        
        // Use mock gateway settings
        gateway = mockGateway;
      } else {
        return res.status(404).json({ 
          error: 'Payment gateway not found',
          debug: {
            gatewayId,
            gatewayError: gatewayError?.message,
            availableGateways: allGateways?.length || 0
          }
        });
      }
    }

    const settings = gateway.settings;
    if (!settings.key_id || !settings.key_secret) {
      return res.status(500).json({ error: 'Payment gateway not properly configured' });
    }

    // Check if using mock credentials
    if (settings.key_secret === 'REPLACE_WITH_YOUR_ACTUAL_SECRET') {
      console.warn('⚠️  WARNING: Using mock credentials! Replace with actual Razorpay secret key.');
      console.warn('⚠️  This will fail with real Razorpay API calls.');
      console.warn('⚠️  Get your test credentials from: https://dashboard.razorpay.com/app/keys');
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
