import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useNavigation } from '@react-navigation/native';

const API_URL = 'http://192.168.1.25:8000';

interface RiderDetails {
  id: number;
  username: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  emergency_contact: string;
  area_coverage: string;
  status: string;
  location?: string;
  rating: number;
  total_deliveries: number;
  successful_deliveries: number;
  earnings: number;
  commission_rate: number;
  delivery_fee: number;
  is_active: boolean;
  is_verified: boolean;
  is_suspended: boolean;
  document_status: string;
  verification_date?: string;
  verification_notes?: string;
  suspension_date?: string;
  suspension_reason?: string;
  created_at: string;
  updated_at: string;
}

interface Earnings {
  rider_id: number;
  rider_name: string;
  total_earnings: number;
  total_deliveries: number;
  daily_earnings: number;
  daily_deliveries: number;
  weekly_earnings: number;
  weekly_deliveries: number;
  monthly_earnings: number;
  monthly_deliveries: number;
  commission_rate: number;
  delivery_fee: number;
  recent_deliveries: Array<{
    order_id: number;
    customer: string;
    delivery_date: string;
    delivery_fee: number;
    commission: number;
    total_earned: number;
  }>;
}

interface Performance {
  rider_id: number;
  rider_name: string;
  overall_rating: number;
  total_orders_assigned: number;
  total_orders_delivered: number;
  total_orders_cancelled: number;
  completion_rate: number;
  performance_score: number;
  average_delivery_time_minutes: number;
  on_time_delivery_rate: number;
  customer_satisfaction: number;
  recent_feedback: Array<{
    order_id: number;
    customer: string;
    rating: number;
    feedback: string;
    date: string;
  }>;
}

type TabType = 'info' | 'earnings' | 'performance';

const RiderDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { riderId } = route.params as { riderId: number };

  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [rider, setRider] = useState<RiderDetails | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [performance, setPerformance] = useState<Performance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRiderDetails();
  }, [riderId]);

  useEffect(() => {
    if (activeTab === 'earnings' && !earnings) {
      fetchEarnings();
    } else if (activeTab === 'performance' && !performance) {
      fetchPerformance();
    }
  }, [activeTab]);

  const fetchRiderDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/riders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const riders = await response.json();
        const riderData = riders.find((r: RiderDetails) => r.id === riderId);
        if (riderData) {
          setRider(riderData);
        } else {
          Alert.alert('Error', 'Rider not found');
          navigation.goBack();
        }
      } else {
        Alert.alert('Error', 'Failed to fetch rider details');
      }
    } catch (error) {
      console.error('Error fetching rider details:', error);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/admin/riders/${riderId}/earnings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEarnings(data);
      } else {
        Alert.alert('Error', 'Failed to fetch earnings data');
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
      Alert.alert('Error', 'Network error');
    }
  };

  const fetchPerformance = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        `${API_URL}/api/admin/riders/${riderId}/performance`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPerformance(data);
      } else {
        Alert.alert('Error', 'Failed to fetch performance data');
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
      Alert.alert('Error', 'Network error');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiderDetails();
    if (activeTab === 'earnings') {
      fetchEarnings();
    } else if (activeTab === 'performance') {
      fetchPerformance();
    }
  };

  const handleVerifyRider = async () => {
    if (!rider) return;

    Alert.alert(
      rider.is_verified ? 'Unverify Rider' : 'Verify Rider',
      rider.is_verified
        ? 'Are you sure you want to unverify this rider?'
        : 'Are you sure you want to verify this rider?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(
                `${API_URL}/api/admin/riders/${riderId}/verify`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    is_verified: !rider.is_verified,
                    notes: rider.is_verified
                      ? 'Unverified by admin'
                      : 'Verified by admin',
                  }),
                }
              );

              if (response.ok) {
                Alert.alert(
                  'Success',
                  `Rider ${rider.is_verified ? 'unverified' : 'verified'} successfully`
                );
                fetchRiderDetails();
              } else {
                Alert.alert('Error', 'Failed to update verification status');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            }
          },
        },
      ]
    );
  };

  const handleSuspendRider = async () => {
    if (!rider) return;

    if (rider.is_suspended) {
      // Reactivate
      Alert.alert('Reactivate Rider', 'Reactivate this rider?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(
                `${API_URL}/api/admin/riders/${riderId}/suspend`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    is_suspended: false,
                  }),
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Rider reactivated successfully');
                fetchRiderDetails();
              } else {
                Alert.alert('Error', 'Failed to reactivate rider');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            }
          },
        },
      ]);
    } else {
      // Suspend
      Alert.prompt(
        'Suspend Rider',
        'Enter suspension reason:',
        async (reason) => {
          if (!reason || reason.trim() === '') {
            Alert.alert('Error', 'Suspension reason is required');
            return;
          }

          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(
              `${API_URL}/api/admin/riders/${riderId}/suspend`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  is_suspended: true,
                  reason: reason.trim(),
                }),
              }
            );

            if (response.ok) {
              Alert.alert('Success', 'Rider suspended successfully');
              fetchRiderDetails();
            } else {
              Alert.alert('Error', 'Failed to suspend rider');
            }
          } catch (error) {
            Alert.alert('Error', 'Network error');
          }
        }
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return '#10b981';
      case 'busy':
        return '#f59e0b';
      case 'offline':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const renderInfoTab = () => {
    if (!rider) return null;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{rider.username}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{rider.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{rider.phone}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              <Text style={styles.infoValue}>{rider.emergency_contact}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle Type</Text>
              <Text style={styles.infoValue}>{rider.vehicle_type}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Vehicle Number</Text>
              <Text style={styles.infoValue}>{rider.vehicle_number}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>License Number</Text>
              <Text style={styles.infoValue}>{rider.license_number}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Area Coverage</Text>
              <Text style={styles.infoValue}>{rider.area_coverage}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status & Verification</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Current Status</Text>
              <View style={styles.statusRow}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(rider.status) },
                  ]}
                />
                <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
                  {rider.status}
                </Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Document Status</Text>
              <Text style={[styles.infoValue, { textTransform: 'capitalize' }]}>
                {rider.document_status}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Verification Status</Text>
              <Text style={styles.infoValue}>
                {rider.is_verified ? 'Verified ✓' : 'Not Verified'}
              </Text>
            </View>
            {rider.verification_date && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Verification Date</Text>
                <Text style={styles.infoValue}>
                  {new Date(rider.verification_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {rider.verification_notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Verification Notes:</Text>
              <Text style={styles.notesText}>{rider.verification_notes}</Text>
            </View>
          )}

          {rider.is_suspended && (
            <View style={styles.suspensionBox}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <View style={styles.suspensionInfo}>
                <Text style={styles.suspensionTitle}>Account Suspended</Text>
                {rider.suspension_date && (
                  <Text style={styles.suspensionDate}>
                    Since: {new Date(rider.suspension_date).toLocaleDateString()}
                  </Text>
                )}
                {rider.suspension_reason && (
                  <Text style={styles.suspensionReason}>
                    Reason: {rider.suspension_reason}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{rider.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.statValue}>{rider.total_deliveries}</Text>
              <Text style={styles.statLabel}>Total Deliveries</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trophy" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{rider.successful_deliveries}</Text>
              <Text style={styles.statLabel}>Successful</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#10b981" />
              <Text style={styles.statValue}>₵{rider.earnings.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Account Created</Text>
              <Text style={styles.infoValue}>
                {new Date(rider.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {new Date(rider.updated_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Commission Rate</Text>
              <Text style={styles.infoValue}>
                {(rider.commission_rate * 100).toFixed(0)}%
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Delivery Fee</Text>
              <Text style={styles.infoValue}>₵{rider.delivery_fee.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderEarningsTab = () => {
    if (!earnings) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading earnings data...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings Summary</Text>
          <View style={styles.earningsGrid}>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Total Earnings</Text>
              <Text style={styles.earningValue}>
                ₵{earnings.total_earnings.toFixed(2)}
              </Text>
              <Text style={styles.earningSubtext}>
                {earnings.total_deliveries} deliveries
              </Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>Today</Text>
              <Text style={styles.earningValue}>
                ₵{earnings.daily_earnings.toFixed(2)}
              </Text>
              <Text style={styles.earningSubtext}>
                {earnings.daily_deliveries} deliveries
              </Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>This Week</Text>
              <Text style={styles.earningValue}>
                ₵{earnings.weekly_earnings.toFixed(2)}
              </Text>
              <Text style={styles.earningSubtext}>
                {earnings.weekly_deliveries} deliveries
              </Text>
            </View>
            <View style={styles.earningCard}>
              <Text style={styles.earningLabel}>This Month</Text>
              <Text style={styles.earningValue}>
                ₵{earnings.monthly_earnings.toFixed(2)}
              </Text>
              <Text style={styles.earningSubtext}>
                {earnings.monthly_deliveries} deliveries
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fee Structure</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Delivery Fee</Text>
              <Text style={styles.infoValue}>₵{earnings.delivery_fee.toFixed(2)}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Commission Rate</Text>
              <Text style={styles.infoValue}>
                {(earnings.commission_rate * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {earnings.recent_deliveries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Deliveries</Text>
            {earnings.recent_deliveries.map((delivery, index) => (
              <View key={index} style={styles.deliveryCard}>
                <View style={styles.deliveryHeader}>
                  <Text style={styles.deliveryOrderId}>
                    Order #{delivery.order_id}
                  </Text>
                  <Text style={styles.deliveryEarned}>
                    ₵{delivery.total_earned.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.deliveryCustomer}>{delivery.customer}</Text>
                <Text style={styles.deliveryDate}>
                  {new Date(delivery.delivery_date).toLocaleString()}
                </Text>
                <View style={styles.deliveryBreakdown}>
                  <Text style={styles.deliveryBreakdownText}>
                    Fee: ₵{delivery.delivery_fee.toFixed(2)}
                  </Text>
                  <Text style={styles.deliveryBreakdownText}>
                    Commission: ₵{delivery.commission.toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPerformanceTab = () => {
    if (!performance) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance Overview</Text>
          <View style={styles.performanceHeader}>
            <View style={styles.scoreCircle}>
              <Text style={styles.scoreValue}>
                {performance.performance_score.toFixed(0)}
              </Text>
              <Text style={styles.scoreLabel}>Performance Score</Text>
            </View>
            <View style={styles.scoreDetails}>
              <View style={styles.scoreItem}>
                <Ionicons name="star" size={20} color="#f59e0b" />
                <Text style={styles.scoreText}>
                  {performance.overall_rating.toFixed(1)} Rating
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.scoreText}>
                  {performance.completion_rate.toFixed(1)}% Completion
                </Text>
              </View>
              <View style={styles.scoreItem}>
                <Ionicons name="time" size={20} color="#3b82f6" />
                <Text style={styles.scoreText}>
                  {performance.average_delivery_time_minutes.toFixed(0)} min avg
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="list" size={24} color="#6b7280" />
              <Text style={styles.statValue}>{performance.total_orders_assigned}</Text>
              <Text style={styles.statLabel}>Total Assigned</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-done" size={24} color="#10b981" />
              <Text style={styles.statValue}>
                {performance.total_orders_delivered}
              </Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={styles.statValue}>
                {performance.total_orders_cancelled}
              </Text>
              <Text style={styles.statLabel}>Cancelled</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="timer" size={24} color="#10b981" />
              <Text style={styles.statValue}>
                {performance.on_time_delivery_rate.toFixed(0)}%
              </Text>
              <Text style={styles.statLabel}>On-Time Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Feedback</Text>
          <View style={styles.satisfactionBar}>
            <Text style={styles.satisfactionLabel}>Customer Satisfaction</Text>
            <View style={styles.satisfactionContainer}>
              <View
                style={[
                  styles.satisfactionFill,
                  { width: `${performance.customer_satisfaction}%` },
                ]}
              />
            </View>
            <Text style={styles.satisfactionValue}>
              {performance.customer_satisfaction.toFixed(1)}%
            </Text>
          </View>

          {performance.recent_feedback.length > 0 && (
            <View style={styles.feedbackList}>
              <Text style={styles.feedbackTitle}>Recent Reviews</Text>
              {performance.recent_feedback.map((feedback, index) => (
                <View key={index} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <Text style={styles.feedbackCustomer}>{feedback.customer}</Text>
                    <View style={styles.feedbackRating}>
                      <Ionicons name="star" size={16} color="#f59e0b" />
                      <Text style={styles.feedbackRatingText}>
                        {feedback.rating.toFixed(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.feedbackText}>{feedback.feedback}</Text>
                  <Text style={styles.feedbackDate}>
                    Order #{feedback.order_id} •{' '}
                    {new Date(feedback.date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading rider details...</Text>
      </View>
    );
  }

  if (!rider) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Rider not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{rider.username}</Text>
          <Text style={styles.headerSubtitle}>{rider.email}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            rider.is_verified ? styles.unverifyBtn : styles.verifyBtn,
          ]}
          onPress={handleVerifyRider}
        >
          <Ionicons
            name={rider.is_verified ? 'shield-outline' : 'shield-checkmark'}
            size={20}
            color="#fff"
          />
          <Text style={styles.actionBtnText}>
            {rider.is_verified ? 'Unverify' : 'Verify'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionBtn,
            rider.is_suspended ? styles.reactivateBtn : styles.suspendBtn,
          ]}
          onPress={handleSuspendRider}
        >
          <Ionicons
            name={rider.is_suspended ? 'play-circle' : 'ban'}
            size={20}
            color="#fff"
          />
          <Text style={styles.actionBtnText}>
            {rider.is_suspended ? 'Reactivate' : 'Suspend'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={activeTab === 'info' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}
          >
            Info
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'earnings' && styles.activeTab]}
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons
            name="cash-outline"
            size={20}
            color={activeTab === 'earnings' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'earnings' && styles.activeTabText,
            ]}
          >
            Earnings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'performance' && styles.activeTab]}
          onPress={() => setActiveTab('performance')}
        >
          <Ionicons
            name="trending-up-outline"
            size={20}
            color={activeTab === 'performance' ? '#3b82f6' : '#6b7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'performance' && styles.activeTabText,
            ]}
          >
            Performance
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
          />
        }
      >
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'earnings' && renderEarningsTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  verifyBtn: {
    backgroundColor: '#10b981',
  },
  unverifyBtn: {
    backgroundColor: '#f59e0b',
  },
  suspendBtn: {
    backgroundColor: '#ef4444',
  },
  reactivateBtn: {
    backgroundColor: '#3b82f6',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#3b82f6',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notesBox: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#6b7280',
  },
  suspensionBox: {
    flexDirection: 'row',
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 12,
  },
  suspensionInfo: {
    flex: 1,
  },
  suspensionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  suspensionDate: {
    fontSize: 13,
    color: '#b91c1c',
    marginBottom: 2,
  },
  suspensionReason: {
    fontSize: 13,
    color: '#dc2626',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  earningsGrid: {
    gap: 12,
  },
  earningCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
  },
  earningLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  earningValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 4,
  },
  earningSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  deliveryCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deliveryOrderId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  deliveryEarned: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#10b981',
  },
  deliveryCustomer: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  deliveryDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  deliveryBreakdown: {
    flexDirection: 'row',
    gap: 16,
  },
  deliveryBreakdownText: {
    fontSize: 12,
    color: '#6b7280',
  },
  performanceHeader: {
    flexDirection: 'row',
    gap: 16,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  scoreDetails: {
    flex: 1,
    justifyContent: 'space-around',
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  satisfactionBar: {
    marginBottom: 16,
  },
  satisfactionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  satisfactionContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  satisfactionFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  satisfactionValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'right',
  },
  feedbackList: {
    marginTop: 16,
  },
  feedbackTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  feedbackCard: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  feedbackCustomer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  feedbackRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackRatingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  feedbackText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default RiderDetailsScreen;
