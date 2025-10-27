// Simple Payment Server for Local Testing
// Run this with: node local-payment-server.js

const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Using axios instead of node-fetch

const app = express();
app.use(cors());
app.use(express.json());

// Your actual Paystack secret key
const PAYSTACK_SECRET_KEY = 'sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

console.log('🔐 Using Paystack Secret Key:', PAYSTACK_SECRET_KEY.substring(0, 15) + '...');

// Initialize Payment Endpoint
app.post('/api/payments/initialize', async (req, res) => {
  try {
    console.log('💳 Initializing payment:', req.body);
    
    const { email, amount, currency, reference, channels, callback_url, metadata } = req.body;

    // Validate input
    if (!email || !amount || !reference) {
      return res.status(400).json({
        success: false,
        message: 'Email, amount, and reference are required'
      });
    }

    const paymentData = {
      email,
      amount: Math.round(amount), // Amount should already be in kobo
      currency: currency || 'GHS',
      reference,
      channels: channels || ['card', 'mobile_money'],
      callback_url,
      metadata: {
        ...metadata,
        source: 'gasfill_app'
      }
    };

    console.log('📤 Sending to Paystack:', paymentData);

    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      paymentData,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const result = response.data;
    console.log('📥 Paystack response:', result);

    if (result.status) {
      res.json({
        success: true,
        data: {
          authorization_url: result.data.authorization_url,
          access_code: result.data.access_code,
          reference: result.data.reference
        }
      });
      console.log('✅ Payment initialized successfully');
    } else {
      console.log('❌ Payment initialization failed:', result.message);
      res.status(400).json({
        success: false,
        message: result.message || 'Payment initialization failed'
      });
    }

  } catch (error) {
    console.error('💥 Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Verify Payment Endpoint
app.get('/api/payments/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    console.log('🔍 Verifying payment:', reference);

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        }
      }
    );

    const result = response.data;
    console.log('📋 Verification result:', result);

    res.json({
      success: result.status && result.data.status === 'success',
      data: result.data,
      message: result.message
    });

    if (result.status && result.data.status === 'success') {
      console.log('✅ Payment verified successfully');
    } else {
      console.log('❌ Payment verification failed');
    }

  } catch (error) {
    console.error('💥 Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Payment server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Payment server running on http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`💳 Payment endpoint: http://localhost:${PORT}/api/payments/initialize`);
  console.log(`🔍 Verify endpoint: http://localhost:${PORT}/api/payments/verify/:reference`);
});

module.exports = app;