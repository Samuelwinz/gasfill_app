import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../services/api';
import RatingStars from '../components/RatingStars';
import Loading from '../components/Loading';
import ErrorDisplay from '../components/ErrorDisplay';
import { Rating } from '../types/rating';

interface AdminDisputesScreenProps {
  navigation: any;
}

const AdminDisputesScreen: React.FC<AdminDisputesScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disputes, setDisputes] = useState<Rating[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<Rating | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [resolveAction, setResolveAction] = useState<'resolved' | 'rejected'>('resolved');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      setError(null);

      const disputesData = await ApiService.getDisputedRatings();
      setDisputes(disputesData);
    } catch (err: any) {
      console.error('Failed to load disputes:', err);
      setError(err.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDisputes(true);
  };

  const openResolveModal = (dispute: Rating, action: 'resolved' | 'rejected') => {
    setSelectedDispute(dispute);
    setResolveAction(action);
    setAdminResponse('');
    setShowResolveModal(true);
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute) return;

    if (!adminResponse.trim()) {
      Alert.alert('Error', 'Please provide an admin response');
      return;
    }

    try {
      setSubmitting(true);
      await ApiService.resolveRatingDispute(
        selectedDispute.id,
        adminResponse.trim(),
        resolveAction
      );

      Alert.alert(
        'Success',
        `Dispute ${resolveAction === 'resolved' ? 'resolved' : 'rejected'} successfully`
      );

      setShowResolveModal(false);
      loadDisputes();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resolve dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading message="Loading disputes..." />
      </SafeAreaView>
    );
  }

  if (error && disputes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorDisplay
          title="Unable to load disputes"
          message={error}
          onRetry={loadDisputes}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rating Disputes</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{disputes.length}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {disputes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={80} color="#10b981" />
            <Text style={styles.emptyStateTitle}>All Clear!</Text>
            <Text style={styles.emptyStateText}>
              No pending disputes to review at this time
            </Text>
          </View>
        ) : (
          disputes.map((dispute) => (
            <View key={dispute.id} style={styles.disputeCard}>
              {/* Header */}
              <View style={styles.disputeHeader}>
                <View style={styles.disputeInfo}>
                  <Text style={styles.disputeId}>Dispute #{dispute.id.slice(-8)}</Text>
                  <Text style={styles.disputeDate}>
                    {formatDate(dispute.dispute_date || dispute.created_at)}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Ionicons name="alert-circle" size={16} color="#FFA500" />
                  <Text style={styles.statusText}>Pending</Text>
                </View>
              </View>

              {/* Original Rating */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Original Rating</Text>
                <View style={styles.ratingInfo}>
                  <View style={styles.ratingRow}>
                    <Text style={styles.label}>From:</Text>
                    <Text style={styles.value}>{dispute.reviewer_name}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Text style={styles.label}>To:</Text>
                    <Text style={styles.value}>{dispute.reviewee_name}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Text style={styles.label}>Rating:</Text>
                    <RatingStars rating={dispute.rating} size={18} />
                  </View>
                  {dispute.comment && (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentLabel}>Comment:</Text>
                      <Text style={styles.commentText}>{dispute.comment}</Text>
                    </View>
                  )}
                  {dispute.tags && dispute.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {dispute.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Dispute Reason */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dispute Reason</Text>
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonText}>{dispute.dispute_reason}</Text>
                </View>
              </View>

              {/* Order Info */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Order Details</Text>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderText}>Order ID: {dispute.order_id}</Text>
                  <Text style={styles.orderText}>
                    Type: {dispute.rating_type.replace('_', ' → ')}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resolveButton]}
                  onPress={() => openResolveModal(dispute, 'resolved')}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Resolve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => openResolveModal(dispute, 'rejected')}
                >
                  <Ionicons name="close-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Resolve Modal */}
      <Modal
        visible={showResolveModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowResolveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {resolveAction === 'resolved' ? 'Resolve' : 'Reject'} Dispute
              </Text>
              <TouchableOpacity onPress={() => setShowResolveModal(false)}>
                <Ionicons name="close" size={24} color="#757575" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Admin Response *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Explain your decision to the user..."
                placeholderTextColor="#9E9E9E"
                value={adminResponse}
                onChangeText={setAdminResponse}
                multiline
                numberOfLines={6}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {adminResponse.length}/500 characters
              </Text>

              <View style={styles.modalInfo}>
                <Ionicons name="information-circle" size={20} color="#2196F3" />
                <Text style={styles.modalInfoText}>
                  {resolveAction === 'resolved'
                    ? 'The rating will be removed and the user notified.'
                    : 'The dispute will be rejected and the rating will remain.'}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowResolveModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  resolveAction === 'rejected' && styles.modalRejectButton,
                  submitting && styles.modalButtonDisabled,
                ]}
                onPress={handleResolveDispute}
                disabled={submitting || !adminResponse.trim()}
              >
                <Text style={styles.modalSubmitText}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F44336',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 16,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  disputeCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disputeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  disputeInfo: {},
  disputeId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  disputeDate: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFA500',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 8,
  },
  ratingInfo: {},
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#757575',
    width: 60,
  },
  value: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
    flex: 1,
  },
  commentBox: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  reasonBox: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
  },
  orderInfo: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
  },
  orderText: {
    fontSize: 13,
    color: '#424242',
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  resolveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#424242',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#212121',
    minHeight: 120,
    backgroundColor: '#FAFAFA',
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'right',
    marginTop: 4,
  },
  modalInfo: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  modalInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#616161',
  },
  modalSubmitButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalRejectButton: {
    backgroundColor: '#F44336',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
});

export default AdminDisputesScreen;
