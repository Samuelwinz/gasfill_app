import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OrderRatingModalProps {
  visible: boolean;
  orderId: string | number;
  riderName?: string;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => Promise<void>;
}

const OrderRatingModal: React.FC<OrderRatingModalProps> = ({
  visible,
  orderId,
  riderName,
  onClose,
  onSubmit,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(rating, comment);
      
      // Reset form
      setRating(0);
      setComment('');
      onClose();
      
      Alert.alert('Thank you!', 'Your rating has been submitted successfully');
    } catch (error) {
      console.error('[OrderRating] Submit error:', error);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setComment('');
      setHoveredRating(0);
      onClose();
    }
  };

  const renderStar = (index: number) => {
    const filled = index <= (hoveredRating || rating);
    
    return (
      <TouchableOpacity
        key={index}
        onPress={() => setRating(index)}
        onPressIn={() => setHoveredRating(index)}
        onPressOut={() => setHoveredRating(0)}
        style={styles.starButton}
        disabled={isSubmitting}
      >
        <Ionicons
          name={filled ? 'star' : 'star-outline'}
          size={40}
          color={filled ? '#f59e0b' : '#d1d5db'}
        />
      </TouchableOpacity>
    );
  };

  const getRatingLabel = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select rating';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            </View>
            <Text style={styles.title}>Order Delivered!</Text>
            <Text style={styles.subtitle}>
              How was your experience with {riderName || 'your rider'}?
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(renderStar)}
            </View>
            <Text style={styles.ratingLabel}>
              {getRatingLabel(hoveredRating || rating)}
            </Text>
          </View>

          {/* Comment Input */}
          <View style={styles.commentContainer}>
            <Text style={styles.commentLabel}>Additional Comments (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share more details about your experience..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{comment.length}/500</Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.skipButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                (rating === 0 || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={rating === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Rating</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Order Info */}
          <Text style={styles.orderInfo}>Order #{orderId}</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    height: 24,
  },
  commentContainer: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#F3F4F6',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  orderInfo: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default OrderRatingModal;
