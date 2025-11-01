/**
 * PendingAssignmentCard Component
 * Shows auto-assigned orders with countdown timer and accept/reject buttons
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveOrder } from '../services/riderApi';

interface PendingAssignmentCardProps {
  order: ActiveOrder;
  expiresAt: string | null;
  onAccept: (orderId: number) => Promise<void>;
  onReject: (orderId: number) => Promise<void>;
}

const PendingAssignmentCard: React.FC<PendingAssignmentCardProps> = ({
  order,
  expiresAt,
  onAccept,
  onReject,
}) => {
  const [remainingTime, setRemainingTime] = useState(30);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!expiresAt) {
      setRemainingTime(0);
      return;
    }

    const calculateRemaining = () => {
      const now = new Date().getTime();
      const expires = new Date(expiresAt).getTime();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setRemainingTime(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await onAccept(order.id);
    } catch (error) {
      console.error('Error accepting order:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order? It will be assigned to another rider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await onReject(order.id);
            } catch (error) {
              console.error('Error rejecting order:', error);
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    if (remainingTime <= 10) return '#ef4444'; // Red
    if (remainingTime <= 20) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  };

  return (
    <View style={styles.container}>
      {/* Urgent Badge */}
      <View style={styles.urgentBadge}>
        <Ionicons name="alert-circle" size={16} color="#fff" />
        <Text style={styles.urgentText}>NEW ASSIGNMENT</Text>
      </View>

      {/* Timer */}
      <View style={[styles.timerContainer, { backgroundColor: getTimerColor() }]}>
        <Ionicons name="timer-outline" size={20} color="#fff" />
        <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
        <Text style={styles.timerLabel}>to respond</Text>
      </View>

      {/* Order Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={18} color="#6b7280" />
          <Text style={styles.detailText} numberOfLines={2}>
            {order.delivery_address || 'No address provided'}
          </Text>
        </View>

        {order.customer_name && (
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={18} color="#6b7280" />
            <Text style={styles.detailText}>{order.customer_name}</Text>
          </View>
        )}

        {order.customer_phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={18} color="#6b7280" />
            <Text style={styles.detailText}>{order.customer_phone}</Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={18} color="#6b7280" />
          <Text style={styles.detailText}>₵{order.total_amount?.toFixed(2) || '0.00'}</Text>
        </View>

        {order.distance_km && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={18} color="#6b7280" />
            <Text style={styles.detailText}>{order.distance_km} km away</Text>
          </View>
        )}

        {order.estimated_time_minutes && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={18} color="#6b7280" />
            <Text style={styles.detailText}>~{order.estimated_time_minutes} min ETA</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.rejectButton]}
          onPress={handleReject}
          disabled={actionLoading || remainingTime === 0}
        >
          <Ionicons name="close-circle" size={22} color="#fff" />
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton]}
          onPress={handleAccept}
          disabled={actionLoading || remainingTime === 0}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
      </View>

      {remainingTime === 0 && (
        <View style={styles.expiredOverlay}>
          <Text style={styles.expiredText}>⏱️ Time expired - reassigning...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
  },
  urgentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  timerText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  timerLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.9,
  },
  detailsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  acceptText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PendingAssignmentCard;
