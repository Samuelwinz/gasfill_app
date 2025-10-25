import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StorageService } from '../utils/storage';
import { Order } from '../types';

const OrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const savedOrders = await StorageService.loadOrders();
      setOrders(savedOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return 'time-outline';
      case 'assigned': return 'person-outline';
      case 'pickup': return 'cube-outline';
      case 'in_transit': return 'car-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-outline';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.orderCount}>{orders.length} orders</Text>
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No orders yet</Text>
          <Text style={styles.emptyStateText}>
            Your orders will appear here once you place them
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {orders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>#{order.id}</Text>
                  <Text style={styles.orderDate}>
                    {formatDate(order.created_at)}
                  </Text>
                </View>
                
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) }
                ]}>
                  <Ionicons 
                    name={getStatusIcon(order.status)} 
                    size={14} 
                    color="#ffffff" 
                  />
                  <Text style={styles.statusText}>{order.status}</Text>
                </View>
              </View>

              <View style={styles.orderItems}>
                {order.items.slice(0, 2).map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    {item.quantity}x {item.name}
                  </Text>
                ))}
                {order.items.length > 2 && (
                  <Text style={styles.moreItems}>
                    +{order.items.length - 2} more item(s)
                  </Text>
                )}
              </View>

              <View style={styles.orderFooter}>
                <Text style={styles.orderTotal}>₵{order.total}</Text>
                <View style={styles.orderActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Ionicons name="eye-outline" size={16} color="#0b5ed7" />
                    <Text style={styles.actionButtonText}>View</Text>
                  </TouchableOpacity>
                  
                  {order.status === 'delivered' && (
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="repeat-outline" size={16} color="#10b981" />
                      <Text style={[styles.actionButtonText, { color: '#10b981' }]}>
                        Reorder
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {order.tracking_info && (
                <View style={styles.trackingInfo}>
                  <Ionicons name="location-outline" size={14} color="#6b7280" />
                  <Text style={styles.trackingText}>
                    {order.tracking_info.rider_name || 'Tracking available'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  orderCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
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
  },
  content: {
    flex: 1,
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b5ed7',
  },
  trackingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  trackingText: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default OrdersScreen;