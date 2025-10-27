import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StorageService } from '../utils/storage';
import { OrderCreateRequest, OrderItem, PaystackPayment } from '../types';
import ApiService from '../services/api';
import PaystackService from '../services/paystack';
import PaymentStatus from '../components/PaymentStatus';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Loading from '../components/Loading';

const CheckoutScreen: React.FC = () => {
  const navigation = useNavigation();
  const { cart, totalPrice: cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false); // Track if order was successfully placed
  
  // Form fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryType, setDeliveryType] = useState<'standard' | 'express'>('standard');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');

  // Toast state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  // Pricing
  const DELIVERY_FEES = {
    standard: 10,
    express: 25,
  };

  useEffect(() => {
    // Check if cart is empty (but not after successful order placement)
    if (cart.length === 0 && !orderPlaced) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add some products first.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    }
    loadUserData();
  }, [cart, orderPlaced]);

  const loadUserData = () => {
    if (user) {
      setCustomerName(user.username || '');
      setCustomerEmail(user.email || '');
      setCustomerPhone(user.phone || '');
      setCustomerAddress(user.address || '');
    }
  };

  const getSubtotal = () => {
    return cartTotal;
  };

  const getDeliveryFee = () => {
    return DELIVERY_FEES[deliveryType];
  };

  const getTotalAmount = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const validateForm = (): boolean => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter your name');
      return false;
    }
    if (!customerEmail.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(customerEmail)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return false;
    }
    if (!customerAddress.trim()) {
      Alert.alert('Validation Error', 'Please enter your delivery address');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    setProcessing(true);

    try {
      // Convert cart items to order items
      const orderItems: OrderItem[] = cart.map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
      }));

      const totalAmount = getTotalAmount();

      // Create payment object for Paystack
      const payment: PaystackPayment = {
        reference: `order_${Date.now()}`,
        amount: totalAmount,
        email: customerEmail,
        currency: 'GHS',
        channels: ['card', 'mobile_money'],
        metadata: {
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_type: deliveryType,
          order_items: orderItems,
        },
      };

      // Process payment with Paystack
      const paymentResult = await PaystackService.processPayment(payment);

      if (!paymentResult.success) {
        throw new Error('Payment was not completed');
      }

      // Create order after successful payment
      const orderData: OrderCreateRequest = {
        items: orderItems,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_address: customerAddress,
        total: totalAmount,
        delivery_type: deliveryType,
      };

      try {
        const order = await ApiService.createOrder(orderData);
        
        // Save order locally
        await StorageService.addOrder(order);
        
        // Mark order as placed BEFORE clearing cart to prevent empty cart alert
        setOrderPlaced(true);
        
        // Clear cart
        await clearCart();
        
        setToast({
          visible: true,
          message: 'Order placed successfully!',
          type: 'success',
        });

        setTimeout(() => {
          Alert.alert(
            'Order Placed Successfully! 🎉',
            `Your order #${order.id} has been placed and payment confirmed.\n\nTotal: ₵${totalAmount.toFixed(2)}\n\nYou'll receive updates via email and SMS.`,
            [
              {
                text: 'View Orders',
                onPress: () => {
                  (navigation as any).navigate('MainTabs', { screen: 'Orders' });
                }
              },
              {
                text: 'Continue Shopping',
                onPress: () => {
                  (navigation as any).navigate('MainTabs', { screen: 'Products' });
                }
              }
            ]
          );
        }, 1000);
      } catch (apiError) {
        console.error('API order creation failed:', apiError);
        
        // Create local order even if API fails
        const localOrder = {
          id: `local_${Date.now()}`,
          items: orderItems,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          customer_address: customerAddress,
          total: totalAmount,
          delivery_type: deliveryType,
          status: 'pending' as const,
          payment_status: 'completed' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        await StorageService.addOrder(localOrder);
        
        // Mark order as placed BEFORE clearing cart to prevent empty cart alert
        setOrderPlaced(true);
        
        await clearCart();
        
        setToast({
          visible: true,
          message: 'Order saved locally',
          type: 'info',
        });

        setTimeout(() => {
          Alert.alert(
            'Order Saved Locally ✓',
            `Payment confirmed! Your order has been saved locally and will sync when connection is restored.\n\nTotal: ₵${totalAmount.toFixed(2)}`,
            [
              {
                text: 'OK',
                onPress: () => (navigation as any).navigate('MainTabs', { screen: 'Orders' })
              }
            ]
          );
        }, 1000);
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      setToast({
        visible: true,
        message: error.message || 'Checkout failed',
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading checkout..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Toast 
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e40af" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Payment Status */}
          <PaymentStatus />

          {/* Order Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="basket-outline" size={22} color="#1e40af" />
              <Text style={styles.sectionTitle}>Order Summary</Text>
            </View>
            
            {cart.map((item) => (
              <View key={item.id} style={styles.orderItem}>
                <View style={styles.orderItemLeft}>
                  <Text style={styles.orderItemName}>{item.name}</Text>
                  <Text style={styles.orderItemDetails}>₵{item.price} × {item.qty}</Text>
                </View>
                <Text style={styles.orderItemTotal}>₵{(item.price * item.qty).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₵{getSubtotal().toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>₵{getDeliveryFee().toFixed(2)}</Text>
            </View>
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₵{getTotalAmount().toFixed(2)}</Text>
            </View>
          </View>

          {/* Delivery Type */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bicycle-outline" size={22} color="#1e40af" />
              <Text style={styles.sectionTitle}>Delivery Type</Text>
            </View>
            
            <View style={styles.deliveryOptions}>
              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'standard' && styles.deliveryOptionActive
                ]}
                onPress={() => setDeliveryType('standard')}
              >
                <View style={styles.radioOuter}>
                  {deliveryType === 'standard' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={[
                    styles.deliveryLabel,
                    deliveryType === 'standard' && styles.deliveryLabelActive
                  ]}>
                    Standard Delivery
                  </Text>
                  <Text style={styles.deliveryTime}>2-3 business days</Text>
                </View>
                <Text style={styles.deliveryPrice}>₵{DELIVERY_FEES.standard}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.deliveryOption,
                  deliveryType === 'express' && styles.deliveryOptionActive
                ]}
                onPress={() => setDeliveryType('express')}
              >
                <View style={styles.radioOuter}>
                  {deliveryType === 'express' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.deliveryInfo}>
                  <Text style={[
                    styles.deliveryLabel,
                    deliveryType === 'express' && styles.deliveryLabelActive
                  ]}>
                    Express Delivery
                  </Text>
                  <Text style={styles.deliveryTime}>Same day delivery</Text>
                </View>
                <Text style={styles.deliveryPrice}>₵{DELIVERY_FEES.express}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={22} color="#1e40af" />
              <Text style={styles.sectionTitle}>Customer Information</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Enter your full name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                value={customerEmail}
                onChangeText={setCustomerEmail}
                placeholder="your@email.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="+233 XX XXX XXXX"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Delivery Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={customerAddress}
                onChangeText={setCustomerAddress}
                placeholder="Enter your complete delivery address"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="card-outline" size={22} color="#1e40af" />
              <Text style={styles.sectionTitle}>Payment Method</Text>
            </View>

            <View style={styles.paymentOptions}>
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'card' && styles.paymentOptionActive
                ]}
                onPress={() => setPaymentMethod('card')}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === 'card' && <View style={styles.radioInner} />}
                </View>
                <Ionicons name="card" size={24} color={paymentMethod === 'card' ? '#1e40af' : '#6b7280'} />
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === 'card' && styles.paymentLabelActive
                ]}>
                  Card Payment
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  paymentMethod === 'mobile_money' && styles.paymentOptionActive
                ]}
                onPress={() => setPaymentMethod('mobile_money')}
              >
                <View style={styles.radioOuter}>
                  {paymentMethod === 'mobile_money' && <View style={styles.radioInner} />}
                </View>
                <Ionicons name="phone-portrait" size={24} color={paymentMethod === 'mobile_money' ? '#1e40af' : '#6b7280'} />
                <Text style={[
                  styles.paymentLabel,
                  paymentMethod === 'mobile_money' && styles.paymentLabelActive
                ]}>
                  Mobile Money
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.securePayment}>
              <Ionicons name="shield-checkmark" size={16} color="#10b981" />
              <Text style={styles.securePaymentText}>Secure payment powered by Paystack</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total Amount</Text>
            <Text style={styles.footerTotalValue}>₵{getTotalAmount().toFixed(2)}</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.placeOrderButton, processing && styles.placeOrderButtonDisabled]}
            onPress={handlePlaceOrder}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                <Text style={styles.placeOrderButtonText}>Place Order & Pay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: 10,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  orderItemLeft: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  orderItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e40af',
  },
  deliveryOptions: {
    gap: 12,
  },
  deliveryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  deliveryOptionActive: {
    borderColor: '#1e40af',
    backgroundColor: '#eff6ff',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1e40af',
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  deliveryLabelActive: {
    color: '#1e40af',
  },
  deliveryTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  deliveryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentOptions: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  paymentOptionActive: {
    borderColor: '#1e40af',
    backgroundColor: '#eff6ff',
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 12,
  },
  paymentLabelActive: {
    color: '#1e40af',
  },
  securePayment: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  securePaymentText: {
    fontSize: 13,
    color: '#059669',
    marginLeft: 8,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  footerTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  footerTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  footerTotalValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e40af',
  },
  placeOrderButton: {
    flexDirection: 'row',
    backgroundColor: '#1e40af',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  placeOrderButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  placeOrderButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default CheckoutScreen;