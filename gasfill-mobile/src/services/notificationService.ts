import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Request notification permissions and register for push notifications
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token - permission denied');
        return null;
      }

      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Replace with your Expo project ID
      });

      this.expoPushToken = tokenData.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });

        // Create channel for order updates
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Order Updates',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
        });

        // Create channel for chat messages
        await Notifications.setNotificationChannelAsync('chat', {
          name: 'Chat Messages',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#4A90E2',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to backend
   */
  async savePushToken(token: string): Promise<boolean> {
    try {
      await api.post('/api/notifications/register-token', {
        push_token: token,
        device_type: Platform.OS,
      });
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  }

  /**
   * Remove push token from backend (on logout)
   */
  async removePushToken(): Promise<boolean> {
    try {
      if (this.expoPushToken) {
        await api.post('/api/notifications/remove-token', {
          push_token: this.expoPushToken,
        });
      }
      return true;
    } catch (error) {
      console.error('Error removing push token:', error);
      return false;
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Add notification response listener
   */
  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Add notification received listener (when app is in foreground)
   */
  addNotificationReceivedListener(
    callback: (notification: Notifications.Notification) => void
  ) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: any,
    delay: number = 0
  ): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: delay > 0 ? { seconds: delay } : null,
    });

    return notificationId;
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await Notifications.setBadgeCountAsync(0);
  }
}

export default new NotificationService();
