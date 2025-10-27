// Quick test script for the payment server
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testServer() {
  console.log('🧪 Testing Payment Server...\n');

  // Test 1: Health Check
  try {
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', healthResponse.data);
    console.log();
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('💡 Make sure the server is running: node local-payment-server.js');
    return;
  }

  // Test 2: Initialize Payment
  try {
    console.log('2️⃣ Testing payment initialization...');
    const paymentData = {
      email: 'test@gasfill.com',
      amount: 10000, // 100 GHS in pesewas
      reference: `test_${Date.now()}`,
      currency: 'GHS',
      channels: ['card', 'mobile_money'],
      metadata: {
        customer_name: 'Test Customer',
        order_id: 'test_order_123'
      }
    };

    const initResponse = await axios.post(
      `${BASE_URL}/api/payments/initialize`,
      paymentData
    );

    if (initResponse.data.success) {
      console.log('✅ Payment initialization successful!');
      console.log('📋 Reference:', paymentData.reference);
      console.log('🔗 Authorization URL:', initResponse.data.data.authorization_url);
      console.log();
      return paymentData.reference;
    } else {
      console.log('❌ Payment initialization failed:', initResponse.data.message);
    }
  } catch (error) {
    console.error('❌ Payment initialization error:', error.response?.data || error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run tests
testServer().catch(console.error);
