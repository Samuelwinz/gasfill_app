import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRiderDashboard, updateRiderStatus, DashboardData } from '../services/riderApi';
import { useRiderUpdates } from '../context/WebSocketContext';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

const RiderDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Subscribe to real-time updates
  useRiderUpdates({
    onNewOrder: (data) => {
      console.log('🔔 New order assigned:', data);
      // Refresh dashboard to show updated stats
      loadDashboard();
    },
    onOrderStatusUpdate: (data) => {
      console.log('📦 Order status updated:', data);
      // Refresh dashboard to show updated stats
      loadDashboard();
    },
    onEarningsUpdate: (data) => {
      console.log('💰 Earnings updated:', data);
      // Update earnings in real-time if data contains the new amount
      if (data.today_earnings !== undefined && dashboardData) {
        setDashboardData({
          ...dashboardData,
          today_earnings: data.today_earnings,
          total_earnings: data.total_earnings || dashboardData.total_earnings,
        });
      } else {
        // Otherwise, refresh entire dashboard
        loadDashboard();
      }
    },
  });

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Debug: Check token before API call
      const token = await AsyncStorage.getItem('token');
      const userRole = await AsyncStorage.getItem('userRole');
      console.log('🔍 Dashboard loading - Token:', token ? 'Present' : 'Missing', 'Role:', userRole);

      const data = await getRiderDashboard();
      setDashboardData(data);
      setIsAvailable(data.status === 'available');
      console.log('✅ Dashboard loaded:', data);
    } catch (err: any) {
      console.error('❌ Error loading dashboard:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleStatusToggle = async (value: boolean) => {
    try {
      setStatusUpdating(true);
      const newStatus = value ? 'available' : 'offline';
      
      await updateRiderStatus(newStatus);
      setIsAvailable(value);
      
      console.log('✅ Status updated to:', newStatus);
    } catch (err: any) {
      console.error('❌ Error updating status:', err);
      setError(err.message || 'Failed to update status');
      // Revert toggle on error
      setIsAvailable(!value);
    } finally {
      setStatusUpdating(false);
    }
  };

  if (loading) {
    return <Loading message="Loading dashboard..." />;
  }

  if (error && !dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay message={error} onRetry={loadDashboard} retryText="Retry" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Rider Overview</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <View style={styles.refreshIcon}>
              <Ionicons name="refresh" size={20} color="#10b981" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <View style={styles.statusContainer}>
          <View style={styles.statusInfo}>
            <Ionicons 
              name={isAvailable ? 'checkmark-circle' : 'close-circle'} 
              size={24} 
              color={isAvailable ? '#10b981' : '#ef4444'} 
            />
            <Text style={styles.statusLabel}>
              {isAvailable ? 'Available for orders' : 'Offline'}
            </Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleStatusToggle}
            disabled={statusUpdating}
            trackColor={{ false: '#d1d5db', true: '#86efac' }}
            thumbColor={isAvailable ? '#10b981' : '#f3f4f6'}
          />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10b981']} tintColor="#10b981" />
        }
      >
        {/* Today's Earnings */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <Ionicons name="cash-outline" size={28} color="#10b981" />
            <Text style={styles.earningsLabel}>Today's Earnings</Text>
          </View>
          <Text style={styles.earningsAmount}>
            ₵{dashboardData?.today_earnings?.toFixed(2) || '0.00'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="bicycle" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.active_orders || 0}</Text>
            <Text style={styles.statLabel}>Active Orders</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.rating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="wallet-outline" size={24} color="#10b981" />
            </View>
            <Text style={styles.statValue}>₵{dashboardData?.total_earnings?.toFixed(0) || '0'}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="checkmark-done" size={24} color="#6366f1" />
            </View>
            <Text style={styles.statValue}>{dashboardData?.total_deliveries || 0}</Text>
            <Text style={styles.statLabel}>Total Deliveries</Text>
          </View>
        </View>

        {/* Performance Section */}
        <View style={styles.performanceCard}>
          <Text style={styles.sectionTitle}>Today's Performance</Text>
          
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#10b981" />
              <Text style={styles.performanceLabel}>Completed</Text>
              <Text style={styles.performanceValue}>{dashboardData?.completed_today || 0}</Text>
            </View>
            
            <View style={styles.performanceDivider} />
            
            <View style={styles.performanceItem}>
              <Ionicons name="time-outline" size={20} color="#f59e0b" />
              <Text style={styles.performanceLabel}>Pending</Text>
              <Text style={styles.performanceValue}>{dashboardData?.active_orders || 0}</Text>
            </View>
            
            <View style={styles.performanceDivider} />
            
            <View style={styles.performanceItem}>
              <Ionicons name="trending-up-outline" size={20} color="#3b82f6" />
              <Text style={styles.performanceLabel}>Earnings</Text>
              <Text style={styles.performanceValue}>₵{dashboardData?.today_earnings?.toFixed(0) || '0'}</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="list-outline" size={24} color="#10b981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Available Orders</Text>
              <Text style={styles.actionSubtitle}>Find new delivery jobs</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionIcon}>
              <Ionicons name="cash-outline" size={24} color="#10b981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Earnings</Text>
              <Text style={styles.actionSubtitle}>Check payment history</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 20,
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
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 12,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  earningsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  earningsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  earningsAmount: {
    fontSize: 42,
    fontWeight: '700',
    color: '#10b981',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  actionsSection: {
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default RiderDashboard;
