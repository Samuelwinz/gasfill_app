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
import RatingModal from '../components/RatingModal';
import ReviewCard from '../components/ReviewCard';
import DisputeModal from '../components/DisputeModal';
import { Rating } from '../types/rating';

const OrderHistoryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [filter, setFilter] = useState('All');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  // Rating states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState<Order | null>(null);
  const [orderRatings, setOrderRatings] = useState<Record<string, Rating[]>>({});
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeRatingId, setDisputeRatingId] = useState<string | null>(null);

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

  const loadOrderRatings = async (orderId: string) => {
    try {
      const ratings = await ApiService.getOrderRatings(orderId);
      setOrderRatings(prev => ({ ...prev, [orderId]: ratings }));
    } catch (err) {
      console.error('Failed to load ratings:', err);
    }
  };

  const handleSubmitRating = async (rating: number, comment: string, tags: string[]) => {
    if (!selectedOrderForRating) return;

    try {
      await ApiService.createRating({
        order_id: selectedOrderForRating.id,
        rating,
        comment,
        tags,
      });

      setToast({
        visible: true,
        message: 'Thank you for your feedback!',
        type: 'success',
      });

      loadOrderRatings(selectedOrderForRating.id);
    } catch (err: any) {
      throw new Error(err.message || 'Failed to submit rating');
    }
  };

  const handleDisputeRating = async (reason: string) => {
    if (!disputeRatingId) return;

    try {
      await ApiService.disputeRating(disputeRatingId, reason);
      setToast({
        visible: true,
        message: 'Your dispute has been submitted for review.',
        type: 'success',
      });

      // Refresh ratings for the order
      const order = orders.find(o => 
        orderRatings[o.id]?.some(r => r.id === disputeRatingId)
      );
      if (order) {
        loadOrderRatings(order.id);
      }
    } catch (err: any) {
      throw new Error(err.message || 'Failed to submit dispute');
    }
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
                
                {/* Rider Info - Show when order is assigned */}
                {order.rider_name && ['assigned', 'pickup', 'picked_up', 'in_transit'].includes(order.status.toLowerCase()) && (
                  <View style={styles.riderInfoCard}>
                    <View style={styles.riderIconContainer}>
                      <Ionicons name="bicycle" size={20} color="#10b981" />
                    </View>
                    <View style={styles.riderDetails}>
                      <Text style={styles.riderLabel}>Your Rider</Text>
                      <Text style={styles.riderName}>{order.rider_name}</Text>
                      {order.rider_phone && (
                        <Text style={styles.riderPhone}>{order.rider_phone}</Text>
                      )}
                    </View>
                    {order.rider_rating && (
                      <View style={styles.riderRatingBadge}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.riderRatingText}>{order.rider_rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                )}
                
                <View style={styles.itemsContainer}>
                  {order.items.map((item, index) => (
                    <Text key={index} style={styles.itemText}>
                      {item.quantity}x {item.name}
                    </Text>
                  ))}
                </View>

                {/* Pricing Breakdown */}
                <View style={styles.pricingSection}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Items Total</Text>
                    <Text style={styles.pricingValue}>GH₵ {order.total.toFixed(2)}</Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Delivery Fee</Text>
                    <Text style={styles.deliveryFee}>GH₵ {(order.delivery_fee || 10.0).toFixed(2)}</Text>
                  </View>
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
                  <Text style={styles.total}>GH₵ {order.total.toFixed(2)}</Text>
                </View>
                
                {/* Track Order Button for active orders */}
                {['pending', 'assigned', 'pickup', 'picked_up', 'in_transit'].includes(order.status.toLowerCase()) && (
                  <TouchableOpacity 
                    style={styles.trackButton}
                    onPress={() => navigation.navigate('DeliveryTracking', { orderId: order.id })}
                  >
                    <Ionicons name="location" size={18} color="#ffffff" />
                    <Text style={styles.trackButtonText}>Track Order</Text>
                  </TouchableOpacity>
                )}

                {/* Rating Section for delivered orders */}
                {order.status.toLowerCase() === 'delivered' && (
                  <View style={styles.ratingSection}>
                    {!orderRatings[order.id]?.some(r => r.reviewer_type === 'customer') && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() => {
                          setSelectedOrderForRating(order);
                          loadOrderRatings(order.id);
                          setShowRatingModal(true);
                        }}
                      >
                        <Ionicons name="star" size={18} color="#FFD700" />
                        <Text style={styles.rateButtonText}>Rate Rider</Text>
                      </TouchableOpacity>
                    )}
                    
                    {orderRatings[order.id]?.map((rating) => (
                      <ReviewCard
                        key={rating.id}
                        rating={rating}
                        currentUserId={user?.id || 0}
                        currentUserType="customer"
                        onDispute={(ratingId) => {
                          setDisputeRatingId(ratingId);
                          setShowDisputeModal(true);
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Rating Modal */}
      {selectedOrderForRating && (
        <RatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleSubmitRating}
          targetName={selectedOrderForRating.rider_name || 'Rider'}
          targetType="rider"
          title="Rate Your Rider"
        />
      )}

      {/* Dispute Modal */}
      <DisputeModal
        visible={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        onSubmit={handleDisputeRating}
        ratingId={disputeRatingId || ''}
      />
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
  riderInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  riderIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderDetails: {
    flex: 1,
  },
  riderLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  riderName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  riderPhone: {
    fontSize: 12,
    color: '#6b7280',
  },
  riderRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  riderRatingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
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
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  trackButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  ratingSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  rateButtonText: {
    color: '#F57C00',
    fontSize: 15,
    fontWeight: '600',
  },
  pricingSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#616161',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  deliveryFee: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
});

export default OrderHistoryScreen;