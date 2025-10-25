import { PaystackPayment, PaystackResponse } from '../types';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

class PaystackService {
  private static readonly PUBLIC_KEY = 'pk_test_your_paystack_public_key'; // Replace with actual key
  private static readonly BASE_URL = 'https://api.paystack.co';

  static async initializePayment(payment: PaystackPayment): Promise<string> {
    try {
      const response = await fetch(`${this.BASE_URL}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: payment.email,
          amount: payment.amount * 100, // Convert to kobo
          currency: payment.currency || 'GHS',
          reference: payment.reference,
          channels: payment.channels || ['card', 'mobile_money'],
          callback_url: payment.callback_url,
          metadata: payment.metadata,
        }),
      });

      const result: PaystackResponse = await response.json();
      
      if (result.status) {
        return result.data.authorization_url;
      } else {
        throw new Error(result.message || 'Failed to initialize payment');
      }
    } catch (error) {
      console.error('Paystack initialization error:', error);
      throw error;
    }
  }

  static async processPayment(payment: PaystackPayment): Promise<{ success: boolean; reference: string }> {
    try {
      // Generate unique reference
      const reference = payment.reference || `gasfill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize payment
      const authorizationUrl = await this.initializePayment({
        ...payment,
        reference,
      });

      // Open payment page in browser
      const result = await WebBrowser.openBrowserAsync(authorizationUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        showTitle: true,
        toolbarColor: '#0b5ed7',
        secondaryToolbarColor: '#ffffff',
      });

      // Check if payment was completed
      if (result.type === 'dismiss') {
        // User dismissed the browser, check payment status
        const paymentStatus = await this.verifyPayment(reference);
        return {
          success: paymentStatus.success,
          reference,
        };
      }

      // Default to successful if browser opened
      return {
        success: true,
        reference,
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        reference: payment.reference || '',
      };
    }
  }

  static async verifyPayment(reference: string): Promise<{ success: boolean; data?: any }> {
    try {
      const response = await fetch(`${this.BASE_URL}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.PUBLIC_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      return {
        success: result.status && result.data.status === 'success',
        data: result.data,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return { success: false };
    }
  }

  static async processPickupPayment(
    amount: number,
    customerEmail: string,
    customerName: string,
    pickupId: string
  ): Promise<{ success: boolean; reference: string }> {
    const payment: PaystackPayment = {
      reference: `pickup_${pickupId}_${Date.now()}`,
      amount,
      email: customerEmail,
      currency: 'GHS',
      channels: ['card', 'mobile_money'],
      metadata: {
        pickup_id: pickupId,
        customer_name: customerName,
        service: 'cylinder_pickup_refill',
      },
    };

    return this.processPayment(payment);
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
  ): Promise<{ success: boolean; reference: string }> {
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
      },
    };

    return this.processPayment(payment);
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