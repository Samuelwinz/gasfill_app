// Test script for the local payment server
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testHealthCheck() {
  console.log('\n🏥 Testing health check endpoint...');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health check passed:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testPaymentInitialization() {
  console.log('\n💳 Testing payment initialization...');
  try {
    const paymentData = {
      email: 'test@example.com',
      amount: 10000, // GHS 100.00 in pesewas
      currency: 'GHS',
      reference: `test_${Date.now()}`,
      channels: ['card', 'mobile_money'],
      metadata: {
        test: true,
        customer_name: 'Test User'
      }
    };

    console.log('📤 Request:', paymentData);
    const response = await axios.post(`${BASE_URL}/api/payments/initialize`, paymentData);
    console.log('✅ Payment initialization successful!');
    console.log('📥 Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Payment initialization failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function testPaymentVerification(reference) {
  console.log('\n🔍 Testing payment verification...');
  try {
    const response = await axios.get(`${BASE_URL}/api/payments/verify/${reference}`);
    console.log('✅ Payment verification successful!');
    console.log('📥 Response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Payment verification failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting Payment Server Tests...');
  console.log('=' .repeat(50));

  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server is not running or unreachable!');
    console.log('💡 Make sure to start the server first:');
    console.log('   node local-payment-server.js');
    process.exit(1);
  }

  // Test 2: Payment Initialization
  const initResult = await testPaymentInitialization();
  if (!initResult) {
    console.log('\n❌ Payment initialization test failed!');
    process.exit(1);
  }

  // Test 3: Payment Verification (using the reference from initialization)
  if (initResult && initResult.data && initResult.data.reference) {
    await testPaymentVerification(initResult.data.reference);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ All tests completed!');
  console.log('\n📝 Summary:');
  console.log('   - Health check: ✅');
  console.log('   - Payment initialization: ✅');
  console.log('   - Payment verification: ⚠️  (Will fail until payment is completed)');
  console.log('\n💡 Next steps:');
  console.log('   1. Keep the payment server running');
  console.log('   2. Update your mobile app payment config to: http://192.168.8.100:3001');
  console.log('   3. Test payments in your mobile app');
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite failed:', error);
  process.exit(1);
});
