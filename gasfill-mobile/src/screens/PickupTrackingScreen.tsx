import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { apiService } from '../services/api';
import { PickupRequest } from '../types';
import NativeIntegrations from '../utils/nativeIntegrations';

const PickupTrackingScreen: React.FC = () => {
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPickupRequests();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadPickupRequests(false);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadPickupRequests = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      // Get user's pickup requests
      const user = await StorageService.getUser();
      if (user) {
        // In a real app, this would filter by customer_id
        const requests = await apiService.getPickupRequests();
        setPickupRequests(requests.filter((req: PickupRequest) => req.customer_name === user.username));
      }
    } catch (error) {
      console.error('Error loading pickup requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPickupRequests(false);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending Assignment',
          description: 'Looking for available rider',
          color: '#f59e0b',
          icon: 'time-outline',
          progress: 20,
        };
      case 'accepted':
        return {
          label: 'Rider Assigned',
          description: 'Rider is on the way to pickup location',
          color: '#3b82f6',
          icon: 'person-outline',
          progress: 40,
        };
      case 'picked_up':
        return {
          label: 'Picked Up',
          description: 'Cylinders picked up, heading to refill center',
          color: '#8b5cf6',
          icon: 'checkmark-circle-outline',
          progress: 60,
        };
      case 'at_refill_center':
        return {
          label: 'At Refill Center',
          description: 'Arrived at refill station',
          color: '#06b6d4',
          icon: 'business-outline',
          progress: 75,
        };
      case 'refilled':
        return {
          label: 'Refilled',
          description: 'Cylinders refilled, heading for delivery',
          color: '#10b981',
          icon: 'checkmark-done-outline',
          progress: 90,
        };
      case 'delivered':
        return {
          label: 'Delivered',
          description: 'Order completed successfully',
          color: '#22c55e',
          icon: 'checkmark-circle',
          progress: 100,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          description: 'Request was cancelled',
          color: '#ef4444',
          icon: 'close-circle-outline',
          progress: 0,
        };
      default:
        return {
          label: 'Unknown',
          description: 'Status unknown',
          color: '#6b7280',
          icon: 'help-outline',
          progress: 0,
        };
    }
  };

  const getStepStatus = (currentStatus: string, stepStatus: string) => {
    const statusOrder = ['pending', 'accepted', 'picked_up', 'at_refill_center', 'refilled', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const stepIndex = statusOrder.indexOf(stepStatus);
    
    if (currentIndex >= stepIndex) {
      return 'completed';
    } else if (currentIndex === stepIndex - 1) {
      return 'current';
    } else {
      return 'pending';
    }
  };

  const handleContactRider = async (pickupRequest: PickupRequest) => {
    if (!pickupRequest.rider_id) {
      Alert.alert('No Rider Assigned', 'A rider has not been assigned to this request yet.');
      return;
    }

    Alert.alert(
      'Contact Rider',
      'How would you like to contact the rider?',
      [
        { text: 'Call', onPress: () => NativeIntegrations.makePhoneCall('+233241234567') },
        { text: 'WhatsApp', onPress: () => NativeIntegrations.openWhatsApp('+233241234567') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderTrackingSteps = (pickupRequest: PickupRequest) => {
    const steps = [
      { status: 'pending', label: 'Order Placed', icon: 'receipt-outline' },
      { status: 'accepted', label: 'Rider Assigned', icon: 'person-outline' },
      { status: 'picked_up', label: 'Picked Up', icon: 'cube-outline' },
      { status: 'refilled', label: 'Refilled', icon: 'checkmark-done-outline' },
      { status: 'delivered', label: 'Delivered', icon: 'home-outline' },
    ];

    return (
      <View style={styles.trackingSteps}>
        {steps.map((step, index) => {
          const stepStatus = getStepStatus(pickupRequest.status, step.status);
          return (
            <View key={step.status} style={styles.stepContainer}>
              <View style={styles.stepContent}>
                <View style={[
                  styles.stepIcon,
                  {
                    backgroundColor: 
                      stepStatus === 'completed' ? '#10b981' :
                      stepStatus === 'current' ? '#3b82f6' : '#e5e7eb'
                  }
                ]}>
                  <Ionicons 
                    name={step.icon as any} 
                    size={16} 
                    color={stepStatus === 'pending' ? '#9ca3af' : '#ffffff'} 
                  />
                </View>
                <Text style={[
                  styles.stepLabel,
                  {
                    color: stepStatus === 'pending' ? '#9ca3af' : '#374151',
                    fontWeight: stepStatus === 'current' ? '600' : '500',
                  }
                ]}>
                  {step.label}
                </Text>
              </View>
              {index < steps.length - 1 && (
                <View style={[
                  styles.stepConnector,
                  { backgroundColor: stepStatus === 'completed' ? '#10b981' : '#e5e7eb' }
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Track Orders</Text>
        </View>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Track Orders</Text>
        <TouchableOpacity onPress={() => loadPickupRequests()}>
          <Ionicons name="refresh-outline" size={24} color="#0b5ed7" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pickupRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No Active Orders</Text>
            <Text style={styles.emptyStateText}>
              You don't have any pickup requests to track right now
            </Text>
          </View>
        ) : (
          pickupRequests.map((request) => {
            const statusInfo = getStatusInfo(request.status);
            return (
              <View key={request.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>#{request.id}</Text>
                    <Text style={styles.orderDate}>
                      {new Date(request.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon as any} size={16} color="#ffffff" />
                    <Text style={styles.statusText}>{statusInfo.label}</Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.orderTitle}>
                    {request.cylinder_count}x {request.cylinder_type} Cylinder Refill
                  </Text>
                  <Text style={styles.orderDescription}>{statusInfo.description}</Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${statusInfo.progress}%`,
                          backgroundColor: statusInfo.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>{statusInfo.progress}%</Text>
                </View>

                {renderTrackingSteps(request)}

                <View style={styles.orderAddresses}>
                  <View style={styles.addressItem}>
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text style={styles.addressText}>Pickup: {request.pickup_address}</Text>
                  </View>
                  {request.delivery_address && request.delivery_address !== request.pickup_address && (
                    <View style={styles.addressItem}>
                      <Ionicons name="home-outline" size={16} color="#6b7280" />
                      <Text style={styles.addressText}>Delivery: {request.delivery_address}</Text>
                    </View>
                  )}
                </View>

                {request.pickup_photo && (
                  <View style={styles.photoSection}>
                    <Text style={styles.photoLabel}>Pickup Confirmation:</Text>
                    <Image source={{ uri: request.pickup_photo }} style={styles.photo} />
                  </View>
                )}

                {request.refill_confirmation_photo && (
                  <View style={styles.photoSection}>
                    <Text style={styles.photoLabel}>Refill Confirmation:</Text>
                    <Image source={{ uri: request.refill_confirmation_photo }} style={styles.photo} />
                  </View>
                )}

                <View style={styles.orderActions}>
                  {request.status !== 'delivered' && request.status !== 'cancelled' && (
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleContactRider(request)}
                    >
                      <Ionicons name="call-outline" size={18} color="#0b5ed7" />
                      <Text style={styles.actionButtonText}>Contact Rider</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.secondaryButton]}
                    onPress={() => {
                      // Navigate to order details
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                    <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: 16,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  orderDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  trackingSteps: {
    marginBottom: 16,
  },
  stepContainer: {
    position: 'relative',
  },
  stepContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 14,
    flex: 1,
  },
  stepConnector: {
    position: 'absolute',
    left: 15,
    top: 40,
    width: 2,
    height: 16,
  },
  orderAddresses: {
    marginBottom: 16,
    gap: 8,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 18,
  },
  photoSection: {
    marginBottom: 16,
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0b5ed7',
    gap: 6,
  },
  secondaryButton: {
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b5ed7',
  },
  secondaryButtonText: {
    color: '#6b7280',
  },
});

export default PickupTrackingScreen;