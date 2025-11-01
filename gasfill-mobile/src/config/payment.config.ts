// Payment Configuration
// This file manages payment settings for the GasFill app

export interface PaymentConfig {
  isDemoMode: boolean;
  paystackPublicKey: string;
  backendUrl: string;
  supportedCurrencies: string[];
  supportedChannels: string[];
  defaultCurrency: string;
  autoFallbackToDemo: boolean; // New: Auto fallback to demo if backend unavailable
}

// Environment-based configuration
const getPaymentConfig = (): PaymentConfig => {
  // You can set this based on your build configuration
  const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
  
  return {
    // Using backend server for Paystack integration
    // Backend handles secret key securely
    isDemoMode: true, // Using demo mode for development
    
    // Auto fallback enabled - will fallback to demo if backend unavailable
    autoFallbackToDemo: true,
    
    // Paystack public key (safe to expose in frontend)
    paystackPublicKey: isDevelopment 
      ? 'pk_test_8f47d72c938927ad07587345c116684e3ce8266f' // Your test public key
      : 'pk_live_your_live_public_key_here', // Live key for production
    
    // Backend URL for payment processing
    backendUrl: isDevelopment
      ? 'http://192.168.8.100:3001' // Local payment server (run: node backend/local-payment-server.js)
      : 'https://your-production-backend.com', // Production backend
    
    // Supported payment options
    supportedCurrencies: ['GHS', 'NGN', 'USD'],
    supportedChannels: ['card', 'mobile_money', 'bank_transfer'],
    defaultCurrency: 'GHS',
  };
};

export const PAYMENT_CONFIG = getPaymentConfig();

// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Mobile money networks for Ghana
export const MOBILE_MONEY_NETWORKS = {
  MTN: 'MTN',
  VODAFONE: 'VODAFONE',
  TIGO: 'TIGO',
} as const;

// Payment amount limits (in base currency)
export const PAYMENT_LIMITS = {
  MIN_AMOUNT: 1.00, // Minimum GHS 1.00
  MAX_AMOUNT: 10000.00, // Maximum GHS 10,000.00
  DEMO_AMOUNT: 100.00, // Default demo amount
};

// Error messages
export const PAYMENT_ERRORS = {
  INVALID_EMAIL: 'Please provide a valid email address',
  INVALID_AMOUNT: 'Payment amount must be between GHS 1.00 and GHS 10,000.00',
  NETWORK_ERROR: 'Network error. Please check your internet connection and try again',
  AUTH_ERROR: 'Authentication error. Please try again or contact support',
  GENERAL_ERROR: 'An error occurred while processing your payment. Please try again',
  DEMO_MODE: 'This is a demo payment. No actual charges will be made',
};

// Success messages
export const PAYMENT_MESSAGES = {
  SUCCESS: 'Payment processed successfully!',
  DEMO_SUCCESS: 'Demo payment completed successfully!',
  VERIFICATION_SUCCESS: 'Payment verified successfully',
};

export default PAYMENT_CONFIG;