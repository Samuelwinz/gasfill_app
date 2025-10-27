import { PaystackPayment, PaystackResponse } from '../types';
import * as WebBrowser from 'expo-web-browser';
import { Platform, Alert } from 'react-native';
import { 
  PAYMENT_CONFIG, 
  PAYMENT_ERRORS, 
  PAYMENT_MESSAGES, 
  PAYMENT_LIMITS 
} from '../config/payment.config';

class PaystackService {
  // Use configuration from config file
  private static readonly PUBLIC_KEY = PAYMENT_CONFIG.paystackPublicKey;
  private static readonly BASE_URL = 'https://api.paystack.co';
  private static readonly BACKEND_URL = PAYMENT_CONFIG.backendUrl;

  // Utility method to format amount to kobo
  private static formatAmountToKobo(amount: number): number {
    return Math.round(amount * 100);
  }

  // Utility method to validate email
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Utility method to validate amount
  private static isValidAmount(amount: number): boolean {
    return amount >= PAYMENT_LIMITS.MIN_AMOUNT && amount <= PAYMENT_LIMITS.MAX_AMOUNT;
  }

  // Utility method to generate reference
  private static generateReference(prefix: string = 'gasfill'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public method to get current configuration
  static getConfiguration(): { 
    publicKey: string; 
    backendUrl: string;
    isDemoMode: boolean;
  } {
    return {
      publicKey: this.PUBLIC_KEY.substring(0, 15) + '...', // Show partial key for security
      backendUrl: this.BACKEND_URL,
      isDemoMode: this.PUBLIC_KEY.includes('test'), // Check if using test key
    };
  }

  // Check if backend server is available
  static async getBackendStatus(): Promise<{ available: boolean; message: string }> {
    try {
      const response = await fetch(`${this.BACKEND_URL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          available: true,
          message: data.message || 'Backend server is online',
        };
      } else {
        return {
          available: false,
          message: 'Backend server responded with error',
        };
      }
    } catch (error) {
      console.error('Backend status check error:', error);
      return {
        available: false,
        message: 'Cannot connect to backend server. Please ensure it is running.',
      };
    }
  }

  /**
   * Initialize payment through backend server
   * Backend uses secret key to call Paystack API securely
   */
  static async initializePayment(payment: PaystackPayment): Promise<string> {
    try {
      // Validate inputs
      if (!this.isValidEmail(payment.email)) {
        throw new Error(PAYMENT_ERRORS.INVALID_EMAIL);
      }
      if (!this.isValidAmount(payment.amount)) {
        throw new Error(PAYMENT_ERRORS.INVALID_AMOUNT);
      }

      console.log('Initializing payment through backend server...');

      // Call backend server to initialize payment
      const response = await fetch(`${this.BACKEND_URL}/api/payments/initialize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payment.email,
          amount: this.formatAmountToKobo(payment.amount),
          currency: payment.currency || 'GHS',
          reference: payment.reference,
          channels: payment.channels || ['card', 'mobile_money', 'bank_transfer'],
          callback_url: payment.callback_url,
          metadata: payment.metadata,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Backend error! status: ${response.status}`);
      }

      if (result.success && result.data?.authorization_url) {
        console.log('Payment initialized successfully through backend');
        return result.data.authorization_url;
      } else {
        throw new Error(result.message || 'Failed to initialize payment');
      }

    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw new Error(`Payment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async processPayment(payment: PaystackPayment): Promise<{ success: boolean; reference: string; data?: any }> {
    try {
      // Generate unique reference if not provided
      const reference = payment.reference || this.generateReference();
      
      console.log('Processing payment with Paystack...');

      // Initialize payment with Paystack API directly
      const authorizationUrl = await this.initializePayment({
        ...payment,
        reference,
      });

      // Configure browser options
      const browserOptions = {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showTitle: true,
        toolbarColor: '#10b981',
        secondaryToolbarColor: '#ffffff',
        enableBarCollapsing: true,
        showInRecents: false,
      };

      // Open payment page in browser
      const result = await WebBrowser.openBrowserAsync(authorizationUrl, browserOptions);

      // Handle different browser result types
      if (result.type === 'dismiss' || result.type === 'cancel') {
        // User dismissed the browser, verify payment status
        const verificationResult = await this.verifyPayment(reference);
        return {
          success: verificationResult.success,
          reference,
          data: verificationResult.data,
        };
      }

      // For other result types, verify the payment
      const verificationResult = await this.verifyPayment(reference);
      return {
        success: verificationResult.success,
        reference,
        data: verificationResult.data,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Provide specific error messages based on error type
      let errorMessage = 'An error occurred while processing your payment. Please try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = 'Authentication error. Please check your payment configuration.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Invalid payment data. Please check your details and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Please provide a valid email address.';
        } else if (error.message.includes('amount')) {
          errorMessage = 'Invalid payment amount. Please check and try again.';
        }
      }

      Alert.alert(
        'Payment Error',
        errorMessage,
        [{ text: 'OK' }]
      );
      
      return {
        success: false,
        reference: payment.reference || '',
      };
    }
  }

  /**
   * Verify payment through backend server
   * Backend uses secret key to verify with Paystack API
   */
  static async verifyPayment(reference: string): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      console.log('Verifying payment through backend server...');

      const response = await fetch(`${this.BACKEND_URL}/api/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Backend error! status: ${response.status}`);
      }

      if (result.success) {
        console.log('Payment verified successfully through backend');
        return {
          success: result.data?.status === 'success',
          data: result.data,
          message: result.message || 'Payment verified',
        };
      } else {
        throw new Error(result.message || 'Verification failed');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  static async processPickupPayment(
    amount: number,
    customerEmail: string,
    customerName: string,
    pickupId: string,
    customerPhone?: string
  ): Promise<{ success: boolean; reference: string; data?: any }> {
    try {
      // Validate inputs
      if (!customerEmail || !customerEmail.includes('@')) {
        throw new Error('Valid email address is required');
      }
      if (amount <= 0) {
        throw new Error('Amount must be greater than zero');
      }

      const payment: PaystackPayment = {
        reference: `pickup_${pickupId}_${Date.now()}`,
        amount,
        email: customerEmail,
        currency: 'GHS',
        channels: ['card', 'mobile_money'],
        metadata: {
          pickup_id: pickupId,
          customer_name: customerName,
          customer_phone: customerPhone,
          service: 'cylinder_pickup_refill',
          app_name: 'GasFill',
        },
      };

      return this.processPayment(payment);
    } catch (error) {
      console.error('Pickup payment error:', error);
      return {
        success: false,
        reference: '',
      };
    }
  }

  static async processRiderPayout(
    riderId: number,
    amount: number,
    method: 'bank_transfer' | 'mobile_money',
    accountDetails: string
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      // In a real implementation, this would call Paystack's transfer API
      // For now, we'll simulate the process
      
      const transferData = {
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: accountDetails,
        reason: `Rider commission payout for rider ${riderId}`,
        currency: 'GHS',
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful response
      const mockTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId: mockTransactionId,
      };
    } catch (error) {
      console.error('Payout processing error:', error);
      return { success: false };
    }
  }

  static async createTransferRecipient(
    name: string,
    accountNumber: string,
    bankCode: string,
    type: 'bank' | 'mobile_money' = 'bank'
  ): Promise<{ success: boolean; recipientCode?: string }> {
    try {
      const response = await fetch(`${this.BASE_URL}/transferrecipient`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'GHS',
        }),
      });

      const result = await response.json();
      
      return {
        success: result.status,
        recipientCode: result.data?.recipient_code,
      };
    } catch (error) {
      console.error('Transfer recipient creation error:', error);
      return { success: false };
    }
  }

  static async getBanks(): Promise<{ code: string; name: string }[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/bank?currency=GHS`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.status) {
        return result.data.map((bank: any) => ({
          code: bank.code,
          name: bank.name,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Banks fetch error:', error);
      return [];
    }
  }

  static async validateAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ success: boolean; accountName?: string }> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.PUBLIC_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();
      
      return {
        success: result.status,
        accountName: result.data?.account_name,
      };
    } catch (error) {
      console.error('Account validation error:', error);
      return { success: false };
    }
  }

  // Mobile Money specific methods for Ghana
  static async processMobileMoneyPayment(
    amount: number,
    phoneNumber: string,
    network: 'MTN' | 'VODAFONE' | 'TIGO',
    customerEmail: string,
    reference?: string
  ): Promise<{ success: boolean; reference: string; data?: any }> {
    try {
      // Validate phone number format
      const cleanPhone = phoneNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        throw new Error('Invalid phone number format');
      }

      const payment: PaystackPayment = {
        reference: reference || `momo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        email: customerEmail,
        currency: 'GHS',
        channels: ['mobile_money'],
        metadata: {
          phone_number: phoneNumber,
          network,
          payment_method: 'mobile_money',
          app_name: 'GasFill',
        },
      };

      return this.processPayment(payment);
    } catch (error) {
      console.error('Mobile money payment error:', error);
      return {
        success: false,
        reference: reference || '',
      };
    }
  }

  static async initiateMobileMoneyPayout(
    phoneNumber: string,
    amount: number,
    network: 'MTN' | 'VODAFONE' | 'TIGO'
  ): Promise<{ success: boolean; transactionId?: string }> {
    try {
      // In a real implementation, this would use Paystack's mobile money transfer API
      // For now, we'll simulate the process
      
      const transferData = {
        source: 'balance',
        amount: amount * 100, // Convert to kobo
        recipient: phoneNumber,
        reason: 'Rider commission payout',
        currency: 'GHS',
        metadata: {
          network,
          type: 'mobile_money',
        },
      };

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Mock successful response
      const mockTransactionId = `MOMO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        transactionId: mockTransactionId,
      };
    } catch (error) {
      console.error('Mobile money payout error:', error);
      return { success: false };
    }
  }
}

export default PaystackService;