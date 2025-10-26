import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import { StorageService } from '../utils/storage';
import { Order } from '../types';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

const OrderHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [filter, setFilter] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  useEffect(() => {
    loadOrders();
  }, [isAuthenticated]);

  const loadOrders = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      console.log('[OrderHistory] Loading orders, authenticated:', isAuthenticated);

      // Try to fetch from API first
      if (isAuthenticated) {
        try {
          const apiOrders = await ApiService.getCustomerOrders();
          console.log('[OrderHistory] Loaded from API:', apiOrders.length, 'orders');
          setOrders(apiOrders);
          
          // Save to local storage as backup
          for (const order of apiOrders) {
            await StorageService.addOrder(order);
          }
          return;
        } catch (apiError) {
          console.log('[OrderHistory] API failed, loading from local storage:', apiError);
        }
      }

      // Fallback to local storage
      const localOrders = await StorageService.loadOrders();
      console.log('[OrderHistory] Loaded from local storage:', localOrders.length, 'orders');
      setOrders(localOrders);

    } catch (error: any) {
      console.error('[OrderHistory] Error loading orders:', error);
      setError(error.message || 'Failed to load orders');
      setToast({
        visible: true,
        message: 'Failed to load orders',
        type: 'error',
      });
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadOrders(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Delivered':
        return {
          backgroundColor: '#E8F5E9',
          color: '#4CAF50',
          icon: 'checkmark-circle',
        };
      case 'On the Way':
        return {
          backgroundColor: '#FFF3E0',
          color: '#FF9800',
          icon: 'bicycle',
        };
      case 'Cancelled':
        return {
          backgroundColor: '#FFEBEE',
          color: '#F44336',
          icon: 'close-circle',
        };
      default:
        return {
          backgroundColor: '#F5F5F5',
          color: '#616161',
          icon: 'help-circle',
        };
    }
  };

  const filteredOrders =
    filter === 'All'
      ? orders
      : orders.filter((order) => {
          // Normalize status for filtering
          const normalizedStatus = order.status.toLowerCase();
          const normalizedFilter = filter.toLowerCase();
          
          if (normalizedFilter === 'delivered') return normalizedStatus === 'delivered';
          if (normalizedFilter === 'on the way') return ['in_transit', 'pickup', 'picked_up'].includes(normalizedStatus);
          if (normalizedFilter === 'cancelled') return normalizedStatus === 'cancelled';
          if (normalizedFilter === 'pending') return normalizedStatus === 'pending';
          
          return false;
        });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading orders..." />
      </SafeAreaView>
    );
  }

  if (error && orders.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay 
          title="Unable to load orders"
          message={error}
          onRetry={() => loadOrders()}
        />
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0A2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.filterContainer}>
        {['All', 'Delivered', 'On the Way', 'Cancelled'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.activeFilter]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f && styles.activeFilterText,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No orders found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'All' 
                ? 'You haven\'t placed any orders yet'
                : `No ${filter.toLowerCase()} orders`}
            </Text>
          </View>
        ) : (
          filteredOrders.map((order, orderIndex) => {
            const statusStyle = getStatusStyle(order.status);
            return (
              <View key={`${order.id}-${orderIndex}`} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderDate}>{formatDate(order.created_at)}</Text>
                </View>
                <View style={styles.itemsContainer}>
                  {order.items.map((item, index) => (
                    <Text key={index} style={styles.itemText}>
                      {item.quantity}x {item.name}
                    </Text>
                  ))}
                </View>
                <View style={styles.footer}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.backgroundColor },
                    ]}
                  >
                    <Ionicons
                      name={statusStyle.icon as any}
                      size={16}
                      color={statusStyle.color}
                    />
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>
                      {order.status}
                    </Text>
                  </View>
                  <Text style={styles.total}>₵{order.total.toFixed(2)}</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilter: {
    backgroundColor: '#0A2540',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  content: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  orderDate: {
    fontSize: 14,
    color: '#757575',
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: 'bold',
  },
  total: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A2540',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
  },
});

export default OrderHistoryScreen;