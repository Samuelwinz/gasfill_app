// Backend API Example for Paystack Integration
// This should be implemented on your backend server (Node.js/Express example)

const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// Your Paystack secret key (NEVER put this in frontend code)
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_ef024f3acd90ee6aef29ff0707f868c163dc73a3';
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Initialize Payment Endpoint
app.post('/api/payments/initialize', async (req, res) => {
  try {
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

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });

    const result = await response.json();

    if (result.status) {
      res.json({
        success: true,
        data: {
          authorization_url: result.data.authorization_url,
          access_code: result.data.access_code,
          reference: result.data.reference
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message || 'Payment initialization failed'
      });
    }

  } catch (error) {
    console.error('Payment initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify Payment Endpoint
app.get('/api/payments/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Payment reference is required'
      });
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    res.json({
      success: result.status && result.data.status === 'success',
      data: result.data,
      message: result.message
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Paystack Webhook Endpoint (for real-time payment updates)
app.post('/api/payments/webhook', (req, res) => {
  try {
    const hash = crypto
      .createHmac('sha512', PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash === req.headers['x-paystack-signature']) {
      const event = req.body;
      
      // Handle different webhook events
      switch (event.event) {
        case 'charge.success':
          // Payment successful
          console.log('Payment successful:', event.data.reference);
          // Update your database with payment status
          break;
        case 'charge.failed':
          // Payment failed
          console.log('Payment failed:', event.data.reference);
          // Update your database with payment status
          break;
        default:
          console.log('Unhandled webhook event:', event.event);
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(400);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});

module.exports = app;

/*
DEPLOYMENT INSTRUCTIONS:

1. Install dependencies:
   npm install express cors

2. Set environment variables:
   export PAYSTACK_SECRET_KEY=your_secret_key_here
   export PORT=3000

3. Deploy to your preferred platform:
   - Heroku
   - Vercel
   - AWS Lambda
   - Digital Ocean
   - etc.

4. Update the BACKEND_URL in your React Native app to point to your deployed backend

5. Set IS_DEMO_MODE to false in paystack.ts

6. Test thoroughly with Paystack test keys before going live
*/