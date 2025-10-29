import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { StorageService } from '../utils/storage';
import ApiService from '../services/api';
import geocodingService from '../services/geocodingService';
import { Order } from '../types';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('Akon');
  const [points, setPoints] = useState(1200);
  const [ordersCompleted, setOrdersCompleted] = useState(42);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [orderAddresses, setOrderAddresses] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadUserData();
    loadActiveOrders();
    getCurrentLocation();
  }, []);

  const loadActiveOrders = async () => {
    try {
      const orders = await ApiService.getCustomerOrders();
      const active = orders.filter(order => 
        ['pending', 'assigned', 'pickup', 'picked_up', 'in_transit'].includes(order.status.toLowerCase())
      );
      setActiveOrders(active.slice(0, 2)); // Show max 2 active orders
      
      // Reverse geocode delivery addresses for active orders
      active.slice(0, 2).forEach(async (order) => {
        if (order.customer_location) {
          const address = await geocodingService.reverseGeocode(
            order.customer_location.lat,
            order.customer_location.lng
          );
          if (address) {
            setOrderAddresses(prev => ({ ...prev, [order.id]: address }));
          }
        }
      });
    } catch (error) {
      console.log('Error loading active orders:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      
      setCurrentLocation(coords);

      // Reverse geocode to get location name
      const address = await geocodingService.reverseGeocode(coords.lat, coords.lng);
      if (address) {
        // Extract just the area name (e.g., "Osu, Accra")
        const parts = address.split(',');
        setLocationName(parts.slice(0, 2).join(',').trim());
      }
    } catch (error) {
      console.log('Error getting location:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  const calculateETA = (orderStatus: string): string => {
    const etaMap: { [key: string]: string } = {
      'pending': '30-45 min',
      'assigned': '25-35 min',
      'pickup': '20-30 min',
      'picked_up': '15-25 min',
      'in_transit': '10-15 min',
    };
    return etaMap[orderStatus.toLowerCase()] || '30 min';
  };

  const getStatusProgress = (status: string): number => {
    const progressMap: { [key: string]: number } = {
      'pending': 20,
      'assigned': 40,
      'pickup': 60,
      'picked_up': 70,
      'in_transit': 90,
      'delivered': 100,
    };
    return progressMap[status.toLowerCase()] || 0;
  };

  const handleCallRider = (order: Order) => {
    if (order.rider_phone) {
      Alert.alert(
        'Call Rider',
        `Do you want to call the rider for order #${order.id}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${order.rider_phone}`).catch((err) => {
                Alert.alert('Error', 'Unable to make phone call');
                console.error('Error calling rider:', err);
              });
            },
          },
        ]
      );
    } else {
      Alert.alert('No Contact', 'Rider contact information not available yet');
    }
  };

  const loadUserData = async () => {
    try {
      const user = await StorageService.getUser();
      if (user) {
        setUserName(user.username || 'Akon');
      }
      // Mock data for points and orders
      // In a real app, this would come from an API
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F7FA" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {userName}!</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Notifications')}
              style={styles.notificationButton}
            >
              <Ionicons name="notifications-outline" size={24} color="#1F2937" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?u=akon' }} // Placeholder image
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.loyaltyCard}>
          <View style={styles.loyaltyHeader}>
            <Text style={styles.levelText}>Level</Text>
            <Text style={styles.pointsText}>→ Points</Text>
          </View>
          <View style={styles.loyaltyBody}>
            <View style={styles.loyaltyProgress}>
              <View style={styles.progressBar}>
                <View style={[styles.progress, { width: `${(ordersCompleted / 50) * 100}%` }]} />
              </View>
            </View>
            <Text style={styles.ordersCompleted}>{ordersCompleted} Orders Completed</Text>
          </View>
        </View>

        {/* Location Banner */}
        {currentLocation && (
          <View style={styles.locationBanner}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="location-sharp" size={24} color="#10b981" />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Your Location</Text>
              {loadingLocation ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <Text style={styles.locationText}>
                  {locationName || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={getCurrentLocation}>
              <Ionicons name="refresh" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.quickAccessGrid}>
          <TouchableOpacity style={styles.quickAccessCard} onPress={() => navigation.navigate('Products')}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="flame" size={40} color="#FF6F00" />
            </View>
            <Text style={styles.cardTitle}>Order Gas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAccessCard} onPress={() => navigation.navigate('Orders')}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="car" size={40} color="#0A2540" />
            </View>
            <Text style={styles.cardTitle}>Track Delivery</Text>
          </TouchableOpacity>
        </View>

        {/* Active Orders Section */}
        {activeOrders.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Deliveries</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {activeOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.enhancedOrderCard}
                onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
              >
                {/* Progress Bar */}
                <View style={styles.orderProgressBar}>
                  <View style={[styles.orderProgress, { width: `${getStatusProgress(order.status)}%` }]} />
                </View>

                {/* Order Header */}
                <View style={styles.activeOrderHeader}>
                  <View style={styles.activeOrderInfo}>
                    <Text style={styles.activeOrderId}>Order #{order.id}</Text>
                    <View style={styles.statusBadge}>
                      <View style={styles.statusDot} />
                      <Text style={styles.activeOrderStatus}>
                        {order.status === 'pending' && 'Order Placed'}
                        {order.status === 'assigned' && 'Rider Assigned'}
                        {order.status === 'pickup' && 'Picking Up'}
                        {order.status === 'picked_up' && 'Picked Up'}
                        {order.status === 'in_transit' && 'On the Way'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.etaBadge}>
                    <Ionicons name="time-outline" size={14} color="#10b981" />
                    <Text style={styles.etaText}>ETA {calculateETA(order.status)}</Text>
                  </View>
                </View>

                {/* Delivery Address with Reverse Geocoding */}
                {order.customer_location && orderAddresses[order.id] && (
                  <View style={styles.deliveryAddressRow}>
                    <Ionicons name="location" size={16} color="#6b7280" />
                    <Text style={styles.deliveryAddressText} numberOfLines={1}>
                      {orderAddresses[order.id]}
                    </Text>
                  </View>
                )}

                {/* Mini Map Preview (if rider location available) */}
                {order.rider_location && order.customer_location && (
                  <View style={styles.miniMapContainer}>
                    <MapView
                      style={styles.miniMap}
                      provider={PROVIDER_DEFAULT}
                      initialRegion={{
                        latitude: (order.rider_location.lat + order.customer_location.lat) / 2,
                        longitude: (order.rider_location.lng + order.customer_location.lng) / 2,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}
                      scrollEnabled={false}
                      zoomEnabled={false}
                      rotateEnabled={false}
                      pitchEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: order.rider_location.lat,
                          longitude: order.rider_location.lng,
                        }}
                      >
                        <View style={styles.riderMarker}>
                          <Ionicons name="bicycle" size={16} color="#ffffff" />
                        </View>
                      </Marker>
                      <Marker
                        coordinate={{
                          latitude: order.customer_location.lat,
                          longitude: order.customer_location.lng,
                        }}
                      >
                        <View style={styles.customerMarker}>
                          <Ionicons name="home" size={16} color="#ffffff" />
                        </View>
                      </Marker>
                    </MapView>
                    <View style={styles.miniMapOverlay}>
                      <Ionicons name="expand-outline" size={16} color="#ffffff" />
                    </View>
                  </View>
                )}

                {/* Items */}
                <View style={styles.activeOrderItems}>
                  {order.items.slice(0, 2).map((item, idx) => (
                    <Text key={idx} style={styles.activeOrderItem}>
                      {item.quantity}x {item.name}
                    </Text>
                  ))}
                  {order.items.length > 2 && (
                    <Text style={styles.activeOrderItem}>
                      +{order.items.length - 2} more items
                    </Text>
                  )}
                </View>

                {/* Footer with Actions */}
                <View style={styles.enhancedOrderFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.activeOrderTotal}>GH₵ {order.total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.orderActions}>
                    {order.rider_phone && (
                      <TouchableOpacity 
                        style={styles.callButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCallRider(order);
                        }}
                      >
                        <Ionicons name="call" size={16} color="#3b82f6" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.trackButton}>
                      <Ionicons name="navigate" size={16} color="#ffffff" />
                      <Text style={styles.trackText}>Track Live</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('RefillPlans')}>
            <Ionicons name="flame" size={24} color="#FF6F00" />
            <Text style={styles.quickActionText}>Refill Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('Support')}>
            <Ionicons name="help-buoy" size={24} color="#0A2540" />
            <Text style={styles.quickActionText}>Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FA',
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  loyaltyCard: {
    backgroundColor: '#0A2540',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  loyaltyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsText: {
    fontSize: 16,
    color: '#B2C7DD',
  },
  loyaltyBody: {
    alignItems: 'flex-end',
  },
  loyaltyProgress: {
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  progress: {
    height: 10,
    backgroundColor: '#FFC107',
    borderRadius: 5,
  },
  ordersCompleted: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  quickAccessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickAccessCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardIconContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A2540',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A2540',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A2540',
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  activeOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  activeOrderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeOrderInfo: {
    flex: 1,
  },
  activeOrderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  activeOrderStatus: {
    fontSize: 14,
    color: '#6b7280',
  },
  trackIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeOrderItems: {
    marginBottom: 12,
  },
  activeOrderItem: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 2,
  },
  activeOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  activeOrderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 10,
  },
  trackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F4F7FA',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  // Location Banner Styles
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  locationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 14,
    color: '#065f46',
    fontWeight: '600',
    marginTop: 2,
  },
  // Enhanced Order Card Styles
  enhancedOrderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  orderProgressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  orderProgress: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  etaText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  deliveryAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  deliveryAddressText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
  },
  miniMapContainer: {
    position: 'relative',
    height: 120,
    marginVertical: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
  miniMapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 6,
    borderRadius: 8,
  },
  riderMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  customerMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  enhancedOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;