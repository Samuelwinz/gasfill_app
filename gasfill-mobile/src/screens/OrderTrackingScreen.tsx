import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types';
import OrderRatingModal from '../components/OrderRatingModal';

interface OrderTrackingScreenProps {
  navigation: any;
  route: any;
}

interface TrackingData {
  order_id?: string;
  status?: OrderStatus;
  customer_name?: string;
  delivery_address?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total_amount?: number;
  payment_method?: string;
  payment_status?: string;
  created_at?: string;
  updated_at?: string;
  estimated_delivery?: string;
  rider?: {
    id: number;
    name: string;
    phone: string;
    vehicle_type?: string;
    vehicle_number?: string;
    rating?: number;
    location?: string;
    status?: string;
  };
  status_history?: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;
  tracking_updates?: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
  }>;
  rating?: number;
  rating_comment?: string;
  rated_at?: string;
}

const OrderTrackingScreen: React.FC<OrderTrackingScreenProps> = ({ navigation, route }) => {
  const { orderId } = route.params;
  const { token } = useAuth();
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [hasShownRating, setHasShownRating] = useState(false);
  const mapRef = useRef<MapView>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  console.log('[OrderTracking] Initializing with orderId:', orderId, 'token:', token ? 'present' : 'missing');

  // Fetch tracking data
  const fetchTrackingData = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      
      const response = await fetch(`http://192.168.1.25:8000/api/order/tracking/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderTracking] API Error:', response.status, errorText);
        throw new Error(`Failed to fetch tracking data: ${response.status}`);
      }

      const data = await response.json();
      console.log('[OrderTracking] Received data:', JSON.stringify(data, null, 2));
      
      if (!data || !data.order_id) {
        throw new Error('Invalid tracking data received');
      }
      
      setTrackingData(data);

      // Show rating modal if order just got delivered and not rated yet
      // Only show once per session and only if no rating exists
      if (
        data?.status === 'delivered' && 
        !data?.rating && 
        !data?.rated_at &&
        !hasShownRating
      ) {
        setShowRatingModal(true);
        setHasShownRating(true);
      }

      // Fit map to show rider and destination
      if (data?.tracking_updates && data.tracking_updates.length > 0 && mapRef.current) {
        const lastLocation = data.tracking_updates[data.tracking_updates.length - 1];
        // Will implement map fitting after getting coordinates
      }
    } catch (error) {
      console.error('[OrderTracking] Error fetching data:', error);
      Alert.alert('Error', 'Failed to load tracking information');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh tracking data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrackingData(false);
  };

  // Start polling for real-time updates
  useEffect(() => {
    fetchTrackingData();

    // Poll every 10 seconds for updates
    pollingInterval.current = setInterval(() => {
      fetchTrackingData(false);
    }, 10000);

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [orderId]);

  // Call rider
  const handleCallRider = () => {
    if (trackingData?.rider?.phone) {
      const phoneUrl = `tel:${trackingData.rider.phone}`;
      Linking.openURL(phoneUrl);
    }
  };

  // Open chat
  const handleOpenChat = () => {
    if (trackingData?.rider) {
      navigation.navigate('Chat', {
        orderId: orderId,
        participant: {
          id: trackingData.rider.id,
          name: trackingData.rider.name,
          type: 'rider',
          user_type: 'rider',
          is_online: true,
        },
      });
    }
  };

  // Submit rating
  const handleSubmitRating = async (rating: number, comment: string) => {
    try {
      console.log('[OrderTracking] Submitting rating:', { orderId, rating, comment });
      
      const response = await fetch(
        `http://192.168.1.25:8000/api/orders/${orderId}/rating`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rating, comment }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OrderTracking] Rating API error:', response.status, errorText);
        throw new Error(`Failed to submit rating: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[OrderTracking] Rating submitted successfully:', result);

      // Refresh tracking data to show rating
      await fetchTrackingData(false);
    } catch (error) {
      console.error('[OrderTracking] Rating error:', error);
      throw error;
    }
  };

  // Get status color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'assigned': return '#3b82f6';
      case 'pickup': return '#8b5cf6';
      case 'in_transit': return '#06b6d4';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Format status text
  const formatStatus = (status: OrderStatus) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (!trackingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Unable to load tracking data</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTrackingData()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const { 
    order_id, 
    status, 
    customer_name,
    delivery_address,
    items,
    total_amount,
    payment_method,
    payment_status,
    created_at,
    rider, 
    status_history, 
    tracking_updates, 
    estimated_delivery 
  } = trackingData;

  // Get rider location for map
  const riderLocation = tracking_updates && tracking_updates.length > 0
    ? tracking_updates[tracking_updates.length - 1]
    : null;

  // Mock destination coordinates (should parse from order.delivery_address)
  const destinationLocation = {
    latitude: 6.5244,
    longitude: 3.3792,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Track Order</Text>
          <Text style={styles.headerSubtitle}>Order #{order_id}</Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} disabled={refreshing}>
          <Ionicons 
            name="refresh" 
            size={24} 
            color={refreshing ? "#9ca3af" : "#3b82f6"} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: riderLocation?.latitude || destinationLocation.latitude,
              longitude: riderLocation?.longitude || destinationLocation.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {/* Rider location marker */}
            {riderLocation && (
              <Marker
                coordinate={{
                  latitude: riderLocation.latitude,
                  longitude: riderLocation.longitude,
                }}
                title={rider?.name || 'Rider'}
                description="Current location"
              >
                <View style={styles.riderMarker}>
                  <Ionicons name="bicycle" size={24} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Destination marker */}
            <Marker
              coordinate={destinationLocation}
              title="Delivery Address"
              description={delivery_address || customer_name}
            >
              <View style={styles.destinationMarker}>
                <Ionicons name="home" size={24} color="#fff" />
              </View>
            </Marker>

            {/* Route polyline */}
            {tracking_updates && tracking_updates.length > 1 && (
              <Polyline
                coordinates={tracking_updates.map(update => ({
                  latitude: update.latitude,
                  longitude: update.longitude,
                }))}
                strokeColor="#3b82f6"
                strokeWidth={3}
              />
            )}
          </MapView>

          {/* Map overlay - ETA */}
          {estimated_delivery && (
            <View style={styles.etaOverlay}>
              <Ionicons name="time-outline" size={16} color="#3b82f6" />
              <Text style={styles.etaText}>
                ETA: {new Date(estimated_delivery).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Order Status */}
        <View style={styles.section}>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status || 'pending') }]}>
              <Text style={styles.statusText}>{formatStatus(status || 'pending')}</Text>
            </View>
            {payment_status === 'completed' && (
              <View style={styles.paidBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.paidText}>Paid</Text>
              </View>
            )}
          </View>
        </View>

        {/* Rider Info */}
        {rider && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rider</Text>
            <View style={styles.riderCard}>
              <View style={styles.riderAvatar}>
                <Ionicons name="person" size={32} color="#fff" />
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{rider.name}</Text>
                <View style={styles.riderMeta}>
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text style={styles.riderRating}>{rider.rating?.toFixed(1) || 'N/A'}</Text>
                  {rider.vehicle_type && (
                    <>
                      <Text style={styles.riderMetaSeparator}>•</Text>
                      <Text style={styles.riderVehicle}>{rider.vehicle_type}</Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.riderActions}>
                <TouchableOpacity style={styles.actionButton} onPress={handleCallRider}>
                  <Ionicons name="call" size={20} color="#3b82f6" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleOpenChat}>
                  <Ionicons name="chatbubble" size={20} color="#3b82f6" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Order Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order ID</Text>
              <Text style={styles.detailValue}>#{order_id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount</Text>
              <Text style={styles.detailValue}>₦{total_amount?.toLocaleString() || 0}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>{payment_method || 'Cash'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Delivery Address</Text>
              <Text style={styles.detailValueAddress}>{delivery_address || customer_name}</Text>
            </View>
          </View>
        </View>

        {/* Status Timeline */}
        {status_history && status_history.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery Timeline</Text>
            <View style={styles.timelineCard}>
              {status_history.slice().reverse().map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineIconContainer}>
                    <View style={[
                      styles.timelineIcon,
                      { backgroundColor: getStatusColor(item.status) }
                    ]}>
                      <Ionicons 
                        name={
                          item.status === 'delivered' ? 'checkmark' :
                          item.status === 'cancelled' ? 'close' :
                          'ellipse'
                        } 
                        size={12} 
                        color="#fff" 
                      />
                    </View>
                    {index < status_history.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>{formatStatus(item.status)}</Text>
                    <Text style={styles.timelineTime}>{formatTime(item.timestamp)}</Text>
                    {item.note && (
                      <Text style={styles.timelineNote}>{item.note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Rating Modal */}
      <OrderRatingModal
        visible={showRatingModal}
        orderId={orderId}
        riderName={trackingData?.rider?.name}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitRating}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#e5e7eb',
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  riderMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  destinationMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  etaOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  etaText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#d1fae5',
    borderRadius: 12,
  },
  paidText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  riderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  riderAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  riderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  riderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 4,
  },
  riderMetaSeparator: {
    fontSize: 13,
    color: '#9ca3af',
    marginHorizontal: 6,
  },
  riderVehicle: {
    fontSize: 13,
    color: '#6b7280',
  },
  riderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
  },
  detailValueAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  timelineCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 8,
  },
  timelineStatus: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  timelineTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  timelineNote: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default OrderTrackingScreen;
