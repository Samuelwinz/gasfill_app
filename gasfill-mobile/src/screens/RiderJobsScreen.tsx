import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getAvailableOrders,
  getActiveOrders,
  acceptOrder,
  updateOrderStatus,
  AvailableOrder,
  ActiveOrder,
} from '../services/riderApi';
import { useRiderUpdates } from '../context/WebSocketContext';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

interface RiderJobsScreenProps {
  navigation: any;
}

const RiderJobsScreen: React.FC<RiderJobsScreenProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [availableJobs, setAvailableJobs] = useState<AvailableOrder[]>([]);
  const [activeJobs, setActiveJobs] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AvailableOrder | ActiveOrder | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Subscribe to real-time updates
  useRiderUpdates({
    onNewOrder: (data) => {
      console.log('🔔 New order available:', data);
      // Show notification
      Alert.alert(
        'New Order Available!',
        `A new order is waiting for you. Check available jobs.`,
        [{ text: 'View', onPress: () => {
          setActiveTab('available');
          loadJobs();
        }}, { text: 'Later', style: 'cancel' }]
      );
      // Refresh available orders if on that tab
      if (activeTab === 'available') {
        loadJobs();
      }
    },
    onOrderStatusUpdate: (data) => {
      console.log('📦 Order status updated:', data);
      // Refresh active orders if on that tab
      if (activeTab === 'active') {
        loadJobs();
      }
    },
  });

  useEffect(() => {
    loadJobs();
  }, [activeTab]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'available') {
        const orders = await getAvailableOrders();
        setAvailableJobs(orders);
        console.log('✅ Available orders loaded:', orders.length);
      } else {
        const orders = await getActiveOrders();
        setActiveJobs(orders);
        console.log('✅ Active orders loaded:', orders.length);
      }
    } catch (err: any) {
      console.error('❌ Error loading orders:', err);
      setError(err.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJobs();
    setRefreshing(false);
  };

  const handleAcceptOrder = async (order: AvailableOrder) => {
    try {
      setActionLoading(true);
      
      const response = await acceptOrder(order.id);
      console.log('✅ Order accepted:', response);
      
      Alert.alert(
        'Order Accepted!',
        `You've accepted order #${order.id}. Head to the pickup location.`,
        [{ text: 'OK', onPress: () => {
          setShowDetailsModal(false);
          setActiveTab('active');
          loadJobs();
        }}]
      );
    } catch (err: any) {
      console.error('❌ Error accepting order:', err);
      Alert.alert('Error', err.message || 'Failed to accept order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (order: ActiveOrder, newStatus: 'pickup' | 'in_transit' | 'delivered') => {
    try {
      setActionLoading(true);
      
      const response = await updateOrderStatus(order.id, { status: newStatus });
      console.log('✅ Order status updated:', response);
      
      const statusMessages = {
        pickup: 'Pickup confirmed! Heading to delivery location.',
        in_transit: 'In transit. Deliver to customer.',
        delivered: 'Delivery complete! Great job!'
      };
      
      Alert.alert(
        'Status Updated',
        statusMessages[newStatus],
        [{ text: 'OK', onPress: () => {
          setShowDetailsModal(false);
          loadJobs();
        }}]
      );
    } catch (err: any) {
      console.error('❌ Error updating status:', err);
      Alert.alert('Error', err.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
      case 'assigned':
        return '#fbbf24';
      case 'pickup':
        return '#60a5fa';
      case 'in_transit':
        return '#a78bfa';
      case 'delivered':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const renderJobCard = (job: AvailableOrder | ActiveOrder) => (
    <TouchableOpacity
      key={job.id}
      style={styles.jobCard}
      onPress={() => {
        setSelectedOrder(job);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.jobId}>#{job.id}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{job.status.replace('_', ' ').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.jobContent}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{job.customer_name}</Text>
          <Text style={styles.customerPhone}>{job.customer_phone}</Text>
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {job.items.length} item(s) - ₵{job.total_amount}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.detailText} numberOfLines={1}>
              {job.delivery_address}
            </Text>
          </View>

          {job.distance && (
            <View style={styles.detailRow}>
              <Ionicons name="navigate-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{(job.distance ?? 0).toFixed(1)} km away</Text>
            </View>
          )}
        </View>

        <View style={styles.jobFooter}>
          <View style={styles.earnings}>
            <Text style={styles.earningsLabel}>Delivery Fee</Text>
            <Text style={styles.earningsAmount}>₵{job.delivery_fee}</Text>
          </View>
          
          <View style={styles.viewDetails}>
            <Text style={styles.viewDetailsText}>Tap for details</Text>
            <Ionicons name="chevron-forward" size={16} color="#6b7280" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    if (loading) {
      return <Loading message="Loading orders..." />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <ErrorDisplay message={error} onRetry={loadJobs} retryText="Retry" />
        </View>
      );
    }

    const jobs = activeTab === 'available' ? availableJobs : activeJobs;
    const emptyMessage = activeTab === 'available' 
      ? 'No available orders right now'
      : 'No active orders';

    if (jobs.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>{emptyMessage}</Text>
          <Text style={styles.emptyStateText}>
            {activeTab === 'available' ? 'New orders will appear here when customers place them' : 'Accept orders from the Available tab'}
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.jobsList}>
        {jobs.map(renderJobCard)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Order Management</Text>
            <Text style={styles.headerSubtitle}>Available & active deliveries</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <View style={styles.refreshIcon}>
              <Ionicons name="refresh" size={20} color="#10b981" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available ({availableJobs.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeJobs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
        }
      >
        {renderTabContent()}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details</Text>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {selectedOrder && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order #{selectedOrder.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status), alignSelf: 'flex-start', marginTop: 8 }]}>
                  <Text style={styles.statusText}>{selectedOrder.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Customer</Text>
                <Text style={styles.modalText}>{selectedOrder.customer_name}</Text>
                <Text style={styles.modalSubtext}>{selectedOrder.customer_phone}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Items</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
                    <Text style={styles.itemPrice}>₵{(item.price ?? 0).toFixed(2)}</Text>
                  </View>
                ))}
                <View style={[styles.itemRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>₵{(selectedOrder.total_amount ?? 0).toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Delivery Address</Text>
                <Text style={styles.modalText}>{selectedOrder.delivery_address}</Text>
                {selectedOrder.distance && (
                  <Text style={styles.modalSubtext}>{(selectedOrder.distance ?? 0).toFixed(1)} km away</Text>
                )}
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Delivery Fee</Text>
                <Text style={[styles.modalText, { color: '#10b981', fontSize: 24, fontWeight: '700' }]}>
                  ₵{(selectedOrder.delivery_fee ?? 0).toFixed(2)}
                </Text>
              </View>

              {/* Action Buttons */}
              {activeTab === 'available' && (
                <TouchableOpacity
                  style={[styles.primaryButton, actionLoading && styles.disabledButton]}
                  onPress={() => handleAcceptOrder(selectedOrder as AvailableOrder)}
                  disabled={actionLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {actionLoading ? 'Accepting...' : 'Accept Order'}
                  </Text>
                </TouchableOpacity>
              )}

              {activeTab === 'active' && (
                <View style={styles.actionButtons}>
                  {/* Chat Button */}
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => {
                      setShowDetailsModal(false);
                      navigation.navigate('Chat', {
                        orderId: selectedOrder.id,
                        chatRoomId: `order_${selectedOrder.id}`,
                        participant: {
                          id: 1,
                          name: selectedOrder.customer_name,
                          type: 'customer',
                          is_online: true,
                        },
                      });
                    }}
                  >
                    <Ionicons name="chatbubble" size={20} color="#3b82f6" />
                    <Text style={styles.chatButtonText}>Chat with Customer</Text>
                  </TouchableOpacity>

                  {(selectedOrder as ActiveOrder).status === 'assigned' && (
                    <TouchableOpacity
                      style={[styles.primaryButton, actionLoading && styles.disabledButton]}
                      onPress={() => handleUpdateStatus(selectedOrder as ActiveOrder, 'pickup')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Confirm Pickup</Text>
                    </TouchableOpacity>
                  )}

                  {(selectedOrder as ActiveOrder).status === 'pickup' && (
                    <TouchableOpacity
                      style={[styles.primaryButton, actionLoading && styles.disabledButton]}
                      onPress={() => handleUpdateStatus(selectedOrder as ActiveOrder, 'in_transit')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="bicycle" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Start Delivery</Text>
                    </TouchableOpacity>
                  )}

                  {(selectedOrder as ActiveOrder).status === 'in_transit' && (
                    <TouchableOpacity
                      style={[styles.primaryButton, actionLoading && styles.disabledButton]}
                      onPress={() => handleUpdateStatus(selectedOrder as ActiveOrder, 'delivered')}
                      disabled={actionLoading}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                      <Text style={styles.primaryButtonText}>Mark as Delivered</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#10b981',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
  },
  refreshIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    borderRadius: 15,
  },
  activeTab: {
    borderBottomColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#10b981',
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  jobsList: {
    gap: 16,
  },
  jobCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  jobId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  jobContent: {
    padding: 16,
  },
  customerInfo: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earnings: {
    alignItems: 'flex-start',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  earningsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  acceptButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#0066cc',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  errorContainer: {
    flex: 1,
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemName: {
    fontSize: 14,
    color: '#111827',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#10b981',
    borderBottomWidth: 0,
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtons: {
    gap: 12,
  },
  chatButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#3b82f6',
    marginBottom: 12,
  },
  chatButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RiderJobsScreen;
