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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import adminAuthService from '../services/adminAuthService';

interface EarningsOverview {
  total_earnings_paid: number;
  today_earnings: number;
  week_earnings: number;
  month_earnings: number;
  earnings_by_type: Record<string, { count: number; total: number }>;
  pending_payments: {
    count: number;
    total_amount: number;
  };
  active_riders: number;
  commission_structure: {
    rider_commission_rate: number;
    delivery_fee: number;
    service_pickup_fee: number;
    service_refill_fee: number;
  };
}

interface RiderEarnings {
  rider_id: number;
  rider_name: string;
  total_earnings: number;
  deliveries_count: number;
  average_per_delivery: number;
}

const AdminCommissionScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<EarningsOverview | null>(null);
  const [riderStats, setRiderStats] = useState<RiderEarnings[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [showRateModal, setShowRateModal] = useState(false);
  const [newCommissionRate, setNewCommissionRate] = useState('');

  useEffect(() => {
    fetchCommissionData();
  }, [selectedPeriod]);

  const fetchCommissionData = async () => {
    try {
      const [overviewData, statsData] = await Promise.all([
        adminAuthService.makeAdminRequest<EarningsOverview>('/api/admin/earnings/overview'),
        adminAuthService.makeAdminRequest<RiderEarnings[]>(
          `/api/admin/earnings/statistics?period=${selectedPeriod}`
        ),
      ]);
      
      setOverview(overviewData);
      setRiderStats(statsData);
      setNewCommissionRate((overviewData.commission_structure.rider_commission_rate * 100).toString());
    } catch (error: any) {
      console.error('Error fetching commission data:', error);
      Alert.alert('Error', error.message || 'Failed to load commission data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommissionData();
  };

  const handleUpdateCommissionRate = async () => {
    const rate = parseFloat(newCommissionRate) / 100;
    
    if (isNaN(rate) || rate < 0 || rate > 1) {
      Alert.alert('Invalid Rate', 'Please enter a valid percentage between 0 and 100');
      return;
    }

    try {
      await adminAuthService.makeAdminRequest('/api/admin/commission-structure', {
        method: 'PUT',
        data: {
          ...overview?.commission_structure,
          rider_commission_rate: rate,
        },
      });

      Alert.alert('Success', 'Commission rate updated successfully');
      setShowRateModal(false);
      fetchCommissionData();
    } catch (error: any) {
      console.error('Error updating commission rate:', error);
      Alert.alert('Error', error.message || 'Failed to update commission rate');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading commission data...</Text>
      </View>
    );
  }

  if (!overview) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Failed to load commission data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchCommissionData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const commissionRate = overview.commission_structure.rider_commission_rate * 100;
  const platformRevenue = overview.total_earnings_paid * (1 - overview.commission_structure.rider_commission_rate);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Commission Tracking</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowRateModal(true)}
        >
          <Ionicons name="settings-outline" size={24} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF6B00']} />
        }
      >
        {/* Commission Rate Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="pie-chart-outline" size={24} color="#FF6B00" />
            <Text style={styles.cardTitle}>Commission Structure</Text>
          </View>
          <View style={styles.commissionRateContainer}>
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Rider Commission</Text>
              <Text style={styles.rateValue}>{commissionRate.toFixed(0)}%</Text>
            </View>
            <View style={styles.rateDivider} />
            <View style={styles.rateItem}>
              <Text style={styles.rateLabel}>Platform Fee</Text>
              <Text style={styles.rateValue}>{(100 - commissionRate).toFixed(0)}%</Text>
            </View>
          </View>
          <View style={styles.feeDetails}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Delivery Fee:</Text>
              <Text style={styles.feeValue}>₵{overview.commission_structure.delivery_fee.toFixed(2)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Pickup Fee:</Text>
              <Text style={styles.feeValue}>₵{overview.commission_structure.service_pickup_fee.toFixed(2)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Refill Fee:</Text>
              <Text style={styles.feeValue}>₵{overview.commission_structure.service_refill_fee.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Earnings Overview */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={24} color="#10B981" />
            <Text style={styles.cardTitle}>Earnings Overview</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Today</Text>
              <Text style={[styles.statValue, { color: '#10B981' }]}>
                ₵{overview.today_earnings.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>This Week</Text>
              <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                ₵{overview.week_earnings.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>This Month</Text>
              <Text style={[styles.statValue, { color: '#8B5CF6' }]}>
                ₵{overview.month_earnings.toFixed(2)}
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Paid</Text>
              <Text style={[styles.statValue, { color: '#FF6B00' }]}>
                ₵{overview.total_earnings_paid.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Revenue Split */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="trending-up-outline" size={24} color="#3B82F6" />
            <Text style={styles.cardTitle}>Revenue Distribution</Text>
          </View>
          <View style={styles.revenueContainer}>
            <View style={styles.revenueItem}>
              <View style={[styles.revenueBadge, { backgroundColor: '#10B981' }]}>
                <Ionicons name="bicycle-outline" size={20} color="#FFF" />
              </View>
              <View style={styles.revenueDetails}>
                <Text style={styles.revenueLabel}>Rider Earnings</Text>
                <Text style={styles.revenueValue}>₵{overview.total_earnings_paid.toFixed(2)}</Text>
                <Text style={styles.revenuePercent}>{commissionRate.toFixed(0)}% of total</Text>
              </View>
            </View>
            <View style={styles.revenueItem}>
              <View style={[styles.revenueBadge, { backgroundColor: '#FF6B00' }]}>
                <Ionicons name="business-outline" size={20} color="#FFF" />
              </View>
              <View style={styles.revenueDetails}>
                <Text style={styles.revenueLabel}>Platform Revenue</Text>
                <Text style={styles.revenueValue}>₵{platformRevenue.toFixed(2)}</Text>
                <Text style={styles.revenuePercent}>{(100 - commissionRate).toFixed(0)}% of total</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pending Payments */}
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('AdminPaymentRequests' as never)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <Text style={styles.cardTitle}>Pending Payments</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </View>
          <View style={styles.pendingContainer}>
            <View style={styles.pendingBox}>
              <Text style={styles.pendingCount}>{overview.pending_payments.count}</Text>
              <Text style={styles.pendingLabel}>Requests</Text>
            </View>
            <View style={styles.pendingDivider} />
            <View style={styles.pendingBox}>
              <Text style={styles.pendingAmount}>₵{overview.pending_payments.total_amount.toFixed(2)}</Text>
              <Text style={styles.pendingLabel}>Total Amount</Text>
            </View>
          </View>
          {overview.pending_payments.count > 0 && (
            <Text style={styles.pendingAction}>Tap to review requests</Text>
          )}
        </TouchableOpacity>

        {/* Earnings by Type */}
        {Object.keys(overview.earnings_by_type).length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="analytics-outline" size={24} color="#8B5CF6" />
              <Text style={styles.cardTitle}>Earnings by Type</Text>
            </View>
            {Object.entries(overview.earnings_by_type).map(([type, data]) => (
              <View key={type} style={styles.earningTypeRow}>
                <View style={styles.earningTypeLeft}>
                  <Ionicons name="radio-button-on" size={12} color="#FF6B00" />
                  <Text style={styles.earningTypeName}>{type.replace(/_/g, ' ')}</Text>
                </View>
                <View style={styles.earningTypeRight}>
                  <Text style={styles.earningTypeCount}>{data.count} orders</Text>
                  <Text style={styles.earningTypeAmount}>₵{data.total.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Period Filter for Rider Stats */}
        <View style={styles.periodFilterCard}>
          <Text style={styles.periodFilterLabel}>Rider Statistics Period:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodButtons}>
              {(['day', 'week', 'month', 'year'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period && styles.periodButtonTextActive,
                    ]}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Top Riders */}
        {riderStats.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="trophy-outline" size={24} color="#F59E0B" />
              <Text style={styles.cardTitle}>
                Top Riders - {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              </Text>
            </View>
            {riderStats.slice(0, 10).map((rider, index) => (
              <TouchableOpacity
                key={rider.rider_id}
                style={styles.riderRow}
                onPress={() =>
                  navigation.navigate('AdminRiderEarnings' as never, {
                    riderId: rider.rider_id,
                    riderName: rider.rider_name,
                  } as never)
                }
              >
                <View style={styles.riderRank}>
                  <Text style={styles.riderRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.riderInfo}>
                  <Text style={styles.riderName}>{rider.rider_name}</Text>
                  <Text style={styles.riderDeliveries}>
                    {rider.deliveries_count} {rider.deliveries_count === 1 ? 'delivery' : 'deliveries'} • Avg: ₵{rider.average_per_delivery.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.riderEarnings}>
                  <Text style={styles.riderEarningsText}>₵{rider.total_earnings.toFixed(2)}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
            {riderStats.length === 0 && (
              <View style={styles.emptyRidersState}>
                <Ionicons name="bicycle-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyRidersText}>
                  No rider earnings for this period
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people-outline" size={24} color="#6B7280" />
            <Text style={styles.cardTitle}>Active Riders</Text>
          </View>
          <Text style={styles.activeRidersCount}>{overview.active_riders}</Text>
          <Text style={styles.activeRidersLabel}>riders currently active</Text>
        </View>
      </ScrollView>

      {/* Commission Rate Modal */}
      <Modal
        visible={showRateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Commission Rate</Text>
              <TouchableOpacity onPress={() => setShowRateModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Set the percentage of delivery fees that riders receive. The remaining goes to the platform.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Rider Commission Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={newCommissionRate}
                onChangeText={setNewCommissionRate}
                keyboardType="numeric"
                placeholder="80"
              />
            </View>

            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewText}>Rider gets: {newCommissionRate}%</Text>
                <Text style={styles.previewText}>Platform gets: {100 - parseFloat(newCommissionRate || '0')}%</Text>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateCommissionRate}
              >
                <Text style={styles.saveButtonText}>Update Rate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  commissionRateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  rateItem: {
    alignItems: 'center',
    flex: 1,
  },
  rateLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  rateValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  rateDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  feeDetails: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statBox: {
    width: '50%',
    padding: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  revenueContainer: {
    gap: 16,
  },
  revenueItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  revenueBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueDetails: {
    flex: 1,
    marginLeft: 16,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  revenueValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  revenuePercent: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingBox: {
    flex: 1,
    alignItems: 'center',
  },
  pendingCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  pendingAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  pendingLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  pendingDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },
  pendingAction: {
    marginTop: 12,
    fontSize: 12,
    color: '#F59E0B',
    textAlign: 'center',
    fontWeight: '500',
  },
  earningTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  earningTypeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  earningTypeName: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
    textTransform: 'capitalize',
  },
  earningTypeRight: {
    alignItems: 'flex-end',
  },
  earningTypeCount: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  earningTypeAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  activeRidersCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeRidersLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  previewContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewText: {
    fontSize: 14,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  periodFilterCard: {
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
  periodFilterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  periodButtonActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFF',
  },
  riderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  riderRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riderRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  riderDeliveries: {
    fontSize: 12,
    color: '#6B7280',
  },
  riderEarnings: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  riderEarningsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  emptyRidersState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyRidersText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default AdminCommissionScreen;
