import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { apiService } from '../services/api';
import PaystackService from '../services/paystack';
import PaymentStatus from '../components/PaymentStatus';
import { PickupRequest, Location } from '../types';
import * as ExpoLocation from 'expo-location';

interface CylinderOption {
  type: string;
  name: string;
  refillPrice: number;
  pickupFee: number;
}

const CYLINDER_OPTIONS: CylinderOption[] = [
  { type: '6kg', name: '6kg Cylinder', refillPrice: 80, pickupFee: 15 },
  { type: '12.5kg', name: '12.5kg Cylinder', refillPrice: 150, pickupFee: 20 },
  { type: '14.5kg', name: '14.5kg Cylinder', refillPrice: 170, pickupFee: 25 },
  { type: '50kg', name: '50kg Cylinder (Commercial)', refillPrice: 600, pickupFee: 50 },
];

const PickupRequestScreen: React.FC = () => {
  const [selectedCylinder, setSelectedCylinder] = useState<CylinderOption | null>(null);
  const [cylinderCount, setCylinderCount] = useState(1);
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);

  useEffect(() => {
    loadCustomerInfo();
    getCurrentLocation();
  }, []);

  const loadCustomerInfo = async () => {
    try {
      const user = await StorageService.getUser();
      if (user) {
        setCustomerName(user.username || '');
        setCustomerPhone(user.phone || '');
        setCustomerEmail(user.email || '');
      }
    } catch (error) {
      console.error('Error loading customer info:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for pickup service');
        return;
      }

      const location = await ExpoLocation.getCurrentPositionAsync({});
      
      // Use coordinates directly without geocoding to avoid rate limits
      const formattedAddress = `${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`;

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: formattedAddress,
      });

      if (useCurrentLocation) {
        setPickupAddress(formattedAddress);
      }

      // Optional: Try geocoding with error handling for rate limits
      try {
        const address = await ExpoLocation.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (address && address[0]) {
          const betterAddress = `${address[0].street || ''} ${address[0].city || ''} ${address[0].region || ''}`.trim();
          if (betterAddress) {
            setCurrentLocation(prev => prev ? { ...prev, address: betterAddress } : null);
            if (useCurrentLocation) {
              setPickupAddress(betterAddress);
            }
          }
        }
      } catch (geocodeError: any) {
        // Silently fail geocoding - we already have coordinates
        if (geocodeError.message?.includes('rate limit')) {
          console.warn('⚠️ Geocoding rate limit - using coordinates instead');
        } else {
          console.warn('⚠️ Geocoding failed:', geocodeError.message);
        }
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Could not get current location');
    }
  };

  const calculateTotal = () => {
    if (!selectedCylinder) return 0;
    return (selectedCylinder.refillPrice + selectedCylinder.pickupFee) * cylinderCount;
  };

  const validateForm = () => {
    if (!selectedCylinder) {
      Alert.alert('Error', 'Please select a cylinder type');
      return false;
    }
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!customerPhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return false;
    }
    if (!customerEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return false;
    }
    if (!customerEmail.includes('@') || !customerEmail.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!pickupAddress.trim()) {
      Alert.alert('Error', 'Please enter pickup address');
      return false;
    }
    return true;
  };

  const handleSubmitRequest = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const pickupRequest: Partial<PickupRequest> = {
        customer_name: customerName,
        customer_phone: customerPhone,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress || pickupAddress,
        cylinder_type: selectedCylinder!.type,
        cylinder_count: cylinderCount,
        scheduled_pickup_time: scheduledTime,
        total_cost: calculateTotal(),
        commission_amount: calculateTotal() * 0.15, // 15% commission
        status: 'pending',
        payment_status: 'pending',
        notes,
      };

      // Show payment modal for customer to pay
      setShowPaymentModal(true);
      
    } catch (error) {
      console.error('Error submitting pickup request:', error);
      Alert.alert('Error', 'Failed to submit pickup request');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentReference: string, paymentData?: any) => {
    try {
      setLoading(true);
      
      const pickupRequest: Partial<PickupRequest> = {
        customer_name: customerName,
        customer_phone: customerPhone,
        pickup_address: pickupAddress,
        delivery_address: deliveryAddress || pickupAddress,
        cylinder_type: selectedCylinder!.type,
        cylinder_count: cylinderCount,
        scheduled_pickup_time: scheduledTime,
        total_cost: calculateTotal(),
        commission_amount: calculateTotal() * 0.15,
        status: 'pending',
        payment_status: 'completed',
        payment_method: 'paystack',
        notes,
      };

      // Submit to API
      await apiService.createPickupRequest(pickupRequest);
      
      setShowPaymentModal(false);
      
      Alert.alert(
        'Success!', 
        `Your pickup request has been submitted successfully. Payment reference: ${paymentReference}. A rider will be assigned shortly.`,
        [{ text: 'OK', onPress: () => resetForm() }]
      );

    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Payment successful but failed to create pickup request. Please contact support with your payment reference: ' + paymentReference);
    } finally {
      setLoading(false);
    }
  };

  const handlePaystackPayment = async () => {
    if (!customerEmail) {
      Alert.alert('Error', 'Email address is required for payment');
      return;
    }

    try {
      setLoading(true);
      
      // Generate pickup ID for tracking
      const pickupId = `pickup_${Date.now()}`;
      const totalAmount = calculateTotal();

      // Process payment with Paystack
      const paymentResult = await PaystackService.processPickupPayment(
        totalAmount,
        customerEmail,
        customerName,
        pickupId,
        customerPhone
      );

      if (paymentResult.success) {
        await handlePaymentSuccess(paymentResult.reference, paymentResult.data);
      } else {
        Alert.alert(
          'Payment Failed',
          'Payment could not be processed. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Error',
        'An error occurred while processing your payment. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCylinder(null);
    setCylinderCount(1);
    setPickupAddress('');
    setDeliveryAddress('');
    setScheduledTime('');
    setCustomerEmail('');
    setNotes('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Request Pickup & Refill</Text>
        <Text style={styles.headerSubtitle}>Get your cylinders refilled at home</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cylinder Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Cylinder Type</Text>
          {CYLINDER_OPTIONS.map((cylinder) => (
            <TouchableOpacity
              key={cylinder.type}
              style={[
                styles.cylinderOption,
                selectedCylinder?.type === cylinder.type && styles.selectedOption
              ]}
              onPress={() => setSelectedCylinder(cylinder)}
            >
              <View style={styles.cylinderInfo}>
                <Text style={styles.cylinderName}>{cylinder.name}</Text>
                <Text style={styles.cylinderPrice}>
                  Refill: ₵{cylinder.refillPrice} + Pickup: ₵{cylinder.pickupFee}
                </Text>
              </View>
              <View style={styles.radioButton}>
                {selectedCylinder?.type === cylinder.type && (
                  <Ionicons name="checkmark-circle" size={24} color="#0b5ed7" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quantity */}
        {selectedCylinder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setCylinderCount(Math.max(1, cylinderCount - 1))}
              >
                <Ionicons name="remove" size={20} color="#0b5ed7" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{cylinderCount}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setCylinderCount(cylinderCount + 1)}
              >
                <Ionicons name="add" size={20} color="#0b5ed7" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={customerName}
            onChangeText={setCustomerName}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={customerPhone}
            onChangeText={setCustomerPhone}
            keyboardType="phone-pad"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            value={customerEmail}
            onChangeText={setCustomerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Addresses */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pickup Address</Text>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => {
              setUseCurrentLocation(!useCurrentLocation);
              if (!useCurrentLocation && currentLocation) {
                setPickupAddress(currentLocation.address || '');
              }
            }}
          >
            <Ionicons 
              name={useCurrentLocation ? "location" : "location-outline"} 
              size={20} 
              color="#0b5ed7" 
            />
            <Text style={styles.locationButtonText}>Use Current Location</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Enter pickup address"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            multiline
          />
          
          <Text style={styles.sectionTitle}>Delivery Address (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Same as pickup address if left empty"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
          />
        </View>

        {/* Additional Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Total Cost */}
        {selectedCylinder && (
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal ({cylinderCount}x {selectedCylinder.name})</Text>
              <Text style={styles.totalAmount}>₵{selectedCylinder.refillPrice * cylinderCount}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Pickup & Delivery Fee</Text>
              <Text style={styles.totalAmount}>₵{selectedCylinder.pickupFee * cylinderCount}</Text>
            </View>
            <View style={[styles.totalRow, styles.grandTotal]}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalAmount}>₵{calculateTotal()}</Text>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!selectedCylinder || loading) && styles.disabledButton]}
          onPress={handleSubmitRequest}
          disabled={!selectedCylinder || loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Processing...' : 'Request Pickup & Pay'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Complete Payment</Text>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.paymentContent}>
            <PaymentStatus />
            
            <Text style={styles.paymentAmount}>₵{calculateTotal()}</Text>
            <Text style={styles.paymentDescription}>
              Pickup & refill for {cylinderCount}x {selectedCylinder?.name}
            </Text>
            
            <TouchableOpacity
              style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
              onPress={handlePaystackPayment}
              disabled={loading}
            >
              <Text style={styles.paymentButtonText}>
                {loading ? 'Processing...' : 'Pay with Paystack'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fbff',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  cylinderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedOption: {
    borderColor: '#0b5ed7',
    backgroundColor: '#eff6ff',
  },
  cylinderInfo: {
    flex: 1,
  },
  cylinderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  cylinderPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  radioButton: {
    width: 24,
    height: 24,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0b5ed7',
    fontWeight: '500',
  },
  totalSection: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  grandTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  submitButton: {
    backgroundColor: '#0b5ed7',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 32,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  paymentContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0b5ed7',
    marginBottom: 8,
  },
  paymentDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  paymentButton: {
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  paymentButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  paymentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PickupRequestScreen;