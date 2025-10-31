import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { 
  getRiderEarningsDetailed, 
  requestPayment, 
  getPaymentRequests,
  getPayoutHistory,
  updatePaymentRequest,
  cancelPaymentRequest,
  EarningsData as ApiEarningsData 
} from '../services/riderApi';
import { useRiderUpdates } from '../context/WebSocketContext';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';

const RiderEarningsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'payout'>('overview');
  const [earningsData, setEarningsData] = useState<ApiEarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [pendingPaymentRequest, setPendingPaymentRequest] = useState<any>(null);
  const [editingAmount, setEditingAmount] = useState(false);
  const [newPayoutAmount, setNewPayoutAmount] = useState('');
  const [payoutHistory, setPayoutHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Subscribe to real-time earnings updates
  useRiderUpdates({
    onEarningsUpdate: (data) => {
      console.log('💰 Earnings updated in real-time:', data);
      // Update earnings in real-time
      if (earningsData) {
        setEarningsData({
          ...earningsData,
          ...data,
        });
      } else {
        // Load fresh data if we don't have any
        loadEarningsData();
      }
    },
  });

  useEffect(() => {
    loadEarningsData();
    if (activeTab === 'payout') {
      loadPaymentRequests();
    }
    if (activeTab === 'history') {
      loadPayoutHistory();
    }
  }, [activeTab]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Always use detailed endpoint as it has all required fields
      const detailedData = await getRiderEarningsDetailed();
      setEarningsData(detailedData);
      console.log('✅ Detailed earnings loaded for', activeTab, 'tab:', detailedData);
    } catch (err: any) {
      console.error('❌ Error loading earnings:', err);
      setError(err.message || 'Failed to load earnings');
    } finally {
      setLoading(false);
    }
  };

  const loadPaymentRequests = async () => {
    try {
      const response = await getPaymentRequests('pending');
      if (response.requests && response.requests.length > 0) {
        setPendingPaymentRequest(response.requests[0]);
        setNewPayoutAmount(response.requests[0].amount.toString());
      } else {
        setPendingPaymentRequest(null);
      }
    } catch (err: any) {
      console.error('❌ Error loading payment requests:', err);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await getPayoutHistory();
      setPayoutHistory(response.history || []);
      console.log('✅ Payout history loaded:', response);
    } catch (err: any) {
      console.error('❌ Error loading payout history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarningsData();
    if (activeTab === 'payout') {
      await loadPaymentRequests();
    }
    if (activeTab === 'history') {
      await loadPayoutHistory();
    }
    setRefreshing(false);
  };

  const handleRequestPayout = async (amount: number) => {
    try {
      setPayoutLoading(true);
      
      const response = await requestPayment(amount);
      console.log('✅ Payout requested:', response);
      
      Alert.alert(
        'Payout Requested',
        `Your payout request of ₵${amount.toFixed(2)} has been submitted successfully. Request ID: ${response.request_id}`,
        [{ text: 'OK', onPress: () => {
          loadEarningsData();
          loadPaymentRequests();
        }}]
      );
    } catch (err: any) {
      console.error('❌ Error requesting payout:', err);
      
      // Check if it's a duplicate request error
      if (err.response?.data?.detail?.error === 'duplicate_request') {
        const existingRequest = err.response.data.detail.existing_request;
        Alert.alert(
          'Pending Request Exists',
          `You already have a pending payout request of ₵${existingRequest.amount.toFixed(2)}.\n\nWould you like to modify or cancel it?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Modify Amount', 
              onPress: () => {
                setPendingPaymentRequest(existingRequest);
                setEditingAmount(true);
                setNewPayoutAmount(existingRequest.amount.toString());
              }
            },
            { 
              text: 'Cancel Request', 
              style: 'destructive',
              onPress: () => handleCancelRequest(existingRequest.id)
            },
          ]
        );
      } else {
        Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to request payout');
      }
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleUpdatePayoutAmount = async () => {
    if (!pendingPaymentRequest) return;
    
    const amount = parseFloat(newPayoutAmount);
    if (isNaN(amount) || amount < 100) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount (minimum ₵100.00)');
      return;
    }

    const availableBalance = earningsData?.pending_earnings || 0;
    if (amount > availableBalance) {
      Alert.alert('Insufficient Balance', `Available balance: ₵${availableBalance.toFixed(2)}`);
      return;
    }

    try {
      setPayoutLoading(true);
      const response = await updatePaymentRequest(pendingPaymentRequest.id, amount);
      console.log('✅ Payout amount updated:', response);
      
      Alert.alert(
        'Request Updated',
        `Your payout request has been updated to ₵${amount.toFixed(2)}`,
        [{ text: 'OK', onPress: () => {
          setEditingAmount(false);
          loadPaymentRequests();
        }}]
      );
    } catch (err: any) {
      console.error('❌ Error updating payout:', err);
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to update payout');
    } finally {
      setPayoutLoading(false);
    }
  };

  const handleCancelRequest = async (requestId: number) => {
    try {
      setPayoutLoading(true);
      await cancelPaymentRequest(requestId);
      console.log('✅ Payout request cancelled');
      
      Alert.alert(
        'Request Cancelled',
        'Your payout request has been cancelled successfully.',
        [{ text: 'OK', onPress: () => {
          setPendingPaymentRequest(null);
          loadPaymentRequests();
        }}]
      );
    } catch (err: any) {
      console.error('❌ Error cancelling request:', err);
      Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to cancel request');
    } finally {
      setPayoutLoading(false);
    }
  };

  const requestPayout = () => {
    if (!earningsData) return;
    
    const availableBalance = earningsData.pending_earnings || 0;
    
    if (availableBalance < 100) {
      Alert.alert(
        'Minimum Payout Amount',
        'You need at least ₵100.00 to request a payout.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show input dialog for custom amount
    Alert.prompt(
      'Request Payout',
      `Available balance: ₵${availableBalance.toFixed(2)}\n\nEnter payout amount (minimum ₵100.00):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Full Amount',
          onPress: () => handleRequestPayout(availableBalance),
        },
        {
          text: 'Request Custom',
          onPress: (amountText?: string) => {
            const amount = parseFloat(amountText || '0');
            
            if (isNaN(amount) || amount < 100) {
              Alert.alert('Invalid Amount', 'Minimum payout amount is ₵100.00');
              return;
            }
            
            if (amount > availableBalance) {
              Alert.alert('Insufficient Balance', `Available balance: ₵${availableBalance.toFixed(2)}`);
              return;
            }
            
            handleRequestPayout(amount);
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  };

  const renderOverview = () => {
    if (!earningsData) return null;

    // Safe fallbacks for all values
    const pendingEarnings = earningsData.pending_earnings ?? 0;
    const todayEarnings = earningsData.today_earnings ?? 0;
    const weekEarnings = earningsData.week_earnings ?? 0;
    const monthEarnings = earningsData.month_earnings ?? 0;
    const totalEarnings = earningsData.total_earnings ?? 0;
    const paidEarnings = earningsData.paid_earnings ?? 0;

    return (
      <View>
        {/* Wallet Balance Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.walletTitle}>Pending Earnings</Text>
            <TouchableOpacity 
              style={[styles.payoutButton, payoutLoading && styles.disabledButton]} 
              onPress={requestPayout}
              disabled={payoutLoading}
            >
              <Ionicons name="arrow-up" size={16} color="#ffffff" />
              <Text style={styles.payoutButtonText}>
                {payoutLoading ? 'Processing...' : 'Payout'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.walletBalance}>
            ₵{pendingEarnings.toFixed(2)}
          </Text>
          <Text style={styles.walletSubtext}>Ready for withdrawal</Text>
        </View>

        {/* Earnings Overview */}
        <View style={styles.earningsGrid}>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsValue}>
              ₵{todayEarnings.toFixed(2)}
            </Text>
            <Text style={styles.earningsLabel}>Today</Text>
            <View style={styles.earningsChange}>
              <Ionicons name="trending-up" size={12} color="#10b981" />
              <Text style={styles.earningsChangeText}>Today's income</Text>
            </View>
          </View>

          <View style={styles.earningsCard}>
            <Text style={styles.earningsValue}>
              ₵{weekEarnings.toFixed(2)}
            </Text>
            <Text style={styles.earningsLabel}>This Week</Text>
            <View style={styles.earningsChange}>
              <Ionicons name="calendar-outline" size={12} color="#3b82f6" />
              <Text style={styles.earningsChangeText}>Last 7 days</Text>
            </View>
          </View>

          <View style={styles.earningsCard}>
            <Text style={styles.earningsValue}>
              ₵{monthEarnings.toFixed(2)}
            </Text>
            <Text style={styles.earningsLabel}>This Month</Text>
            <View style={styles.earningsChange}>
              <Ionicons name="calendar" size={12} color="#f59e0b" />
              <Text style={styles.earningsChangeText}>Last 30 days</Text>
            </View>
          </View>

          <View style={styles.earningsCard}>
            <Text style={styles.earningsValue}>
              ₵{totalEarnings.toFixed(2)}
            </Text>
            <Text style={styles.earningsLabel}>Total Earned</Text>
            <View style={styles.earningsChange}>
              <Ionicons name="checkmark-circle" size={12} color="#10b981" />
              <Text style={styles.earningsChangeText}>All time</Text>
            </View>
          </View>
        </View>

        {/* Paid vs Pending */}
        <View style={styles.quickStats}>
          <Text style={styles.sectionTitle}>Earnings Breakdown</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                ₵{paidEarnings.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Paid Out</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#f59e0b' }]}>
                ₵{pendingEarnings.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#3b82f6' }]}>
                ₵{totalEarnings.toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderHistory = () => {
    if (historyLoading) {
      return <Loading message="Loading payout history..." />;
    }

    if (!payoutHistory || payoutHistory.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={80} color="#d1d5db" />
          <Text style={styles.emptyStateTitle}>No payout history</Text>
          <Text style={styles.emptyStateText}>
            Your completed payouts will appear here
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.historyList}>
        {/* Total Paid Summary */}
        <View style={styles.totalPaidCard}>
          <View style={styles.totalPaidHeader}>
            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
            <View style={styles.totalPaidInfo}>
              <Text style={styles.totalPaidLabel}>Total Paid Out</Text>
              <Text style={styles.totalPaidAmount}>
                ₵{payoutHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payout History List */}
        {payoutHistory.map((payout, index) => {
          const isCompleted = payout.status === 'approved' || payout.status === 'completed';
          
          return (
            <View key={`payout-${payout.id}-${index}`} style={styles.payoutCard}>
              {/* Header */}
              <View style={styles.payoutHeader}>
                <View style={styles.payoutHeaderLeft}>
                  <Ionicons
                    name={isCompleted ? 'checkmark-circle' : 'time'}
                    size={24}
                    color={isCompleted ? '#10b981' : '#f59e0b'}
                  />
                  <View style={styles.payoutHistoryInfo}>
                    <Text style={styles.payoutTitle}>
                      Payout #{payout.id}
                    </Text>
                    <Text style={styles.payoutDate}>
                      {new Date(payout.processed_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.payoutAmountSection}>
                  <Text style={[
                    styles.payoutAmount,
                    { color: isCompleted ? '#10b981' : '#f59e0b' }
                  ]}>
                    ₵{payout.amount.toFixed(2)}
                  </Text>
                  <View style={[
                    styles.payoutStatusBadge,
                    { backgroundColor: isCompleted ? '#d1fae5' : '#fef3c7' }
                  ]}>
                    <Text style={[
                      styles.payoutStatusText,
                      { color: isCompleted ? '#065f46' : '#92400e' }
                    ]}>
                      {payout.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Details */}
              <View style={styles.payoutDetails}>
                <View style={styles.payoutDetailRow}>
                  <View style={styles.payoutDetailLeft}>
                    <Ionicons name="card-outline" size={16} color="#6b7280" />
                    <Text style={styles.payoutDetailLabel}>Payment Method</Text>
                  </View>
                  <Text style={styles.payoutDetailValue}>
                    {payout.payment_method === 'mobile_money' ? 'Mobile Money' : 
                     payout.payment_method === 'bank_transfer' ? 'Bank Transfer' : 
                     payout.payment_method}
                  </Text>
                </View>

                {payout.payment_reference && payout.payment_reference !== 'N/A' && (
                  <View style={styles.payoutDetailRow}>
                    <View style={styles.payoutDetailLeft}>
                      <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                      <Text style={styles.payoutDetailLabel}>Reference</Text>
                    </View>
                    <Text style={styles.payoutDetailValue}>
                      {payout.payment_reference}
                    </Text>
                  </View>
                )}

                <View style={styles.payoutDetailRow}>
                  <View style={styles.payoutDetailLeft}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.payoutDetailLabel}>Requested</Text>
                  </View>
                  <Text style={styles.payoutDetailValue}>
                    {new Date(payout.requested_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderPayout = () => {
    const pendingBalance = earningsData?.pending_earnings ?? 0;
    
    return (
      <View style={styles.payoutSection}>
        {/* Show pending request if exists */}
        {pendingPaymentRequest && (
          <View style={styles.pendingRequestCard}>
            <View style={styles.pendingRequestHeader}>
              <Ionicons name="time-outline" size={24} color="#f59e0b" />
              <Text style={styles.pendingRequestTitle}>Pending Payout Request</Text>
            </View>
            
            <View style={styles.pendingRequestBody}>
              {editingAmount ? (
                <View style={styles.editAmountContainer}>
                  <Text style={styles.editAmountLabel}>New Amount:</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={newPayoutAmount}
                    onChangeText={setNewPayoutAmount}
                    keyboardType="decimal-pad"
                    placeholder="50.00"
                  />
                  <View style={styles.editButtonsRow}>
                    <TouchableOpacity
                      style={[styles.editButton, styles.cancelEditButton]}
                      onPress={() => {
                        setEditingAmount(false);
                        setNewPayoutAmount(pendingPaymentRequest.amount.toString());
                      }}
                    >
                      <Text style={styles.cancelEditButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editButton, styles.saveEditButton]}
                      onPress={handleUpdatePayoutAmount}
                      disabled={payoutLoading}
                    >
                      <Text style={styles.saveEditButtonText}>
                        {payoutLoading ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.pendingRequestInfo}>
                    <Text style={styles.pendingRequestLabel}>Amount:</Text>
                    <Text style={styles.pendingRequestAmount}>
                      ₵{pendingPaymentRequest.amount.toFixed(2)}
                    </Text>
                  </View>
                  
                  <View style={styles.pendingRequestInfo}>
                    <Text style={styles.pendingRequestLabel}>Requested:</Text>
                    <Text style={styles.pendingRequestDate}>
                      {new Date(pendingPaymentRequest.requested_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  
                  <View style={styles.pendingRequestActions}>
                    <TouchableOpacity
                      style={[styles.requestActionButton, styles.modifyButton]}
                      onPress={() => setEditingAmount(true)}
                      disabled={payoutLoading}
                    >
                      <Ionicons name="create-outline" size={16} color="#ffffff" />
                      <Text style={styles.requestActionButtonText}>Modify Amount</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.requestActionButton, styles.cancelButton]}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Request',
                          'Are you sure you want to cancel this payout request?',
                          [
                            { text: 'No', style: 'cancel' },
                            { 
                              text: 'Yes, Cancel', 
                              style: 'destructive',
                              onPress: () => handleCancelRequest(pendingPaymentRequest.id)
                            },
                          ]
                        );
                      }}
                      disabled={payoutLoading}
                    >
                      <Ionicons name="close-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.requestActionButtonText}>Cancel Request</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        )}
        
        <View style={styles.payoutInfo}>
          <Text style={styles.payoutInfoTitle}>Available for Payout</Text>
          <Text style={styles.payoutBalance}>
            ₵{pendingBalance.toFixed(2)}
          </Text>
          
          {!pendingPaymentRequest && (
            <TouchableOpacity 
              style={[styles.primaryButton, payoutLoading && styles.disabledButton]}
              onPress={requestPayout}
              disabled={payoutLoading || !earningsData || pendingBalance < 50}
            >
              <Ionicons name="cash-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {payoutLoading ? 'Processing...' : 'Request Payout'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      <View style={styles.payoutOptions}>
        <Text style={styles.sectionTitle}>Payout Information</Text>
        
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Minimum Amount</Text>
            <Text style={styles.infoText}>₵50.00 minimum payout</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="time-outline" size={24} color="#f59e0b" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Processing Time</Text>
            <Text style={styles.infoText}>2-3 business days</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="card-outline" size={24} color="#10b981" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Payment Method</Text>
            <Text style={styles.infoText}>Bank transfer or Mobile Money</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="cash-outline" size={24} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Fees</Text>
            <Text style={styles.infoText}>No fees for payouts over ₵100</Text>
          </View>
        </View>
      </View>
    </View>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return <Loading message="Loading earnings..." />;
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <ErrorDisplay message={error} onRetry={loadEarningsData} retryText="Retry" />
        </View>
      );
    }

    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'history':
        return renderHistory();
      case 'payout':
        return renderPayout();
      default:
        return renderOverview();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleSection}>
            <Text style={styles.headerTitle}>Earnings</Text>
            <Text style={styles.headerSubtitle}>Track your income</Text>
          </View>
          
          {earningsData && (
            <View style={styles.walletSection}>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet" size={20} color="#10b981" />
              </View>
              <View style={styles.walletInfo}>
                <Text style={styles.walletLabel}>Pending</Text>
                <Text style={styles.walletAmount}>
                  ₵{(earningsData.pending_earnings ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payout' && styles.activeTab]}
          onPress={() => setActiveTab('payout')}
        >
          <Text style={[styles.tabText, activeTab === 'payout' && styles.activeTabText]}>
            Payout
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
  walletSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  walletInfo: {
    alignItems: 'flex-end',
  },
  walletLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  walletAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
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
  walletCard: {
    backgroundColor: '#0066cc',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletTitle: {
    fontSize: 16,
    color: '#bfdbfe',
    fontWeight: '500',
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  payoutButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  walletBalance: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  walletSubtext: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  earningsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  earningsCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  earningsChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  earningsChangeText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  quickStats: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  historyAmount: {
    alignItems: 'flex-end',
  },
  historyAmountText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  payoutSection: {
    gap: 24,
  },
  payoutInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  payoutInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  payoutBalance: {
    fontSize: 48,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.5,
  },
  payoutOptions: {
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
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
  errorContainer: {
    flex: 1,
    padding: 20,
  },
  // Earnings breakdown styles
  earningCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  earningHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  earningHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  earningInfo: {
    marginLeft: 12,
    flex: 1,
  },
  earningTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  earningDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  earningAmountSection: {
    alignItems: 'flex-end',
  },
  earningTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  earningStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  earningStatusText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  earningBreakdown: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownDot: {
    fontSize: 16,
    color: '#10b981',
    marginRight: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  breakdownSubValue: {
    fontSize: 13,
    color: '#9ca3af',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  breakdownTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  earningNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  earningNoteText: {
    fontSize: 12,
    color: '#3b82f6',
    marginLeft: 6,
    flex: 1,
  },
  // Pending request styles
  pendingRequestCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  pendingRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingRequestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginLeft: 8,
  },
  pendingRequestBody: {
    marginTop: 8,
  },
  pendingRequestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pendingRequestLabel: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '600',
  },
  pendingRequestAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingRequestDate: {
    fontSize: 14,
    color: '#92400e',
  },
  pendingRequestActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  requestActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  modifyButton: {
    backgroundColor: '#3b82f6',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  requestActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  editAmountContainer: {
    paddingTop: 8,
  },
  editAmountLabel: {
    fontSize: 14,
    color: '#78350f',
    fontWeight: '600',
    marginBottom: 8,
  },
  amountInput: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelEditButton: {
    backgroundColor: '#e5e7eb',
  },
  saveEditButton: {
    backgroundColor: '#10b981',
  },
  cancelEditButtonText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  saveEditButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Payout History Styles
  totalPaidCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  totalPaidHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalPaidInfo: {
    flex: 1,
  },
  totalPaidLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalPaidAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
  },
  payoutCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  payoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  payoutHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payoutHistoryInfo: {
    marginLeft: 12,
    flex: 1,
  },
  payoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  payoutDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  payoutAmountSection: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  payoutStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  payoutStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  payoutDetails: {
    marginTop: 4,
  },
  payoutDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  payoutDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutDetailLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  payoutDetailValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
});

export default RiderEarningsScreen;
