import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const API_URL = 'http://192.168.1.25:8000';

interface Rider {
  id: number;
  username: string;
  email: string;
  phone: string;
  vehicle_type: string;
  vehicle_number: string;
  license_number: string;
  status: string;
  rating: number;
  total_deliveries: number;
  earnings: number;
  area_coverage: string;
  is_active: boolean;
  is_verified: boolean;
  is_suspended: boolean;
  document_status: string;
  verification_date?: string;
  suspension_reason?: string;
  created_at: string;
}

const AdminRidersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchRiders();
  }, []);

  const fetchRiders = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/admin/riders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRiders(data);
      } else {
        Alert.alert('Error', 'Failed to fetch riders');
      }
    } catch (error) {
      console.error('Error fetching riders:', error);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiders();
  };

  const handleVerifyRider = async (riderId: number, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Unverify Rider' : 'Verify Rider',
      currentStatus 
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
                    is_verified: !currentStatus,
                    notes: currentStatus ? 'Unverified by admin' : 'Verified by admin',
                  }),
                }
              );

              if (response.ok) {
                Alert.alert('Success', `Rider ${currentStatus ? 'unverified' : 'verified'} successfully`);
                fetchRiders();
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

  const handleSuspendRider = async (riderId: number, currentStatus: boolean) => {
    if (currentStatus) {
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
                fetchRiders();
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
              fetchRiders();
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

  const handleViewDetails = (rider: Rider) => {
    navigation.navigate('RiderDetails' as never, { riderId: rider.id } as never);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return '#10b981';
      case 'busy':
        return '#f59e0b';
      case 'offline':
        return '#6b7280';
      case 'suspended':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const renderRiderCard = ({ item }: { item: Rider }) => (
    <TouchableOpacity
      style={styles.riderCard}
      onPress={() => handleViewDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.riderInfo}>
          <Text style={styles.riderName}>{item.username}</Text>
          <Text style={styles.riderEmail}>{item.email}</Text>
        </View>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          />
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{item.phone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="bicycle-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {item.vehicle_type} - {item.vehicle_number}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{item.area_coverage}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#f59e0b" />
          <Text style={styles.statText}>{item.rating.toFixed(1)}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#10b981" />
          <Text style={styles.statText}>{item.total_deliveries} deliveries</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={16} color="#3b82f6" />
          <Text style={styles.statText}>₵{item.earnings.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.badgesRow}>
        {item.is_verified ? (
          <View style={[styles.badge, styles.verifiedBadge]}>
            <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            <Text style={styles.badgeText}>Verified</Text>
          </View>
        ) : (
          <View style={[styles.badge, styles.unverifiedBadge]}>
            <Ionicons name="shield-outline" size={14} color="#f59e0b" />
            <Text style={styles.badgeText}>Pending</Text>
          </View>
        )}

        {item.is_suspended && (
          <View style={[styles.badge, styles.suspendedBadge]}>
            <Ionicons name="ban" size={14} color="#ef4444" />
            <Text style={styles.badgeText}>Suspended</Text>
          </View>
        )}

        {!item.is_active && (
          <View style={[styles.badge, styles.inactiveBadge]}>
            <Ionicons name="pause-circle-outline" size={14} color="#6b7280" />
            <Text style={styles.badgeText}>Inactive</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            item.is_verified ? styles.unverifyButton : styles.verifyButton,
          ]}
          onPress={() => handleVerifyRider(item.id, item.is_verified)}
        >
          <Ionicons
            name={item.is_verified ? 'shield-outline' : 'shield-checkmark'}
            size={16}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {item.is_verified ? 'Unverify' : 'Verify'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            item.is_suspended ? styles.reactivateButton : styles.suspendButton,
          ]}
          onPress={() => handleSuspendRider(item.id, item.is_suspended)}
        >
          <Ionicons
            name={item.is_suspended ? 'play-circle' : 'ban'}
            size={16}
            color="#fff"
          />
          <Text style={styles.actionButtonText}>
            {item.is_suspended ? 'Reactivate' : 'Suspend'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>

      {item.suspension_reason && (
        <View style={styles.suspensionNotice}>
          <Ionicons name="information-circle" size={16} color="#ef4444" />
          <Text style={styles.suspensionText}>
            Reason: {item.suspension_reason}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading riders...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Riders Management</Text>
        <Text style={styles.subtitle}>
          {riders.length} {riders.length === 1 ? 'rider' : 'riders'} registered
        </Text>
      </View>

      <FlatList
        data={riders}
        renderItem={renderRiderCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bicycle-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No riders found</Text>
          </View>
        }
      />
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
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
  },
  riderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  riderInfo: {
    flex: 1,
  },
  riderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  riderEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  cardBody: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  verifiedBadge: {
    backgroundColor: '#d1fae5',
  },
  unverifiedBadge: {
    backgroundColor: '#fef3c7',
  },
  suspendedBadge: {
    backgroundColor: '#fee2e2',
  },
  inactiveBadge: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  verifyButton: {
    backgroundColor: '#10b981',
  },
  unverifyButton: {
    backgroundColor: '#f59e0b',
  },
  suspendButton: {
    backgroundColor: '#ef4444',
  },
  reactivateButton: {
    backgroundColor: '#3b82f6',
  },
  detailsButton: {
    backgroundColor: '#6b7280',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  suspensionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  suspensionText: {
    fontSize: 13,
    color: '#991b1b',
    marginLeft: 8,
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});

export default AdminRidersScreen;
