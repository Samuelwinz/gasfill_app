import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../services/api';
import adminApi from '../services/adminApi';
import { Rider, RefillOutlet, Commission, AdminStats, Payout } from '../types';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'riders' | 'outlets' | 'commissions' | 'payouts'>('overview');
  const [stats, setStats] = useState<any | null>(null);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [outlets, setOutlets] = useState<RefillOutlet[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [earningsOverview, setEarningsOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRiderModal, setShowRiderModal] = useState(false);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<RefillOutlet | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);
      
      if (activeTab === 'overview') {
        await loadStats();
      } else if (activeTab === 'riders') {
        await loadRiders();
      } else if (activeTab === 'outlets') {
        await loadOutlets();
      } else if (activeTab === 'commissions') {
        await loadCommissions();
      } else if (activeTab === 'payouts') {
        await loadPayouts();
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading admin dashboard stats...');
      const data = await adminApi.getDashboard();
      console.log('✅ Admin dashboard data:', data);
      
      // Transform backend data to match our stats structure
      setStats({
        total_orders: data.orders?.total || 0,
        pending_orders: data.orders?.pending || 0,
        completed_orders: data.orders?.completed || 0,
        total_users: data.users?.total || 0,
        active_users: data.users?.active || 0,
        new_users_this_month: data.users?.new_this_month || 0,
        total_revenue: data.revenue?.total || 0,
        monthly_revenue: data.revenue?.monthly || 0,
        total_services: data.services?.total || 0,
        pending_services: data.services?.pending || 0,
      });
      
      // Store recent activity
      if (data.recent_activity) {
        setOrders(data.recent_activity.recent_orders || []);
      }
    } catch (error) {
      console.error('❌ Error loading admin stats:', error);
      throw error;
    }
  };

  const loadRiders = async () => {
    try {
      console.log('👥 Loading riders/users...');
      const data = await adminApi.getUsers();
      console.log('✅ Users loaded:', data);
      
      // Filter for riders if the data has role field
      const allUsers = Array.isArray(data) ? data : (data.users || []);
      setUsers(allUsers);
      
      // If there's a specific endpoint for riders in the future, use it
      // For now, show all users
      setRiders([]);
    } catch (error) {
      console.error('❌ Error loading riders:', error);
      throw error;
    }
  };

  const loadOutlets = async () => {
    // Outlets might not have a specific endpoint yet
    // Keep mock data for now or implement when backend is ready
    setOutlets([]);
  };

  const loadCommissions = async () => {
    try {
      console.log('💰 Loading earnings overview...');
      const data = await adminApi.getEarningsOverview();
      console.log('✅ Earnings data:', data);
      setEarningsOverview(data);
      setCommissions([]);
    } catch (error) {
      console.error('❌ Error loading commissions:', error);
      throw error;
    }
  };

  const loadPayouts = async () => {
    try {
      console.log('💸 Loading payment requests...');
      const data = await adminApi.getPaymentRequests();
      console.log('✅ Payment requests:', data);
      
      // Also load earnings overview for stats
      const earningsData = await adminApi.getEarningsOverview();
      setEarningsOverview(earningsData);
      
      setPayouts(Array.isArray(data) ? data : (data.requests || []));
    } catch (error) {
      console.error('❌ Error loading payouts:', error);
      throw error;
    }
  };

  const handleApproveRider = (riderId: number) => {
    Alert.alert('Approve Rider', 'Are you sure you want to approve this rider?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => updateRiderStatus(riderId, 'active'),
      },
    ]);
  };

  const updateRiderStatus = async (riderId: number, status: string) => {
    try {
      // Update rider status in API
      // await ApiService.updateRiderStatus(riderId, status);
      
      setRiders(riders.map(rider => 
        rider.id === riderId ? { ...rider, status: status as any } : rider
      ));
      
      Alert.alert('Success', 'Rider status updated successfully');
    } catch (error) {
      console.error('Error updating rider status:', error);
      Alert.alert('Error', 'Failed to update rider status');
    }
  };

  const processPayout = async (payoutId: number) => {
    try {
      // Process payout in API
      // await ApiService.processPayout(payoutId);
      
      setPayouts(payouts.map(payout => 
        payout.id === payoutId 
          ? { ...payout, status: 'processing', processed_at: new Date().toISOString() }
          : payout
      ));
      
      Alert.alert('Success', 'Payout is being processed');
    } catch (error) {
      console.error('Error processing payout:', error);
      Alert.alert('Error', 'Failed to process payout');
    }
  };

  const TabButton: React.FC<{ 
    id: string; 
    title: string; 
    icon: string; 
    active: boolean; 
    onPress: () => void 
  }> = ({ id, title, icon, active, onPress }) => (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.activeTabButton]}
      onPress={onPress}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={active ? '#0b5ed7' : '#6b7280'} 
      />
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderOverview = () => {
    if (!stats) return null;

    const safeStats = {
      total_orders: stats.total_orders ?? 0,
      pending_orders: stats.pending_orders ?? 0,
      completed_orders: stats.completed_orders ?? 0,
      total_users: stats.total_users ?? 0,
      active_users: stats.active_users ?? 0,
      new_users_this_month: stats.new_users_this_month ?? 0,
      total_revenue: stats.total_revenue ?? 0,
      monthly_revenue: stats.monthly_revenue ?? 0,
      total_services: stats.total_services ?? 0,
      pending_services: stats.pending_services ?? 0,
    };

    return (
      <ScrollView 
        style={styles.tabContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="receipt-outline" size={24} color="#0b5ed7" />
              <Text style={styles.statValue}>{safeStats.total_orders}</Text>
            </View>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="people-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>{safeStats.total_users}</Text>
            </View>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="cash-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>₵{safeStats.total_revenue.toFixed(2)}</Text>
            </View>
            <Text style={styles.statLabel}>Total Revenue</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="wallet-outline" size={24} color="#8b5cf6" />
              <Text style={styles.statValue}>₵{safeStats.monthly_revenue.toFixed(2)}</Text>
            </View>
            <Text style={styles.statLabel}>Monthly Revenue</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="hourglass-outline" size={24} color="#ef4444" />
              <Text style={styles.statValue}>{safeStats.pending_orders}</Text>
            </View>
            <Text style={styles.statLabel}>Pending Orders</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#10b981" />
              <Text style={styles.statValue}>{safeStats.completed_orders}</Text>
            </View>
            <Text style={styles.statLabel}>Completed Orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="person-add-outline" size={24} color="#06b6d4" />
              <Text style={styles.statValue}>{safeStats.new_users_this_month}</Text>
            </View>
            <Text style={styles.statLabel}>New Users (Month)</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Ionicons name="construct-outline" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{safeStats.total_services}</Text>
            </View>
            <Text style={styles.statLabel}>Total Services</Text>
          </View>
        </View>

        {/* Recent Activity */}
        {orders && orders.length > 0 && (
          <View style={styles.recentActivity}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {orders.slice(0, 5).map((order: any, index: number) => (
              <View key={`order-${order.id || index}`} style={styles.activityItem}>
                <Text style={styles.activityText}>
                  Order {order.id} - ₵{(order.total ?? 0).toFixed(2)}
                </Text>
                <Text style={styles.activitySubtext}>{order.status}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  const renderRiders = () => (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Users ({users.length})</Text>
      </View>
      
      {users.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No users found</Text>
        </View>
      ) : (
        users.map((user: any, index: number) => (
          <View
            key={`user-${user.id || index}`}
            style={styles.listItem}
          >
            <View style={styles.listItemContent}>
              <View>
                <Text style={styles.listItemTitle}>{user.username || user.email}</Text>
                <Text style={styles.listItemSubtitle}>
                  {user.email}
                </Text>
                <Text style={styles.listItemDetails}>
                  Role: {user.role || 'user'} • Phone: {user.phone || 'N/A'}
                </Text>
              </View>
              <View style={styles.listItemActions}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: user.is_active ? '#10b981' : '#ef4444' }
                ]}>
                  <Text style={styles.statusText}>
                    {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderOutlets = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Gas Outlets ({outlets.length})</Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Outlet</Text>
        </TouchableOpacity>
      </View>
      
      {outlets.map((outlet) => (
        <TouchableOpacity
          key={outlet.id}
          style={styles.listItem}
          onPress={() => {
            setSelectedOutlet(outlet);
            setShowOutletModal(true);
          }}
        >
          <View style={styles.listItemContent}>
            <View>
              <Text style={styles.listItemTitle}>{outlet.name}</Text>
              <Text style={styles.listItemSubtitle}>{outlet.address}</Text>
              <Text style={styles.listItemDetails}>
                Commission: {outlet.commission_rate}% • {outlet.operating_hours}
              </Text>
            </View>
            <View style={styles.listItemActions}>
              <View style={[
                styles.statusBadge,
                { backgroundColor: outlet.is_active ? '#10b981' : '#ef4444' }
              ]}>
                <Text style={styles.statusText}>
                  {outlet.is_active ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderCommissions = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Commission Tracking</Text>
      </View>
      
      {commissions.map((commission) => {
        const rider = riders.find(r => r.id === commission.rider_id);
        return (
          <View key={commission.id} style={styles.listItem}>
            <View style={styles.listItemContent}>
              <View>
                <Text style={styles.listItemTitle}>
                  {rider?.name || 'Unknown Rider'}
                </Text>
                <Text style={styles.listItemSubtitle}>
                  Job #{commission.pickup_request_id}
                </Text>
                <Text style={styles.listItemDetails}>
                  {commission.percentage}% commission • {new Date(commission.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.listItemActions}>
                <Text style={styles.commissionAmount}>₵{commission.amount.toFixed(2)}</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: commission.status === 'paid' ? '#10b981' : '#f59e0b' }
                ]}>
                  <Text style={styles.statusText}>{commission.status.toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  const renderPayouts = () => (
    <ScrollView 
      style={styles.tabContent} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Earnings Overview Card */}
      {earningsOverview && (
        <View style={styles.earningsOverviewCard}>
          <Text style={styles.earningsTitle}>Commission Overview</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsLabel}>Today</Text>
              <Text style={styles.earningsValue}>
                ₵{(earningsOverview.today_earnings ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsLabel}>This Week</Text>
              <Text style={styles.earningsValue}>
                ₵{(earningsOverview.week_earnings ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsLabel}>This Month</Text>
              <Text style={styles.earningsValue}>
                ₵{(earningsOverview.month_earnings ?? 0).toFixed(2)}
              </Text>
            </View>
            <View style={styles.earningsStat}>
              <Text style={styles.earningsLabel}>Total Paid</Text>
              <Text style={styles.earningsValue}>
                ₵{(earningsOverview.total_earnings_paid ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>
          
          {earningsOverview.pending_payments && (
            <View style={styles.pendingSummary}>
              <Ionicons name="hourglass-outline" size={20} color="#f59e0b" />
              <Text style={styles.pendingSummaryText}>
                {earningsOverview.pending_payments.count} pending requests • 
                ₵{(earningsOverview.pending_payments.total_amount ?? 0).toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Payment Requests ({payouts.length})</Text>
        <View style={styles.statsRow}>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Pending</Text>
            <Text style={[styles.miniStatValue, { color: '#f59e0b' }]}>
              {payouts.filter(p => p.status === 'pending').length}
            </Text>
          </View>
          <View style={styles.miniStat}>
            <Text style={styles.miniStatLabel}>Total Amount</Text>
            <Text style={[styles.miniStatValue, { color: '#0b5ed7' }]}>
              ₵{payouts.reduce((sum, p) => p.status === 'pending' ? sum + (p.amount || 0) : sum, 0).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      
      {payouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
          <Text style={styles.emptyStateText}>No payment requests</Text>
        </View>
      ) : (
        payouts.map((payout: any, index: number) => (
          <View key={`payout-${payout.id || index}`} style={styles.payoutCard}>
            <View style={styles.payoutHeader}>
              <View style={styles.payoutInfo}>
                <Text style={styles.payoutRiderName}>
                  Rider #{payout.rider_id}
                </Text>
                <Text style={styles.payoutDetails}>
                  {payout.payment_method || 'Mobile Money'}
                </Text>
                <Text style={styles.payoutDate}>
                  Requested: {new Date(payout.requested_at || Date.now()).toLocaleString()}
                </Text>
              </View>
              <View style={styles.payoutAmountSection}>
                <Text style={styles.payoutAmountLabel}>Amount</Text>
                <Text style={styles.payoutAmount}>₵{(payout.amount || 0).toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.payoutStatus}>
              <View style={[
                styles.statusBadge,
                { 
                  backgroundColor: 
                    payout.status === 'approved' ? '#10b981' :
                    payout.status === 'rejected' ? '#ef4444' :
                    payout.status === 'pending' ? '#f59e0b' : '#6b7280'
                }
              ]}>
                <Text style={styles.statusText}>
                  {(payout.status || 'pending').toUpperCase()}
                </Text>
              </View>

              {payout.status === 'pending' && (
                <View style={styles.payoutActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleProcessPayout(payout.id, 'approve')}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleProcessPayout(payout.id, 'reject')}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}

              {payout.status !== 'pending' && payout.processed_at && (
                <Text style={styles.processedInfo}>
                  Processed: {new Date(payout.processed_at).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const handleProcessPayout = async (payoutId: number, action: 'approve' | 'reject') => {
    const actionText = action === 'approve' ? 'approve' : 'reject';
    
    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Payment`,
      `Are you sure you want to ${actionText} this payment request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1),
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await adminApi.processPaymentRequest(payoutId, action);
              
              Alert.alert(
                'Success',
                result.message || `Payment ${action}d successfully`,
                [{ text: 'OK', onPress: () => loadPayouts() }]
              );
            } catch (error: any) {
              console.error(`Error ${action}ing payment:`, error);
              Alert.alert('Error', error.response?.data?.detail || `Failed to ${action} payment`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !stats) {
    return <Loading message="Loading admin dashboard..." />;
  }

  if (error && !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <ErrorDisplay 
          message={error} 
          onRetry={loadData}
          retryText="Retry"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton
            id="overview"
            title="Overview"
            icon="analytics-outline"
            active={activeTab === 'overview'}
            onPress={() => setActiveTab('overview')}
          />
          <TabButton
            id="riders"
            title="Riders"
            icon="people-outline"
            active={activeTab === 'riders'}
            onPress={() => setActiveTab('riders')}
          />
          <TabButton
            id="outlets"
            title="Outlets"
            icon="business-outline"
            active={activeTab === 'outlets'}
            onPress={() => setActiveTab('outlets')}
          />
          <TabButton
            id="commissions"
            title="Commissions"
            icon="cash-outline"
            active={activeTab === 'commissions'}
            onPress={() => setActiveTab('commissions')}
          />
          <TabButton
            id="payouts"
            title="Payouts"
            icon="wallet-outline"
            active={activeTab === 'payouts'}
            onPress={() => setActiveTab('payouts')}
          />
        </ScrollView>
      </View>

      <View style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'riders' && renderRiders()}
        {activeTab === 'outlets' && renderOutlets()}
        {activeTab === 'commissions' && renderCommissions()}
        {activeTab === 'payouts' && renderPayouts()}
      </View>

      {/* Rider Detail Modal */}
      <Modal
        visible={showRiderModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rider Details</Text>
            <TouchableOpacity onPress={() => setShowRiderModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          {selectedRider && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Personal Information</Text>
                <Text style={styles.modalText}>{selectedRider.name}</Text>
                <Text style={styles.modalSubtext}>{selectedRider.email}</Text>
                <Text style={styles.modalSubtext}>{selectedRider.phone}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Vehicle Information</Text>
                <Text style={styles.modalText}>{selectedRider.vehicle_type}</Text>
                <Text style={styles.modalSubtext}>Number: {selectedRider.vehicle_number}</Text>
                <Text style={styles.modalSubtext}>License: {selectedRider.license_number}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Performance</Text>
                <Text style={styles.modalText}>Rating: {selectedRider.rating.toFixed(1)}/5.0</Text>
                <Text style={styles.modalSubtext}>Total Pickups: {selectedRider.total_pickups}</Text>
                <Text style={styles.modalSubtext}>Total Earnings: ₵{selectedRider.total_earnings.toFixed(2)}</Text>
                <Text style={styles.modalSubtext}>Wallet Balance: ₵{selectedRider.wallet_balance.toFixed(2)}</Text>
              </View>
              
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Status Management</Text>
                <View style={styles.statusActions}>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10b981' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'active')}
                  >
                    <Text style={styles.statusButtonText}>Activate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#f59e0b' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'suspended')}
                  >
                    <Text style={styles.statusButtonText}>Suspend</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => updateRiderStatus(selectedRider.id, 'inactive')}
                  >
                    <Text style={styles.statusButtonText}>Deactivate</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
    backgroundColor: '#f8fbff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  tabContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: '#eff6ff',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#0b5ed7',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  listItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  listItemSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  listItemDetails: {
    fontSize: 12,
    color: '#9ca3af',
  },
  listItemActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  payoutAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  processButton: {
    backgroundColor: '#0b5ed7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
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
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 4,
  },
  modalSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  recentActivity: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  activityItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  activitySubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  miniStat: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  miniStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  payoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  payoutInfo: {
    flex: 1,
  },
  payoutRiderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  payoutDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  payoutDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  payoutAmountSection: {
    alignItems: 'flex-end',
  },
  payoutAmountLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  payoutStatus: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 8,
  },
  payoutActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  processedInfo: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  earningsOverviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  earningsStat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b5ed7',
  },
  pendingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  pendingSummaryText: {
    fontSize: 14,
    color: '#92400e',
    fontWeight: '600',
  },
});

export default AdminDashboard;