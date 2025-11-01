// Quick network connectivity test for payment server
const axios = require('axios');

const PAYMENT_SERVER_URL = 'http://192.168.8.100:3001';

async function testConnection() {
  console.log('🔍 Testing Payment Server Connectivity\n');
  console.log('Server URL:', PAYMENT_SERVER_URL);
  console.log('=' .repeat(50) + '\n');

  // Test 1: Health Check
  console.log('1️⃣  Testing health endpoint...');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${PAYMENT_SERVER_URL}/health`, {
      timeout: 5000
    });
    const duration = Date.now() - startTime;
    
    console.log(`✅ Health check successful (${duration}ms)`);
    console.log('   Response:', response.data);
  } catch (error) {
    console.log('❌ Health check failed');
    if (error.code === 'ECONNREFUSED') {
      console.log('   Error: Connection refused - server not running');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   Error: Connection timed out');
    } else if (error.code === 'ECONNRESET') {
      console.log('   Error: Connection reset');
    } else {
      console.log('   Error:', error.message);
    }
    console.log('\n💡 Make sure the payment server is running:');
    console.log('   node local-payment-server.js');
    return false;
  }

  console.log();

  // Test 2: Payment Initialization (mock)
  console.log('2️⃣  Testing payment initialization endpoint...');
  try {
    const startTime = Date.now();
    const response = await axios.post(
      `${PAYMENT_SERVER_URL}/api/payments/initialize`,
      {
        email: 'test@example.com',
        amount: 10000,
        currency: 'GHS',
        reference: `test_${Date.now()}`,
      },
      { timeout: 10000 }
    );
    const duration = Date.now() - startTime;
    
    console.log(`✅ Payment initialization successful (${duration}ms)`);
    console.log('   Payment URL generated:', response.data.data?.authorization_url ? 'Yes' : 'No');
  } catch (error) {
    console.log('❌ Payment initialization failed');
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.message || error.response.data);
    } else {
      console.log('   Error:', error.message);
    }
  }

  console.log();
  console.log('=' .repeat(50));
  console.log('\n📱 Mobile App Configuration:');
  console.log('   Update payment.config.ts:');
  console.log(`   backendUrl: '${PAYMENT_SERVER_URL}'`);
  console.log('   isDemoMode: true (for testing)');
  console.log();
  console.log('✅ Payment server is accessible!');
  console.log('   Your mobile app should be able to connect.');
  
  return true;
}

// Run the test
testConnection().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
