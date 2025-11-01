import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import RatingStars from './RatingStars';
import { Rating } from '../types/rating';

interface ReviewCardProps {
  rating: Rating;
  currentUserId: number;
  currentUserType: 'customer' | 'rider';
  onDispute?: (ratingId: string) => void;
  showDisputeButton?: boolean;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  rating,
  currentUserId,
  currentUserType,
  onDispute,
  showDisputeButton = true,
}) => {
  const isReviewee = rating.reviewee_id === currentUserId && rating.reviewee_type === currentUserType;
  const canDispute = isReviewee && !rating.disputed && showDisputeButton;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getDisputeStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'resolved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#757575';
    }
  };

  const getDisputeStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Dispute Pending';
      case 'resolved': return 'Dispute Resolved';
      case 'rejected': return 'Dispute Rejected';
      default: return '';
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.reviewerInfo}>
          <Ionicons name="person-circle-outline" size={40} color="#2196F3" />
          <View style={styles.reviewerDetails}>
            <Text style={styles.reviewerName}>{rating.reviewer_name}</Text>
            <Text style={styles.date}>{formatDate(rating.created_at)}</Text>
          </View>
        </View>
        <RatingStars rating={rating.rating} size={20} />
      </View>

      {/* Comment */}
      {rating.comment && (
        <Text style={styles.comment}>{rating.comment}</Text>
      )}

      {/* Tags */}
      {rating.tags && rating.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {rating.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Dispute Status */}
      {rating.disputed && rating.dispute_status !== 'none' && (
        <View style={[styles.disputeStatus, { backgroundColor: getDisputeStatusColor(rating.dispute_status) + '20' }]}>
          <Ionicons 
            name="alert-circle" 
            size={16} 
            color={getDisputeStatusColor(rating.dispute_status)} 
          />
          <Text style={[styles.disputeText, { color: getDisputeStatusColor(rating.dispute_status) }]}>
            {getDisputeStatusText(rating.dispute_status)}
          </Text>
        </View>
      )}

      {/* Dispute Reason */}
      {rating.disputed && rating.dispute_reason && (
        <View style={styles.disputeReasonContainer}>
          <Text style={styles.disputeReasonLabel}>Dispute Reason:</Text>
          <Text style={styles.disputeReason}>{rating.dispute_reason}</Text>
        </View>
      )}

      {/* Admin Response */}
      {rating.admin_response && (
        <View style={styles.adminResponseContainer}>
          <Text style={styles.adminResponseLabel}>Admin Response:</Text>
          <Text style={styles.adminResponse}>{rating.admin_response}</Text>
        </View>
      )}

      {/* Dispute Button */}
      {canDispute && onDispute && (
        <TouchableOpacity 
          style={styles.disputeButton}
          onPress={() => onDispute(rating.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="flag-outline" size={16} color="#F44336" />
          <Text style={styles.disputeButtonText}>Dispute Rating</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewerDetails: {
    marginLeft: 12,
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  date: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  comment: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  disputeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  disputeText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  disputeReasonContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
  },
  disputeReasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  disputeReason: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  adminResponseContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  adminResponseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#388E3C',
    marginBottom: 4,
  },
  adminResponse: {
    fontSize: 13,
    color: '#424242',
    lineHeight: 18,
  },
  disputeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  disputeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
    marginLeft: 6,
  },
});

export default ReviewCard;
