import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { apiService } from '../services/api';
import { useWebSocketEvent } from '../context/WebSocketContext';
import locationTrackingService from '../services/locationTracking';
import geocodingService from '../services/geocodingService';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';
import OrderRatingModal from '../components/OrderRatingModal';

interface TrackingScreenProps {
  navigation: any;
  route: {
    params?: {
      orderId: string;
    };
  };
}

interface OrderTracking {
  order_id: string;
  status: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  rider_name?: string;
  rider_phone?: string;
  rider_rating?: number;
  rider_location?: {
    lat: number;
    lng: number;
  };
  customer_location?: {
    lat: number;
    lng: number;
  };
  estimated_arrival?: string;
  status_history: Array<{
    status: string;
    timestamp: string;
    note?: string;
  }>;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  created_at: string;
}

const DeliveryTrackingScreen: React.FC<TrackingScreenProps> = ({ navigation, route }) => {
  const [trackingData, setTrackingData] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveTracking, setLiveTracking] = useState(false); // Shows if receiving live updates
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [newLocation, setNewLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [customerAddressFormatted, setCustomerAddressFormatted] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const mapRef = useRef<MapView>(null);
  const orderId = route.params?.orderId;
  const isLoadingRef = useRef(false);

  // Subscribe to rider location updates via WebSocket
  useWebSocketEvent('rider_location', (data) => {
    console.log('[DeliveryTracking] Rider location update:', data);
    
    // Only update if this is for our order
    if (data.order_id === orderId) {
      console.log('[DeliveryTracking] ✅ Updating rider location for order:', orderId);
      setLiveTracking(true);
      
      setTrackingData(prev => {
        if (!prev) return prev;
        
        const newLocation = {
          lat: data.latitude,
          lng: data.longitude,
        };
        
        console.log('[DeliveryTracking] 📍 New rider location:', newLocation);
        
        // Calculate distance and ETA if we have customer location
        if (prev.customer_location) {
          const distanceMeters = locationTrackingService.calculateDistance(
            data.latitude,
            data.longitude,
            prev.customer_location.lat,
            prev.customer_location.lng
          );
          
          const etaMinutes = locationTrackingService.calculateETA(distanceMeters);
          
          setDistance(locationTrackingService.formatDistance(distanceMeters));
          setEta(locationTrackingService.formatETA(etaMinutes));
          
          console.log('[DeliveryTracking] 📊 Distance:', distanceMeters, 'm, ETA:', etaMinutes, 'min');
          
          // Update map to show both locations
          if (mapRef.current) {
            mapRef.current.fitToCoordinates(
              [
                { latitude: data.latitude, longitude: data.longitude },
                { latitude: prev.customer_location.lat, longitude: prev.customer_location.lng },
              ],
              {
                edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
                animated: true,
              }
            );
          }
        }
        
        return {
          ...prev,
          rider_location: newLocation,
        };
      });
    }
  });

  const loadTrackingData = useCallback(async (isRefreshing = false) => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⏸️ Already loading, skipping...');
      return;
    }

    try {
      isLoadingRef.current = true;
      if (!isRefreshing) setLoading(true);
      setError(null);

      if (!orderId) {
        throw new Error('Order ID is required');
      }

      console.log('📍 Loading tracking data for order:', orderId);
      const data = await apiService.getOrderTracking(orderId);
      console.log('✅ Tracking data loaded:', {
        order_id: data.order_id,
        status: data.status,
        has_rider_location: !!data.rider_location,
        rider_location: data.rider_location,
        has_customer_location: !!data.customer_location,
        customer_location: data.customer_location,
      });
      
      // Log detailed customer location info
      if (data.customer_location) {
        console.log('📍✅ Customer location IS PINNED:', data.customer_location);
      } else {
        console.log('📍⚠️ Customer location NOT PINNED - will use default location');
      }
      
      setTrackingData(data);

      // Reverse geocode customer location to get formatted address
      if (data.customer_location && !customerAddressFormatted) {
        reverseGeocodeCustomerLocation(data.customer_location.lat, data.customer_location.lng);
      }

      // Fit map to show both locations
      if (data.rider_location && data.customer_location && mapRef.current) {
        console.log('[DeliveryTracking] 🗺️ Fitting map to show rider and customer');
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            [
              { latitude: data.rider_location!.lat, longitude: data.rider_location!.lng },
              { latitude: data.customer_location!.lat, longitude: data.customer_location!.lng },
            ],
            {
              edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
              animated: true,
            }
          );
        }, 500);
      }
    } catch (err: any) {
      console.error('❌ Error loading tracking data:', err);
      setError(err.message || 'Failed to load tracking information');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setError('No order ID provided. Please select an order to track.');
      setLoading(false);
      return;
    }

    // Initial load
    loadTrackingData();

    // Set up polling for real-time updates every 30 seconds
    const interval = setInterval(() => {
      // Only poll if there's no error
      if (!error) {
        loadTrackingData(true);
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      isLoadingRef.current = false;
    };
  }, [orderId, loadTrackingData, error]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTrackingData(true);
  };

  const reverseGeocodeCustomerLocation = async (lat: number, lng: number) => {
    try {
      setLoadingAddress(true);
      console.log('🗺️ Reverse geocoding customer location:', { lat, lng });
      
      const address = await geocodingService.reverseGeocode(lat, lng);
      
      if (address) {
        console.log('✅ Formatted address:', address);
        setCustomerAddressFormatted(address);
      } else {
        console.log('⚠️ Could not reverse geocode location');
        setCustomerAddressFormatted(null);
      }
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      setCustomerAddressFormatted(null);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleCallRider = () => {
    if (trackingData?.rider_phone) {
      Alert.alert(
        'Call Rider',
        `Do you want to call ${trackingData.rider_name || 'the rider'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => Linking.openURL(`tel:${trackingData.rider_phone}`),
          },
        ]
      );
    }
  };

  const handleRatingSubmit = async (rating: number, comment: string) => {
    try {
      await apiService.createRating({
        order_id: orderId || '',
        rating,
        comment
      });
      
      Alert.alert('Success', 'Thank you for your rating!');
      setShowRatingModal(false);
      
      // Refresh tracking data to get updated rating
      await loadTrackingData();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    }
  };

  const handleOpenLocationPicker = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to update delivery location.');
        return;
      }
      
      // Set initial location to current customer location or get current GPS
      if (trackingData?.customer_location) {
        setNewLocation(trackingData.customer_location);
      } else {
        const location = await Location.getCurrentPositionAsync({});
        setNewLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
      
      setShowLocationPicker(true);
    } catch (error) {
      console.error('Error opening location picker:', error);
      Alert.alert('Error', 'Failed to get location access');
    }
  };

  const handleUpdateLocation = async () => {
    if (!newLocation || !orderId) return;
    
    try {
      setUpdatingLocation(true);
      
      // Call API to update order location
      await apiService.updateOrderLocation(orderId, newLocation);
      
      Alert.alert('Success', 'Delivery location updated successfully!');
      setShowLocationPicker(false);
      
      // Reload tracking data
      await loadTrackingData();
      
      // Reverse geocode the new location
      await reverseGeocodeCustomerLocation(newLocation.lat, newLocation.lng);
    } catch (error: any) {
      console.error('Error updating location:', error);
      Alert.alert('Error', error.message || 'Failed to update location');
    } finally {
      setUpdatingLocation(false);
    }
  };

  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: 'receipt-outline' },
    { key: 'assigned', label: 'Rider Assigned', icon: 'person-outline' },
    { key: 'pickup', label: 'Picking Up', icon: 'basket-outline' },
    { key: 'in_transit', label: 'On the Way', icon: 'bicycle-outline' },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-circle-outline' },
  ];

  const getCurrentStepIndex = () => {
    if (!trackingData) return 0;
    const statusMap: { [key: string]: number } = {
      'pending': 0,
      'assigned': 1,
      'pickup': 2,
      'picked_up': 2,
      'in_transit': 3,
      'delivered': 4,
    };
    return statusMap[trackingData.status] || 0;
  };

  if (loading) {
    return <Loading message="Loading tracking information..." />;
  }

  if (error || !trackingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0A2540" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Your Delivery</Text>
          <View style={{ width: 24 }} />
        </View>
        <ErrorDisplay 
          message={error || 'Order not found'} 
          onRetry={orderId ? () => loadTrackingData() : undefined}
        />
      </SafeAreaView>
    );
  }

  const currentStatusIndex = getCurrentStepIndex();
  
  // Use customer location if pinned, otherwise use a default location for Accra, Ghana
  const DEFAULT_LOCATION = { lat: 5.6037, lng: -0.1870 }; // Accra city center
  const customerLocation = trackingData.customer_location || DEFAULT_LOCATION;
  const hasCustomerLocation = !!trackingData.customer_location;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order #{trackingData.order_id}</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#0A2540" />
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: customerLocation.lat,
          longitude: customerLocation.lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        provider={PROVIDER_DEFAULT}
      >
        {/* Customer Location */}
        <Marker 
          coordinate={{
            latitude: customerLocation.lat,
            longitude: customerLocation.lng,
          }} 
          title={hasCustomerLocation ? "📍 Pinned Location" : "Delivery Location (Approximate)"}
          description={trackingData.customer_address}
        >
          <View style={[
            styles.customerMarker,
            hasCustomerLocation && styles.pinnedMarker
          ]}>
            <Ionicons 
              name={hasCustomerLocation ? "pin" : "home"} 
              size={28} 
              color="#ffffff" 
            />
            {hasCustomerLocation && (
              <View style={styles.pinnedMarkerBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
              </View>
            )}
          </View>
        </Marker>

        {/* Rider Location */}
        {trackingData.rider_location && (
          <Marker 
            coordinate={{
              latitude: trackingData.rider_location.lat,
              longitude: trackingData.rider_location.lng,
            }} 
            title={trackingData.rider_name || 'Rider'}
            description="Your rider"
          >
            <View style={styles.riderMarker}>
              <Ionicons name="bicycle" size={28} color="#ffffff" />
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {trackingData.rider_location && (
          <Polyline
            coordinates={[
              { latitude: trackingData.rider_location.lat, longitude: trackingData.rider_location.lng },
              { latitude: customerLocation.lat, longitude: customerLocation.lng },
            ]}
            strokeColor="#3b82f6"
            strokeWidth={4}
            lineDashPattern={[10, 5]}
          />
        )}
      </MapView>

      <ScrollView 
        style={styles.bottomSheet}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ETA */}
        {trackingData.estimated_arrival && trackingData.status !== 'delivered' && (
          <View style={styles.etaCard}>
            <Ionicons name="time-outline" size={32} color="#3b82f6" />
            <View style={styles.etaContent}>
              <Text style={styles.etaLabel}>Estimated Arrival</Text>
              <Text style={styles.etaTime}>{trackingData.estimated_arrival}</Text>
            </View>
          </View>
        )}

        {/* Order Status Progress */}
        <View style={styles.statusProgressCard}>
          <Text style={styles.cardTitle}>Delivery Progress</Text>
          {statusSteps.map((step, index) => (
            <View key={step.key}>
              <View style={styles.statusStepRow}>
                <View style={styles.statusStepLeft}>
                  <View style={[
                    styles.statusStepDot,
                    index <= currentStatusIndex && styles.statusStepDotActive
                  ]}>
                    {index < currentStatusIndex && (
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    )}
                  </View>
                  {index < statusSteps.length - 1 && (
                    <View style={[
                      styles.statusStepLine,
                      index < currentStatusIndex && styles.statusStepLineActive
                    ]} />
                  )}
                </View>
                <View style={styles.statusStepContent}>
                  <View style={styles.statusStepHeader}>
                    <Ionicons 
                      name={step.icon as any} 
                      size={20} 
                      color={index <= currentStatusIndex ? '#3b82f6' : '#9ca3af'} 
                    />
                    <Text style={[
                      styles.statusStepLabel,
                      index <= currentStatusIndex && styles.statusStepLabelActive
                    ]}>
                      {step.label}
                    </Text>
                  </View>
                  {trackingData.status_history && trackingData.status_history[index] && (
                    <Text style={styles.statusStepTime}>
                      {new Date(trackingData.status_history[index].timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Live Tracking Status & ETA */}
        {liveTracking && (eta || distance) && (
          <View style={styles.liveTrackingCard}>
            <View style={styles.liveHeader}>
              <View style={styles.liveIndicator}>
                <View style={styles.livePulse} />
                <Ionicons name="navigate" size={16} color="#10b981" />
              </View>
              <Text style={styles.liveText}>Live Tracking Active</Text>
            </View>
            <View style={styles.liveMetricsRow}>
              {eta && (
                <View style={styles.liveMetricCard}>
                  <Ionicons name="time-outline" size={24} color="#3b82f6" />
                  <View>
                    <Text style={styles.liveMetricLabel}>ETA</Text>
                    <Text style={styles.liveMetricValue}>{eta}</Text>
                  </View>
                </View>
              )}
              {distance && (
                <View style={styles.liveMetricCard}>
                  <Ionicons name="navigate-outline" size={24} color="#8b5cf6" />
                  <View>
                    <Text style={styles.liveMetricLabel}>Distance</Text>
                    <Text style={styles.liveMetricValue}>{distance}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rider Info */}
        {trackingData.rider_name && (
          <View style={styles.riderCard}>
            <Text style={styles.riderCardTitle}>Your Rider</Text>
            <View style={styles.riderHeader}>
              <View style={styles.riderAvatarContainer}>
                <Image
                  source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(trackingData.rider_name)}&background=3b82f6&color=fff&size=200&bold=true&rounded=true` }}
                  style={styles.riderAvatar}
                />
                <View style={styles.riderOnlineBadge}>
                  <View style={styles.onlineDot} />
                </View>
              </View>
              <View style={styles.riderInfo}>
                <Text style={styles.riderName}>{trackingData.rider_name}</Text>
                {trackingData.rider_rating && (
                  <View style={styles.riderRatingContainer}>
                    <Ionicons name="star" size={18} color="#fbbf24" />
                    <Text style={styles.riderRating}>
                      {trackingData.rider_rating?.toFixed(1) || 'N/A'}
                    </Text>
                    <Text style={styles.riderRatingText}> (Excellent)</Text>
                  </View>
                )}
                {trackingData.rider_phone && (
                  <View style={styles.riderPhoneContainer}>
                    <Ionicons name="call-outline" size={16} color="#6b7280" />
                    <Text style={styles.riderPhone}>{trackingData.rider_phone}</Text>
                  </View>
                )}
              </View>
            </View>
            {trackingData.rider_phone && (
              <View style={styles.riderActions}>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={handleCallRider}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={20} color="#ffffff" />
                  <Text style={styles.callButtonText}>Call</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.chatButton}
                  onPress={() => navigation.navigate('Chat', {
                    orderId: trackingData.order_id,
                    chatRoomId: `order_${trackingData.order_id}`,
                    participant: {
                      id: 101,
                      name: trackingData.rider_name || 'Rider',
                      type: 'rider',
                      is_online: true,
                    },
                  })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble" size={20} color="#3b82f6" />
                  <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Order Details */}
        <View style={styles.orderDetailsCard}>
          <Text style={styles.cardTitle}>Order Details</Text>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="receipt-outline" size={20} color="#6b7280" />
            <Text style={styles.orderDetailLabel}>Order ID:</Text>
            <Text style={styles.orderDetailValue}>#{trackingData.order_id}</Text>
          </View>
          
          <View style={styles.orderDetailRow}>
            <Ionicons name="location-outline" size={20} color="#6b7280" />
            <Text style={styles.orderDetailLabel}>Address:</Text>
            <Text style={styles.orderDetailValue} numberOfLines={2}>
              {trackingData.customer_address}
            </Text>
          </View>

          {/* Pinned Location Info */}
          {trackingData.customer_location ? (
            <View style={styles.pinnedLocationRow}>
              <View style={styles.pinnedLocationInfo}>
                <View style={styles.pinnedLocationBadge}>
                  <Ionicons name="pin" size={18} color="#10b981" />
                  <Text style={styles.pinnedLocationText}>Exact location pinned</Text>
                </View>
                {loadingAddress ? (
                  <Text style={styles.formattedAddress}>Loading address...</Text>
                ) : customerAddressFormatted ? (
                  <Text style={styles.formattedAddress}>📍 {customerAddressFormatted}</Text>
                ) : (
                  <Text style={styles.locationCoordinates}>
                    {trackingData.customer_location.lat.toFixed(5)}, {trackingData.customer_location.lng.toFixed(5)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.openMapButton}
                onPress={() => {
                  const lat = trackingData.customer_location!.lat;
                  const lng = trackingData.customer_location!.lng;
                  const url = `https://www.google.com/maps?q=${lat},${lng}`;
                  Linking.openURL(url);
                }}
              >
                <Ionicons name="map-outline" size={16} color="#3b82f6" />
                <Text style={styles.openMapText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationWarningRow}>
              <View style={styles.locationWarningBadge}>
                <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                <Text style={styles.locationWarningText}>
                  Location not pinned - Using text address
                </Text>
              </View>
            </View>
          )}

          {/* Update Location Button - Only for pending/assigned orders */}
          {(trackingData.status === 'pending' || trackingData.status === 'assigned') && (
            <TouchableOpacity
              style={styles.updateLocationButton}
              onPress={handleOpenLocationPicker}
            >
              <Ionicons name="location" size={18} color="#3b82f6" />
              <Text style={styles.updateLocationText}>
                {trackingData.customer_location ? 'Update Location' : 'Pin Exact Location'}
              </Text>
            </TouchableOpacity>
          )}

          {trackingData.items && trackingData.items.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.itemsTitle}>Items</Text>
              {trackingData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemName}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    GH₵ {((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>GH₵ {(trackingData.total || 0).toFixed(2)}</Text>
              </View>
            </>
          )}
        </View>

        {/* Rate Rider Button - Only show for delivered orders */}
        {trackingData.status.toLowerCase() === 'delivered' && (
          <TouchableOpacity
            style={styles.rateRiderButton}
            onPress={() => setShowRatingModal(true)}
          >
            <Ionicons name="star" size={20} color="#FFD700" />
            <Text style={styles.rateRiderButtonText}>Rate Your Rider</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <OrderRatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleRatingSubmit}
        orderId={orderId || ''}
        riderName={trackingData.rider_name || 'Your Rider'}
      />

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <SafeAreaView style={styles.locationPickerContainer}>
          <View style={styles.locationPickerHeader}>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Ionicons name="close" size={24} color="#0A2540" />
            </TouchableOpacity>
            <Text style={styles.locationPickerTitle}>Update Delivery Location</Text>
            <View style={{ width: 24 }} />
          </View>

          {newLocation && (
            <MapView
              style={styles.locationPickerMap}
              initialRegion={{
                latitude: newLocation.lat,
                longitude: newLocation.lng,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onRegionChangeComplete={(region) => {
                setNewLocation({
                  lat: region.latitude,
                  lng: region.longitude,
                });
              }}
            >
              <Marker
                coordinate={{
                  latitude: newLocation.lat,
                  longitude: newLocation.lng,
                }}
                draggable
                onDragEnd={(e) => {
                  setNewLocation({
                    lat: e.nativeEvent.coordinate.latitude,
                    lng: e.nativeEvent.coordinate.longitude,
                  });
                }}
              >
                <View style={styles.locationPickerMarker}>
                  <Ionicons name="pin" size={32} color="#3b82f6" />
                </View>
              </Marker>
            </MapView>
          )}

          <View style={styles.locationPickerFooter}>
            <View style={styles.coordinatesDisplay}>
              <Text style={styles.coordinatesLabel}>Selected Location:</Text>
              <Text style={styles.coordinatesText}>
                {newLocation?.lat.toFixed(6)}, {newLocation?.lng.toFixed(6)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.getCurrentLocationButton}
              onPress={async () => {
                try {
                  const location = await Location.getCurrentPositionAsync({});
                  setNewLocation({
                    lat: location.coords.latitude,
                    lng: location.coords.longitude,
                  });
                } catch (error) {
                  Alert.alert('Error', 'Failed to get current location');
                }
              }}
            >
              <Ionicons name="navigate" size={18} color="#3b82f6" />
              <Text style={styles.getCurrentLocationText}>Use Current Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmLocationButton, updatingLocation && styles.confirmLocationButtonDisabled]}
              onPress={handleUpdateLocation}
              disabled={updatingLocation}
            >
              {updatingLocation ? (
                <Text style={styles.confirmLocationText}>Updating...</Text>
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  <Text style={styles.confirmLocationText}>Update Location</Text>
                </>
              )}
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
    backgroundColor: '#f3f4f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  map: {
    flex: 1,
  },
  customerMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinnedMarker: {
    backgroundColor: '#3b82f6',
  },
  pinnedMarkerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  riderMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheet: {
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  etaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  etaContent: {
    marginLeft: 16,
    flex: 1,
  },
  etaLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  etaTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e40af',
  },
  statusProgressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statusStepRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statusStepLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  statusStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusStepDotActive: {
    backgroundColor: '#3b82f6',
  },
  statusStepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  statusStepLineActive: {
    backgroundColor: '#3b82f6',
  },
  statusStepContent: {
    flex: 1,
    paddingBottom: 12,
  },
  statusStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusStepLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  statusStepLabelActive: {
    color: '#111827',
  },
  statusStepTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  riderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  riderCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  riderAvatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  riderAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#3b82f6',
    backgroundColor: '#e5e7eb',
  },
  riderOnlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  riderRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  riderRating: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
    marginLeft: 4,
  },
  riderRatingText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  riderPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  riderPhone: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  riderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  chatButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  chatButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '700',
  },
  orderDetailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  orderDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    width: 80,
  },
  orderDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b82f6',
  },
  liveTrackingCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  liveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  liveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065f46',
  },
  liveMetricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  liveMetricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 12,
  },
  liveMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  liveMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  rateRiderButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 8,
  },
  rateRiderButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  pinnedLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pinnedLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pinnedLocationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065f46',
  },
  pinnedLocationInfo: {
    flex: 1,
    gap: 8,
  },
  formattedAddress: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
    marginLeft: 24,
  },
  locationCoordinates: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    marginLeft: 24,
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  openMapText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  locationWarningRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  locationWarningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  locationWarningText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#92400e',
    flex: 1,
  },
  updateLocationButton: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  updateLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  locationPickerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  locationPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  locationPickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  locationPickerMap: {
    flex: 1,
  },
  locationPickerMarker: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPickerFooter: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  coordinatesDisplay: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  coordinatesLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  coordinatesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  getCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
    backgroundColor: '#ffffff',
  },
  getCurrentLocationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  confirmLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  confirmLocationButtonDisabled: {
    opacity: 0.6,
  },
  confirmLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default DeliveryTrackingScreen;