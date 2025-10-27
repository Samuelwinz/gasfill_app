import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PaystackService from '../services/paystack';
import { RefillBooking } from '../types';

interface RefillPlanBookingScreenProps {
  navigation: any;
  route: any;
}

const RefillPlanBookingScreen: React.FC<RefillPlanBookingScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { plan } = route.params || {};

  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingData, setBookingData] = useState<Partial<RefillBooking>>({
    customer_name: user?.username || '',
    customer_phone: user?.phone || '',
    customer_email: user?.email || '',
    delivery_address: user?.address || '',
    cylinder_size: '6kg',
    cylinder_count: 1,
    preferred_date: '',
    preferred_time_slot: '',
    special_instructions: '',
    payment_method: 'mobile_money',
    total_amount: plan?.price || 0,
  });

  const cylinderSizes = [
    { id: '6kg', label: '6kg Cylinder', icon: 'flame-outline', price: 35 },
    { id: '13kg', label: '13kg Cylinder', icon: 'flame', price: 65 },
    { id: '14.5kg', label: '14.5kg Cylinder', icon: 'flame', price: 70 },
    { id: '50kg', label: '50kg Cylinder', icon: 'flame', price: 200 },
  ];

  const timeSlots = [
    { id: 'morning', label: 'Morning (8AM - 12PM)', icon: 'sunny-outline' },
    { id: 'afternoon', label: 'Afternoon (12PM - 4PM)', icon: 'partly-sunny-outline' },
    { id: 'evening', label: 'Evening (4PM - 8PM)', icon: 'moon-outline' },
  ];

  const paymentMethods = [
    { id: 'mobile_money', label: 'Mobile Money', icon: 'phone-portrait-outline' },
    { id: 'card', label: 'Card Payment', icon: 'card-outline' },
    { id: 'cash', label: 'Cash on Delivery', icon: 'cash-outline' },
  ];

  const updateBookingData = (field: keyof RefillBooking, value: any) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
  };

  const calculateTotal = () => {
    const selectedSize = cylinderSizes.find(s => s.id === bookingData.cylinder_size);
    const basePrice = selectedSize ? selectedSize.price : 0;
    const count = bookingData.cylinder_count || 1;
    const deliveryFee = 10;
    return (basePrice * count) + deliveryFee;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!bookingData.cylinder_size) {
        Alert.alert('Required', 'Please select a cylinder size');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!bookingData.delivery_address) {
        Alert.alert('Required', 'Please enter delivery address');
        return;
      }
      if (!bookingData.preferred_date) {
        Alert.alert('Required', 'Please select preferred date');
        return;
      }
      if (!bookingData.preferred_time_slot) {
        Alert.alert('Required', 'Please select time slot');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      handleBooking();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  const handleBooking = async () => {
    try {
      setIsProcessingPayment(true);
      const totalAmount = calculateTotal();

      // Generate unique reference for this booking
      const reference = `REFILL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process payment based on selected method
      if (bookingData.payment_method === 'card') {
        // Process card payment with Paystack
        const paymentResult = await PaystackService.processPayment({
          reference,
          email: bookingData.customer_email || user?.email || '',
          amount: totalAmount,
          currency: 'GHS',
          channels: ['card'],
          metadata: {
            customer_name: bookingData.customer_name,
            customer_phone: bookingData.customer_phone,
            order_type: 'refill_booking',
            cylinder_size: bookingData.cylinder_size,
            cylinder_count: bookingData.cylinder_count,
          },
        });

        if (!paymentResult.success) {
          setIsProcessingPayment(false);
          Alert.alert('Payment Failed', 'Payment was not completed. Please try again.');
          return;
        }

        // Payment successful, create booking
        await createBooking(paymentResult.reference);

      } else if (bookingData.payment_method === 'mobile_money') {
        // Process mobile money payment with Paystack
        const paymentResult = await PaystackService.processPayment({
          reference,
          email: bookingData.customer_email || user?.email || '',
          amount: totalAmount,
          currency: 'GHS',
          channels: ['mobile_money'],
          metadata: {
            customer_name: bookingData.customer_name,
            customer_phone: bookingData.customer_phone,
            order_type: 'refill_booking',
            cylinder_size: bookingData.cylinder_size,
            cylinder_count: bookingData.cylinder_count,
          },
        });

        if (!paymentResult.success) {
          setIsProcessingPayment(false);
          Alert.alert('Payment Failed', 'Payment was not completed. Please try again.');
          return;
        }

        // Payment successful, create booking
        await createBooking(paymentResult.reference);

      } else if (bookingData.payment_method === 'cash') {
        // Cash on delivery - no payment processing needed
        await createBooking('COD');
      }

    } catch (error) {
      console.error('Error processing booking:', error);
      setIsProcessingPayment(false);
      Alert.alert('Error', 'Failed to process booking. Please try again.');
    }
  };

  const createBooking = async (paymentReference: string) => {
    try {
      // TODO: Call backend API to create booking
      // const response = await fetch('http://192.168.1.25:8000/api/refill/booking', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     ...bookingData,
      //     payment_reference: paymentReference,
      //     total_amount: calculateTotal(),
      //   }),
      // });

      setIsProcessingPayment(false);

      Alert.alert(
        'Booking Confirmed! 🎉',
        `Your refill booking has been confirmed.\n\nTotal: ₵${calculateTotal().toFixed(2)}\nPayment Reference: ${paymentReference}\n\nWe'll deliver on ${bookingData.preferred_date} during ${timeSlots.find(t => t.id === bookingData.preferred_time_slot)?.label}`,
        [
          {
            text: 'View Orders',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Orders' } }],
              });
            },
          },
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error creating booking:', error);
      setIsProcessingPayment(false);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted,
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive,
              ]}>
                {step}
              </Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineCompleted,
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Select Cylinder Details</Text>
      <Text style={styles.stepDescription}>Choose your cylinder size and quantity</Text>

      {/* Cylinder Size */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Cylinder Size</Text>
        <View style={styles.optionsGrid}>
          {cylinderSizes.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[
                styles.optionCard,
                bookingData.cylinder_size === size.id && styles.optionCardSelected,
              ]}
              onPress={() => updateBookingData('cylinder_size', size.id)}
            >
              <Ionicons 
                name={size.icon as any} 
                size={32} 
                color={bookingData.cylinder_size === size.id ? '#3b82f6' : '#6B7280'} 
              />
              <Text style={[
                styles.optionLabel,
                bookingData.cylinder_size === size.id && styles.optionLabelSelected,
              ]}>
                {size.label}
              </Text>
              <Text style={styles.optionPrice}>₵{size.price}</Text>
              {bookingData.cylinder_size === size.id && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cylinder Count */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quantity</Text>
        <View style={styles.counterContainer}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => updateBookingData('cylinder_count', Math.max(1, (bookingData.cylinder_count || 1) - 1))}
          >
            <Ionicons name="remove" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.counterValue}>{bookingData.cylinder_count || 1}</Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => updateBookingData('cylinder_count', (bookingData.cylinder_count || 1) + 1)}
          >
            <Ionicons name="add" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Delivery Details</Text>
      <Text style={styles.stepDescription}>When and where should we deliver?</Text>

      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Contact Information</Text>
        <View style={styles.inputGroup}>
          <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={bookingData.customer_name}
            onChangeText={(text) => updateBookingData('customer_name', text)}
          />
        </View>
        <View style={styles.inputGroup}>
          <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={bookingData.customer_phone}
            onChangeText={(text) => updateBookingData('customer_phone', text)}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      {/* Delivery Address */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Delivery Address</Text>
        <View style={styles.inputGroup}>
          <Ionicons name="location-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter delivery address"
            value={bookingData.delivery_address}
            onChangeText={(text) => updateBookingData('delivery_address', text)}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Preferred Date */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferred Delivery Date</Text>
        <TouchableOpacity 
          style={styles.dateInput}
          onPress={() => {
            // TODO: Open date picker
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            updateBookingData('preferred_date', tomorrow.toISOString().split('T')[0]);
          }}
        >
          <Ionicons name="calendar-outline" size={20} color="#6B7280" />
          <Text style={[styles.dateInputText, !bookingData.preferred_date && styles.placeholderText]}>
            {bookingData.preferred_date || 'Select date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Time Slot */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Preferred Time Slot</Text>
        {timeSlots.map((slot) => (
          <TouchableOpacity
            key={slot.id}
            style={[
              styles.timeSlotCard,
              bookingData.preferred_time_slot === slot.id && styles.timeSlotCardSelected,
            ]}
            onPress={() => updateBookingData('preferred_time_slot', slot.id)}
          >
            <Ionicons 
              name={slot.icon as any} 
              size={24} 
              color={bookingData.preferred_time_slot === slot.id ? '#3b82f6' : '#6B7280'} 
            />
            <Text style={[
              styles.timeSlotLabel,
              bookingData.preferred_time_slot === slot.id && styles.timeSlotLabelSelected,
            ]}>
              {slot.label}
            </Text>
            {bookingData.preferred_time_slot === slot.id && (
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Special Instructions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Special Instructions (Optional)</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special delivery instructions..."
            value={bookingData.special_instructions}
            onChangeText={(text) => updateBookingData('special_instructions', text)}
            multiline
            numberOfLines={2}
          />
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Payment & Confirmation</Text>
      <Text style={styles.stepDescription}>Review and confirm your booking</Text>

      {/* Order Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Order Summary</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Cylinder</Text>
          <Text style={styles.summaryValue}>
            {cylinderSizes.find(s => s.id === bookingData.cylinder_size)?.label} x {bookingData.cylinder_count}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Date</Text>
          <Text style={styles.summaryValue}>{bookingData.preferred_date}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time Slot</Text>
          <Text style={styles.summaryValue}>
            {timeSlots.find(t => t.id === bookingData.preferred_time_slot)?.label}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Address</Text>
          <Text style={[styles.summaryValue, styles.summaryAddress]}>
            {bookingData.delivery_address}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>
            ₵{(cylinderSizes.find(s => s.id === bookingData.cylinder_size)?.price || 0) * (bookingData.cylinder_count || 1)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Fee</Text>
          <Text style={styles.summaryValue}>₵10.00</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotalLabel}>Total Amount</Text>
          <Text style={styles.summaryTotal}>₵{calculateTotal().toFixed(2)}</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Payment Method</Text>
        {paymentMethods.map((method) => (
          <TouchableOpacity
            key={method.id}
            style={[
              styles.paymentCard,
              bookingData.payment_method === method.id && styles.paymentCardSelected,
            ]}
            onPress={() => updateBookingData('payment_method', method.id)}
          >
            <View style={styles.paymentIconContainer}>
              <Ionicons 
                name={method.icon as any} 
                size={24} 
                color={bookingData.payment_method === method.id ? '#3b82f6' : '#6B7280'} 
              />
            </View>
            <Text style={[
              styles.paymentLabel,
              bookingData.payment_method === method.id && styles.paymentLabelSelected,
            ]}>
              {method.label}
            </Text>
            {bookingData.payment_method === method.id && (
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Refill Service</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.priceInfo}>
          <Text style={styles.priceLabel}>Total</Text>
          <Text style={styles.priceValue}>₵{calculateTotal().toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.nextButton, isProcessingPayment && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isProcessingPayment}
        >
          {isProcessingPayment ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>
                Processing...
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {currentStep === 3 ? 'Confirm Booking' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 32,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
  },
  stepCircleCompleted: {
    backgroundColor: '#10b981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLine: {
    width: 50,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    position: 'relative',
  },
  optionCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#EFF6FF',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    textAlign: 'center',
  },
  optionLabelSelected: {
    color: '#3b82f6',
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginTop: 4,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
  },
  counterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginHorizontal: 32,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    paddingTop: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
  },
  dateInputText: {
    fontSize: 15,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  timeSlotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    gap: 12,
  },
  timeSlotCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#EFF6FF',
  },
  timeSlotLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  timeSlotLabelSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'right',
    maxWidth: '60%',
  },
  summaryAddress: {
    fontSize: 13,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    gap: 12,
  },
  paymentCardSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#EFF6FF',
  },
  paymentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  paymentLabelSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 16,
  },
  priceInfo: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default RefillPlanBookingScreen;
