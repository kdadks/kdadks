const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for PDF attachments
app.use(express.urlencoded({ extended: true }));

// Email API endpoint
app.post('/api/send-email', require('./api/send-email'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'KDADKS Email Service', port: PORT });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'KDADKS Local Email Service', 
    endpoints: [
      'POST /api/send-email - Send emails via Brevo SMTP',
      'GET /health - Health check'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 KDADKS Email Service running on http://localhost:${PORT}`);
  console.log(`📧 Email endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  
  if (!process.env.BREVO_PASSWORD) {
    console.warn('⚠️  WARNING: BREVO_PASSWORD environment variable is not set!');
    console.warn('   Add BREVO_PASSWORD to your .env file for email functionality to work.');
  } else {
    console.log('✅ BREVO_PASSWORD environment variable found');
  }
});
