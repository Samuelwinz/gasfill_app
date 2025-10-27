import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import ApiService from '../services/api';
import { Order } from '../types';

interface HomeScreenProps {
  navigation: any;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userName, setUserName] = useState('Akon');
  const [points, setPoints] = useState(1200);
  const [ordersCompleted, setOrdersCompleted] = useState(42);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadUserData();
    loadActiveOrders();
  }, []);

  const loadActiveOrders = async () => {
    try {
      const orders = await ApiService.getCustomerOrders();
      const active = orders.filter(order => 
        ['pending', 'assigned', 'pickup', 'picked_up', 'in_transit'].includes(order.status.toLowerCase())
      );
      setActiveOrders(active.slice(0, 2)); // Show max 2 active orders
    } catch (error) {
      console.log('Error loading active orders:', error);
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
                style={styles.activeOrderCard}
                onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
              >
                <View style={styles.activeOrderHeader}>
                  <View style={styles.activeOrderInfo}>
                    <Text style={styles.activeOrderId}>Order #{order.id}</Text>
                    <Text style={styles.activeOrderStatus}>
                      {order.status === 'pending' && '⏳ Order Placed'}
                      {order.status === 'assigned' && '👤 Rider Assigned'}
                      {order.status === 'pickup' && '📦 Picking Up'}
                      {order.status === 'picked_up' && '📦 Picked Up'}
                      {order.status === 'in_transit' && '🚴 On the Way'}
                    </Text>
                  </View>
                  <View style={styles.trackIconContainer}>
                    <Ionicons name="location" size={20} color="#10b981" />
                  </View>
                </View>
                <View style={styles.activeOrderItems}>
                  {order.items.slice(0, 2).map((item, idx) => (
                    <Text key={idx} style={styles.activeOrderItem}>
                      {item.quantity}x {item.name}
                    </Text>
                  ))}
                  {order.items.length > 2 && (
                    <Text style={styles.activeOrderItem}>
                      +{order.items.length - 2} more
                    </Text>
                  )}
                </View>
                <View style={styles.activeOrderFooter}>
                  <Text style={styles.activeOrderTotal}>₵{order.total.toFixed(2)}</Text>
                  <View style={styles.trackButton}>
                    <Ionicons name="navigate" size={14} color="#10b981" />
                    <Text style={styles.trackText}>Track Order</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#d1fae5',
    borderRadius: 8,
  },
  trackText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
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
});

export default HomeScreen;