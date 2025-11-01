import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import { getRiderOrderDetails, ActiveOrder } from '../services/riderApi';
import locationTrackingService from '../services/locationTracking';
import { useLocationTracking } from '../hooks/useLocationTracking';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

interface RiderDeliveryMapScreenProps {
  navigation: any;
  route: {
    params?: {
      orderId: string;
      customerName?: string;
      customerAddress?: string;
      customerPhone?: string;
    };
  };
}

const RiderDeliveryMapScreen: React.FC<RiderDeliveryMapScreenProps> = ({ navigation, route }) => {
  const [trackingData, setTrackingData] = useState<ActiveOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const orderId = route.params?.orderId;

  // Track rider's current location
  const { currentLocation, isTracking } = useLocationTracking({
    enabled: true,
    intervalMs: 5000, // Update every 5 seconds for active delivery
  });

  // Load order tracking data
  const loadTrackingData = useCallback(async () => {
    if (!orderId) {
      setError('Order ID is required');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      console.log('[RiderDeliveryMap] Loading order details for:', orderId);
      const orderData = await getRiderOrderDetails(orderId);
      
      console.log('[RiderDeliveryMap] Order data received:', orderData);
      setTrackingData(orderData);
      
      // Calculate initial distance and ETA
      const customerLoc = orderData.customer_location || orderData.delivery_location;
      if (customerLoc && currentLocation) {
        updateDistanceAndETA(
          currentLocation.latitude,
          currentLocation.longitude,
          customerLoc.lat,
          customerLoc.lng
        );
      }
    } catch (err: any) {
      console.error('[RiderDeliveryMap] Error loading tracking data:', err);
      setError(err.message || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId, currentLocation]);

  // Update distance and ETA when rider location changes
  useEffect(() => {
    const customerLoc = trackingData?.customer_location || trackingData?.delivery_location;
    if (currentLocation && customerLoc) {
      updateDistanceAndETA(
        currentLocation.latitude,
        currentLocation.longitude,
        customerLoc.lat,
        customerLoc.lng
      );

      // Fit map to show both locations
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: currentLocation.latitude, longitude: currentLocation.longitude },
            { latitude: customerLoc.lat, longitude: customerLoc.lng },
          ],
          {
            edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
          }
        );
      }
    }
  }, [currentLocation, trackingData]);

  const updateDistanceAndETA = (
    riderLat: number,
    riderLng: number,
    customerLat: number,
    customerLng: number
  ) => {
    const distanceMeters = locationTrackingService.calculateDistance(
      riderLat,
      riderLng,
      customerLat,
      customerLng
    );
    
    const distanceKm = (distanceMeters / 1000).toFixed(1);
    setDistance(`${distanceKm} km`);
    
    // Estimate ETA (assuming average speed of 20 km/h for bike delivery)
    const avgSpeedKmh = 20;
    const etaMinutes = Math.round((parseFloat(distanceKm) / avgSpeedKmh) * 60);
    setEta(`${etaMinutes} min`);
  };

  useEffect(() => {
    loadTrackingData();
  }, [loadTrackingData]);

  const handleCallCustomer = () => {
    if (trackingData?.customer_phone) {
      const phoneUrl = `tel:${trackingData.customer_phone}`;
      Linking.canOpenURL(phoneUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(phoneUrl);
          } else {
            Alert.alert('Error', 'Cannot make phone calls on this device');
          }
        })
        .catch((err) => console.error('Error opening phone dialer:', err));
    }
  };

  const handleOpenMaps = () => {
    const customerLoc = trackingData?.customer_location || trackingData?.delivery_location;
    if (!customerLoc) {
      Alert.alert('Error', 'Customer location not available');
      return;
    }

    const { lat, lng } = customerLoc;
    const address = trackingData?.delivery_address || 'Delivery Location';
    const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
    const url = Platform.select({
      ios: `${scheme}${lat},${lng}?q=${address}`,
      android: `${scheme}${lat},${lng}?q=${lat},${lng}(${address})`,
    });

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Cannot open maps application');
      });
    }
  };

  if (loading) {
    return <Loading message="Loading delivery map..." />;
  }

  if (error || !trackingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Map</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorDisplay message={error || 'Order not found'} onRetry={loadTrackingData} />
      </SafeAreaView>
    );
  }

  const riderLocation = currentLocation
    ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
    : null;
  
  // Try to get customer location from various sources
  const customerLocation = trackingData.customer_location 
    || trackingData.delivery_location 
    || null;
  
  // If no location coordinates available, show error
  if (!customerLocation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Delivery Map</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.noLocationContainer}>
          <Ionicons name="location-outline" size={80} color="#d1d5db" />
          <Text style={styles.noLocationTitle}>Location Not Available</Text>
          <Text style={styles.noLocationText}>
            Customer location coordinates are not available for this order.
          </Text>
          <View style={styles.addressCard}>
            <Text style={styles.addressLabel}>Delivery Address:</Text>
            <Text style={styles.addressText}>{trackingData.delivery_address}</Text>
            <TouchableOpacity
              style={styles.openMapsButton}
              onPress={() => {
                // Try to open address in maps app
                const address = encodeURIComponent(trackingData.delivery_address);
                const url = Platform.select({
                  ios: `maps:0,0?q=${address}`,
                  android: `geo:0,0?q=${address}`,
                });
                if (url) {
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Error', 'Cannot open maps application');
                  });
                }
              }}
            >
              <Ionicons name="map" size={20} color="#ffffff" />
              <Text style={styles.openMapsButtonText}>Search in Maps</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.callButtonLarge}
            onPress={handleCallCustomer}
          >
            <Ionicons name="call" size={20} color="#ffffff" />
            <Text style={styles.callButtonText}>Call Customer: {trackingData.customer_phone}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Delivery to {trackingData.customer_name}</Text>
          <Text style={styles.headerSubtitle}>{trackingData.delivery_address}</Text>
        </View>
        <TouchableOpacity onPress={handleCallCustomer} style={styles.callButton}>
          <Ionicons name="call" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      {/* Location Tracking Status */}
      {isTracking && (
        <View style={styles.trackingBanner}>
          <View style={styles.trackingIndicator}>
            <View style={styles.trackingPulse} />
            <Text style={styles.trackingText}>Live Tracking Active</Text>
          </View>
          {distance && eta && (
            <Text style={styles.distanceText}>{distance} • {eta}</Text>
          )}
        </View>
      )}

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: customerLocation.lat,
          longitude: customerLocation.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Customer Location Marker */}
        <Marker
          coordinate={{
            latitude: customerLocation.lat,
            longitude: customerLocation.lng,
          }}
          title={trackingData.customer_name}
          description={trackingData.delivery_address}
        >
          <View style={styles.customerMarker}>
            <Ionicons name="home" size={24} color="#dc2626" />
          </View>
        </Marker>

        {/* Rider Location Marker */}
        {riderLocation && (
          <Marker
            coordinate={{
              latitude: riderLocation.lat,
              longitude: riderLocation.lng,
            }}
            title="Your Location"
          >
            <View style={styles.riderMarker}>
              <Ionicons name="bicycle" size={24} color="#ffffff" />
            </View>
          </Marker>
        )}

        {/* Route Line */}
        {riderLocation && (
          <Polyline
            coordinates={[
              { latitude: riderLocation.lat, longitude: riderLocation.lng },
              { latitude: customerLocation.lat, longitude: customerLocation.lng },
            ]}
            strokeColor="#3b82f6"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>

      {/* Bottom Card */}
      <View style={styles.bottomCard}>
        <View style={styles.orderInfo}>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6b7280" />
            <Text style={styles.infoText} numberOfLines={2}>
              {trackingData.delivery_address}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{trackingData.customer_phone}</Text>
          </View>

          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Order Items:</Text>
            {trackingData.items.map((item, index) => (
              <Text key={index} style={styles.itemText}>
                {item.quantity}x {item.name}
              </Text>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleOpenMaps}
          >
            <Ionicons name="navigate" size={20} color="#ffffff" />
            <Text style={styles.navigateButtonText}>Open in Maps</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.chatButton}
            onPress={() => {
              navigation.navigate('Chat', {
                orderId: trackingData.id,
                chatRoomId: `order_${trackingData.id}`,
                participant: {
                  id: 1,
                  name: trackingData.customer_name,
                  type: 'customer',
                  is_online: true,
                },
              });
            }}
          >
            <Ionicons name="chatbubble" size={20} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  callButton: {
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  placeholder: {
    width: 40,
  },
  trackingBanner: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#d1fae5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  trackingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065f46',
  },
  distanceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  map: {
    flex: 1,
  },
  customerMarker: {
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#dc2626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  riderMarker: {
    backgroundColor: '#3b82f6',
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  orderInfo: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  itemsSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  itemText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navigateButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noLocationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noLocationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noLocationText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  openMapsButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openMapsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  callButtonLarge: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  callButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RiderDeliveryMapScreen;
