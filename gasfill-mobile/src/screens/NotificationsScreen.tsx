import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Notification, NotificationType } from '../types';

interface NotificationsScreenProps {
  navigation: any;
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const { user, rider } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await apiService.getNotifications();
      // setNotifications(response.data);
      
      // Mock notifications for demonstration
      const mockNotifications: Notification[] = [
        {
          id: '1',
          user_id: user?.id || rider?.id || 0,
          type: 'order_delivered',
          title: 'Order Delivered',
          message: 'Your gas cylinder has been delivered successfully!',
          is_read: false,
          created_at: new Date().toISOString(),
          icon: 'checkmark-circle',
        },
        {
          id: '2',
          user_id: user?.id || rider?.id || 0,
          type: 'order_in_transit',
          title: 'Order In Transit',
          message: 'Your rider is on the way with your order.',
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          icon: 'bicycle',
        },
        {
          id: '3',
          user_id: user?.id || rider?.id || 0,
          type: 'payment_received',
          title: 'Payment Confirmed',
          message: 'Your payment of ₵50.00 has been received.',
          is_read: true,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          icon: 'card',
        },
        {
          id: '4',
          user_id: user?.id || rider?.id || 0,
          type: 'promotion',
          title: '🎉 Special Offer',
          message: 'Get 20% off on your next refill! Limited time only.',
          is_read: true,
          created_at: new Date(Date.now() - 86400000).toISOString(),
          icon: 'gift',
        },
        {
          id: '5',
          user_id: user?.id || rider?.id || 0,
          type: 'new_job',
          title: 'New Delivery Request',
          message: 'New delivery request available in your area.',
          is_read: false,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          icon: 'flame',
        },
      ];

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // TODO: Call API to mark as read
      // await apiService.markNotificationAsRead(notificationId);
      
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // TODO: Call API to mark all as read
      // await apiService.markAllNotificationsAsRead();
      
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API to delete notification
              // await apiService.deleteNotification(notificationId);
              
              setNotifications(prev => prev.filter(n => n.id !== notificationId));
            } catch (error) {
              console.error('Error deleting notification:', error);
            }
          },
        },
      ]
    );
  };

  const clearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API to clear all notifications
              // await apiService.clearAllNotifications();
              
              setNotifications([]);
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'order_placed':
      case 'order_assigned':
      case 'order_picked_up':
      case 'order_in_transit':
      case 'order_delivered':
        navigation.navigate('Orders');
        break;
      case 'new_job':
        navigation.navigate('Jobs');
        break;
      case 'earnings':
        navigation.navigate('Earnings');
        break;
      default:
        break;
    }
  };

  const getNotificationIcon = (type: NotificationType): any => {
    switch (type) {
      case 'order_delivered':
        return 'checkmark-circle';
      case 'order_in_transit':
      case 'rider_assigned':
        return 'bicycle';
      case 'order_placed':
        return 'cart';
      case 'payment_received':
      case 'payment_failed':
        return 'card';
      case 'promotion':
        return 'gift';
      case 'new_job':
        return 'briefcase';
      case 'earnings':
        return 'cash';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: NotificationType): string => {
    switch (type) {
      case 'order_delivered':
        return '#10b981';
      case 'order_in_transit':
      case 'rider_assigned':
        return '#3b82f6';
      case 'payment_received':
        return '#10b981';
      case 'payment_failed':
      case 'order_cancelled':
        return '#ef4444';
      case 'promotion':
        return '#f59e0b';
      case 'new_job':
        return '#8b5cf6';
      case 'earnings':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffMs = now.getTime() - notificationTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return notificationTime.toLocaleDateString();
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('NotificationSettings')}
          style={styles.settingsButton}
        >
          <Ionicons name="settings-outline" size={22} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.filterTabActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterTabText, filter === 'unread' && styles.filterTabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <View style={styles.actionsContainer}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
              <Ionicons name="checkmark-done-outline" size={16} color="#3b82f6" />
              <Text style={styles.actionButtonText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearAll} style={styles.actionButton}>
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>Clear all</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'unread' 
                ? "You're all caught up!" 
                : "You'll see notifications about your orders and deliveries here"}
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {filteredNotifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationCard,
                  !notification.is_read && styles.notificationCardUnread
                ]}
                onPress={() => handleNotificationPress(notification)}
              >
                <View style={styles.notificationContent}>
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: `${getNotificationColor(notification.type)}15` }
                  ]}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={24} 
                      color={getNotificationColor(notification.type)} 
                    />
                  </View>
                  
                  <View style={styles.notificationTextContainer}>
                    <View style={styles.notificationHeader}>
                      <Text style={styles.notificationTitle}>
                        {notification.title}
                      </Text>
                      {!notification.is_read && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTimeAgo(notification.created_at)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => deleteNotification(notification.id)}
                  style={styles.deleteButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingsButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  actionButtonTextDanger: {
    color: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  notificationsList: {
    paddingVertical: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  notificationCardUnread: {
    backgroundColor: '#EFF6FF',
  },
  notificationContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationsScreen;
