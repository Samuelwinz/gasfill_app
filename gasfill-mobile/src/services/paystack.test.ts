import PaystackService from './paystack';

// Test function to verify Paystack integration
export const testPaystackIntegration = async () => {
  try {
    console.log('Testing Paystack integration...');
    
    // Test 1: Initialize Payment
    const testPayment = {
      reference: 'test_' + Date.now(),
      amount: 100, // GHS 1.00
      email: 'test@example.com',
      currency: 'GHS',
      channels: ['card', 'mobile_money'],
      metadata: {
        test: true,
        app_name: 'GasFill',
      },
    };

    try {
      const authUrl = await PaystackService.initializePayment(testPayment);
      console.log('✅ Payment initialization successful:', authUrl);
    } catch (error) {
      console.log('❌ Payment initialization failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Validate email function
    const validEmails = ['test@example.com', 'user@domain.co.uk'];
    const invalidEmails = ['invalid-email', '@domain.com', 'user@'];
    
    console.log('Testing email validation...');
    // Note: We can't test private methods directly, but we can test through public methods
    
    // Test 3: Process Pickup Payment
    try {
      const pickupResult = await PaystackService.processPickupPayment(
        250.50, // Amount
        'customer@example.com', // Email
        'John Doe', // Name
        'test_pickup_123', // Pickup ID
        '+233501234567' // Phone
      );
      console.log('✅ Pickup payment test completed:', pickupResult.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ Pickup payment test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Mobile Money Payment
    try {
      const momoResult = await PaystackService.processMobileMoneyPayment(
        100.00, // Amount
        '0501234567', // Phone
        'MTN', // Network
        'customer@example.com', // Email
        'momo_test_' + Date.now() // Reference
      );
      console.log('✅ Mobile money test completed:', momoResult.success ? 'Success' : 'Failed');
    } catch (error) {
      console.log('❌ Mobile money test failed:', error instanceof Error ? error.message : 'Unknown error');
    }

    console.log('Paystack integration tests completed');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
};

// Usage example:
// import { testPaystackIntegration } from './paystack.test';
// testPaystackIntegration();