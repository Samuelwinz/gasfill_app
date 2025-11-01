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
  Modal,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import adminAuthService from '../services/adminAuthService';

const API_URL = 'http://192.168.8.100:8000';

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
  verification_notes?: string;
  suspension_reason?: string;
  created_at: string;
  license_photo_url?: string;
  vehicle_photo_url?: string;
}

type FilterType = 'all' | 'pending' | 'approved' | 'rejected';

const AdminRidersScreen: React.FC = () => {
  const navigation = useNavigation();
  const [riders, setRiders] = useState<Rider[]>([]);
  const [filteredRiders, setFilteredRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');

  useEffect(() => {
    fetchRiders();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [riders, filter]);

  const applyFilter = () => {
    if (filter === 'all') {
      setFilteredRiders(riders);
    } else {
      setFilteredRiders(riders.filter(r => r.document_status === filter));
    }
  };

  const fetchRiders = async () => {
    try {
      // Check if admin is logged in
      const isLoggedIn = await adminAuthService.isAdminLoggedIn();
      if (!isLoggedIn) {
        Alert.alert(
          'Authentication Required',
          'Please login as admin to continue',
          [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
        );
        return;
      }

      // Use admin auth service to make authenticated request
      const data = await adminAuthService.makeAdminRequest<Rider[]>('/api/admin/riders');
      setRiders(data);
    } catch (error: any) {
      console.error('Error fetching riders:', error);
      
      if (error.message?.includes('Admin session expired')) {
        Alert.alert(
          'Session Expired',
          'Your admin session has expired. Please login again.',
          [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to fetch riders');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRiders();
  };

  const handleViewDocuments = (rider: Rider) => {
    setSelectedRider(rider);
    setVerificationNotes('');
    setShowDocumentModal(true);
  };

  const handleApproveDocuments = async () => {
    if (!selectedRider) return;

    try {
      await adminAuthService.makeAdminRequest(`/api/admin/riders/${selectedRider.id}/verify`, {
        method: 'POST',
        data: {
          is_verified: true,
          notes: verificationNotes || 'Documents approved by admin',
        },
      });

      Alert.alert('Success', 'Rider documents approved successfully');
      setShowDocumentModal(false);
      setSelectedRider(null);
      fetchRiders();
    } catch (error: any) {
      console.error('Error approving documents:', error);
      
      if (error.message?.includes('Admin session expired')) {
        Alert.alert(
          'Session Expired',
          'Your admin session has expired. Please login again.',
          [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to approve documents');
      }
    }
  };

  const handleRejectDocuments = async () => {
    if (!selectedRider) return;
    
    if (!verificationNotes.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      await adminAuthService.makeAdminRequest(`/api/admin/riders/${selectedRider.id}/verify`, {
        method: 'POST',
        data: {
          is_verified: false,
          notes: verificationNotes,
        },
      });

      Alert.alert('Success', 'Documents rejected. Rider will be notified.');
      setShowDocumentModal(false);
      setSelectedRider(null);
      fetchRiders();
    } catch (error: any) {
      console.error('Error rejecting documents:', error);
      
      if (error.message?.includes('Admin session expired')) {
        Alert.alert(
          'Session Expired',
          'Your admin session has expired. Please login again.',
          [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to reject documents');
      }
    }
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
              await adminAuthService.makeAdminRequest(`/api/admin/riders/${riderId}/verify`, {
                method: 'POST',
                data: {
                  is_verified: !currentStatus,
                  notes: currentStatus ? 'Unverified by admin' : 'Verified by admin',
                },
              });

              Alert.alert('Success', `Rider ${currentStatus ? 'unverified' : 'verified'} successfully`);
              fetchRiders();
            } catch (error: any) {
              console.error('Error updating verification:', error);
              
              if (error.message?.includes('Admin session expired')) {
                Alert.alert(
                  'Session Expired',
                  'Your admin session has expired. Please login again.',
                  [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
                );
              } else {
                Alert.alert('Error', error.message || 'Failed to update verification status');
              }
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
              await adminAuthService.makeAdminRequest(`/api/admin/riders/${riderId}/suspend`, {
                method: 'POST',
                data: {
                  is_suspended: false,
                },
              });

              Alert.alert('Success', 'Rider reactivated successfully');
              fetchRiders();
            } catch (error: any) {
              console.error('Error reactivating rider:', error);
              
              if (error.message?.includes('Admin session expired')) {
                Alert.alert(
                  'Session Expired',
                  'Your admin session has expired. Please login again.',
                  [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
                );
              } else {
                Alert.alert('Error', error.message || 'Failed to reactivate rider');
              }
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
            await adminAuthService.makeAdminRequest(`/api/admin/riders/${riderId}/suspend`, {
              method: 'POST',
              data: {
                is_suspended: true,
                reason: reason.trim(),
              },
            });

            Alert.alert('Success', 'Rider suspended successfully');
            fetchRiders();
          } catch (error: any) {
            console.error('Error suspending rider:', error);
            
            if (error.message?.includes('Admin session expired')) {
              Alert.alert(
                'Session Expired',
                'Your admin session has expired. Please login again.',
                [{ text: 'OK', onPress: () => navigation.navigate('AdminLogin' as never) }]
              );
            } else {
              Alert.alert('Error', error.message || 'Failed to suspend rider');
            }
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

  const getDocumentStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#d1fae5', text: '#065f46', label: '✓ Approved', icon: 'checkmark-circle' };
      case 'rejected':
        return { bg: '#fee2e2', text: '#991b1b', label: '✗ Rejected', icon: 'close-circle' };
      default:
        return { bg: '#fef3c7', text: '#92400e', label: '⏳ Pending Review', icon: 'time' };
    }
  };

  const renderRiderCard = ({ item }: { item: Rider }) => {
    const docStatus = getDocumentStatusConfig(item.document_status);
    
    return (
    <TouchableOpacity
      style={styles.riderCard}
      onPress={() => handleViewDocuments(item)}
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

      {/* Document Status Banner */}
      <View style={[styles.documentStatusBanner, { backgroundColor: docStatus.bg }]}>
        <Ionicons name={docStatus.icon as any} size={16} color={docStatus.text} />
        <Text style={[styles.documentStatusText, { color: docStatus.text }]}>
          {docStatus.label}
        </Text>
      </View>

      {item.verification_notes && item.document_status === 'rejected' && (
        <View style={styles.rejectionNotice}>
          <Ionicons name="alert-circle" size={14} color="#991b1b" />
          <Text style={styles.rejectionText}>{item.verification_notes}</Text>
        </View>
      )}

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
          style={[styles.actionButton, styles.documentsButton]}
          onPress={() => handleViewDocuments(item)}
        >
          <Ionicons name="document-text-outline" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>View Docs</Text>
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
  };

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
          {filteredRiders.length} of {riders.length} {riders.length === 1 ? 'rider' : 'riders'}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All ({riders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending ({riders.filter(r => r.document_status === 'pending').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'approved' && styles.filterTabActive]}
          onPress={() => setFilter('approved')}
        >
          <Text style={[styles.filterText, filter === 'approved' && styles.filterTextActive]}>
            Approved ({riders.filter(r => r.document_status === 'approved').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'rejected' && styles.filterTabActive]}
          onPress={() => setFilter('rejected')}
        >
          <Text style={[styles.filterText, filter === 'rejected' && styles.filterTextActive]}>
            Rejected ({riders.filter(r => r.document_status === 'rejected').length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRiders}
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

      {/* Document Viewer Modal */}
      <Modal
        visible={showDocumentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDocumentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rider Documents</Text>
              <TouchableOpacity onPress={() => setShowDocumentModal(false)}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>

            {selectedRider && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.riderInfoSection}>
                  <Text style={styles.sectionTitle}>Rider Information</Text>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{selectedRider.username}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{selectedRider.email}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>License:</Text>
                    <Text style={styles.infoValue}>{selectedRider.license_number || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Vehicle:</Text>
                    <Text style={styles.infoValue}>
                      {selectedRider.vehicle_type} - {selectedRider.vehicle_number}
                    </Text>
                  </View>
                </View>

                <View style={styles.documentsSection}>
                  <Text style={styles.sectionTitle}>Uploaded Documents</Text>
                  
                  <View style={styles.documentCard}>
                    <Text style={styles.documentLabel}>License Photo</Text>
                    {selectedRider.license_photo_url ? (
                      <Image
                        source={{ uri: `${API_URL}${selectedRider.license_photo_url}` }}
                        style={styles.documentImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.noDocument}>
                        <Ionicons name="document-outline" size={48} color="#d1d5db" />
                        <Text style={styles.noDocumentText}>No photo uploaded</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.documentCard}>
                    <Text style={styles.documentLabel}>Vehicle Photo</Text>
                    {selectedRider.vehicle_photo_url ? (
                      <Image
                        source={{ uri: `${API_URL}${selectedRider.vehicle_photo_url}` }}
                        style={styles.documentImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={styles.noDocument}>
                        <Ionicons name="car-outline" size={48} color="#d1d5db" />
                        <Text style={styles.noDocumentText}>No photo uploaded</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.sectionTitle}>Verification Notes</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Enter approval/rejection notes..."
                    value={verificationNotes}
                    onChangeText={setVerificationNotes}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.approveButton]}
                    onPress={handleApproveDocuments}
                  >
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.rejectButton]}
                    onPress={handleRejectDocuments}
                  >
                    <Ionicons name="close-circle" size={20} color="#fff" />
                    <Text style={styles.modalButtonText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setShowDocumentModal(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#6b7280' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  // Document status
  documentStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  documentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  rejectionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 13,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  documentsButton: {
    backgroundColor: '#6366f1',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Dimensions.get('window').height * 0.9,
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
    fontWeight: 'bold',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  riderInfoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  documentsSection: {
    marginBottom: 24,
  },
  documentCard: {
    marginBottom: 16,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  documentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  noDocument: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  noDocumentText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  notesSection: {
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
});

export default AdminRidersScreen;
