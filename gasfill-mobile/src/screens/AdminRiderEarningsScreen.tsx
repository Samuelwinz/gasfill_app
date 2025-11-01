import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import adminAuthService from '../services/adminAuthService';

interface RiderEarningsData {
  rider_id: number;
  rider_name: string;
  total_earnings: number;
  deliveries_count: number;
  average_per_delivery: number;
  earnings_history: Array<{
    id: number;
    amount: number;
    date: string;
    type: string;
    order_id: number;
  }>;
  payment_requests: Array<{
    id: number;
    amount: number;
    status: string;
    requested_at: string;
  }>;
}

const AdminRiderEarningsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { riderId, riderName } = route.params as { riderId: number; riderName: string };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState<RiderEarningsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');

  useEffect(() => {
    fetchRiderEarnings();
  }, [riderId]);

  const fetchRiderEarnings = async () => {
    try {
      const data = await adminAuthService.makeAdminRequest<RiderEarningsData>(
        `/api/admin/riders/${riderId}/earnings`
      );
      setEarningsData(data);
    } catch (error: any) {
      console.error('Error fetching rider earnings:', error);
      Alert.alert('Error', error.message || 'Failed to load rider earnings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiderEarnings();
  };

  const getFilteredEarnings = () => {
    if (!earningsData || selectedPeriod === 'all') {
      return earningsData?.earnings_history || [];
    }

    const now = new Date();
    const filtered = earningsData.earnings_history.filter((earning) => {
      const earningDate = new Date(earning.date);
      
      switch (selectedPeriod) {
        case 'day':
          return earningDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return earningDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return earningDate >= monthAgo;
        default:
          return true;
      }
    });

    return filtered;
  };

  const calculatePeriodTotal = () => {
    const filtered = getFilteredEarnings();
    return filtered.reduce((sum, earning) => sum + earning.amount, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading earnings data...</Text>
      </View>
    );
  }

  if (!earningsData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Failed to load earnings data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchRiderEarnings}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredEarnings = getFilteredEarnings();
  const periodTotal = calculatePeriodTotal();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{riderName}</Text>
          <Text style={styles.headerSubtitle}>Earnings Details</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B00']} />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="wallet-outline" size={32} color="#10B981" />
              <Text style={styles.summaryLabel}>Total Earnings</Text>
              <Text style={styles.summaryValue}>₵{earningsData.total_earnings.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Ionicons name="receipt-outline" size={32} color="#3B82F6" />
              <Text style={styles.summaryLabel}>Deliveries</Text>
              <Text style={styles.summaryValue}>{earningsData.deliveries_count}</Text>
            </View>
          </View>
          <View style={styles.averageContainer}>
            <Text style={styles.averageLabel}>Average per delivery</Text>
            <Text style={styles.averageValue}>₵{earningsData.average_per_delivery.toFixed(2)}</Text>
          </View>
        </View>

        {/* Pending Payments */}
        {earningsData.payment_requests && earningsData.payment_requests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>Pending Payment Requests</Text>
            </View>
            {earningsData.payment_requests.map((request) => (
              <View key={request.id} style={styles.paymentRequestRow}>
                <View style={styles.paymentRequestLeft}>
                  <Text style={styles.paymentRequestAmount}>₵{request.amount.toFixed(2)}</Text>
                  <Text style={styles.paymentRequestDate}>
                    {formatDate(request.requested_at)}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  request.status === 'pending' && styles.statusPending,
                  request.status === 'approved' && styles.statusApproved,
                  request.status === 'rejected' && styles.statusRejected,
                ]}>
                  <Text style={styles.statusText}>{request.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Period Filter */}
        <View style={styles.filterContainer}>
          <Text style={styles.filterLabel}>Filter by period:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterButtons}>
              {(['all', 'day', 'week', 'month'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.filterButton,
                    selectedPeriod === period && styles.filterButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      selectedPeriod === period && styles.filterButtonTextActive,
                    ]}
                  >
                    {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Period Total */}
        <View style={styles.periodTotalCard}>
          <Text style={styles.periodTotalLabel}>
            {selectedPeriod === 'all' ? 'Total Earnings' : `${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Earnings`}
          </Text>
          <Text style={styles.periodTotalValue}>₵{periodTotal.toFixed(2)}</Text>
          <Text style={styles.periodTotalCount}>
            {filteredEarnings.length} {filteredEarnings.length === 1 ? 'delivery' : 'deliveries'}
          </Text>
        </View>

        {/* Earnings History */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={20} color="#6B7280" />
            <Text style={styles.cardTitle}>Earnings History</Text>
          </View>

          {filteredEarnings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>
                No earnings for this period
              </Text>
            </View>
          ) : (
            filteredEarnings.map((earning) => (
              <View key={earning.id} style={styles.earningRow}>
                <View style={styles.earningIcon}>
                  <Ionicons
                    name={
                      earning.type === 'delivery' ? 'bicycle' :
                      earning.type === 'pickup' ? 'cube-outline' :
                      'water-outline'
                    }
                    size={24}
                    color="#FF6B00"
                  />
                </View>
                <View style={styles.earningDetails}>
                  <Text style={styles.earningType}>
                    {earning.type.charAt(0).toUpperCase() + earning.type.slice(1)}
                  </Text>
                  <Text style={styles.earningDate}>{formatDate(earning.date)}</Text>
                  <Text style={styles.earningOrderId}>Order #{earning.order_id}</Text>
                </View>
                <View style={styles.earningAmount}>
                  <Text style={styles.earningAmountText}>₵{earning.amount.toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B00',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  averageContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
    alignItems: 'center',
  },
  averageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  averageValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  paymentRequestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentRequestLeft: {
    flex: 1,
  },
  paymentRequestAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentRequestDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusApproved: {
    backgroundColor: '#D1FAE5',
  },
  statusRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  filterButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  periodTotalCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTotalLabel: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.9,
    marginBottom: 8,
  },
  periodTotalValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  periodTotalCount: {
    fontSize: 12,
    color: '#FFF',
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  earningIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  earningDetails: {
    flex: 1,
  },
  earningType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  earningDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  earningOrderId: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  earningAmount: {
    alignItems: 'flex-end',
  },
  earningAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
});

export default AdminRiderEarningsScreen;
