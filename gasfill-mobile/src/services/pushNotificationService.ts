/**
 * Push Notification Service
 * Handles push notifications for order status updates
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api';

const PUSH_TOKEN_KEY = '@push_token';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * Initialize push notifications
   */
  async initialize() {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications require a physical device (not available in simulator)');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permissions not granted');
        return null;
      }

      // Get push token
      const token = await this.getPushToken();
      
      if (token) {
        console.log('✅ Push notifications initialized with remote push');
        // Register token with backend
        await this.registerTokenWithBackend(token);
      } else {
        console.log('✅ Push notifications initialized (local notifications only)');
      }
      
      // Set up listeners regardless of token
      this.setupListeners();

      return token;
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
      return null;
    }
  }

  /**
   * Get Expo push token
   */
  private async getPushToken(): Promise<string | null> {
    try {
      // Check if running on physical device
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications require a physical device');
        return null;
      }

      // Check cache first
      const cachedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (cachedToken) {
        this.expoPushToken = cachedToken;
        console.log('✅ Using cached push token');
        return cachedToken;
      }

      // Try to get new token (requires projectId in production)
      // For development without projectId, we'll skip remote push and use local only
      try {
        // Get projectId from app.json
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        const token = tokenData.data;

        // Cache token
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        this.expoPushToken = token;

        console.log('✅ Expo push token obtained:', token.substring(0, 20) + '...');
        return token;
      } catch (tokenError: any) {
        // If project ID is missing, that's ok - we can still use local notifications
        if (tokenError.message?.includes('projectId')) {
          console.log('⚠️ No project ID configured - using local notifications only');
          console.log('💡 Add "projectId" to app.json extra.eas config for remote push notifications');
          return null;
        }
        throw tokenError;
      }
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      console.log('💡 Push notifications will work with local notifications only');
      return null;
    }
  }

  /**
   * Register token with backend
   */
  private async registerTokenWithBackend(token: string) {
    try {
      await ApiService.registerPushToken(token, Platform.OS);
      console.log('✅ Push token registered with backend');
    } catch (error) {
      console.error('❌ Error registering push token with backend:', error);
      // Don't throw - local notifications will still work
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners() {
    // Listen for notifications received while app is open
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        this.handleNotification(notification);
      }
    );

    // Listen for notification tap
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        this.handleNotificationTap(response);
      }
    );
  }

  /**
   * Handle incoming notification
   */
  private handleNotification(notification: Notifications.Notification) {
    const { data } = notification.request.content;
    console.log('Notification data:', data);

    // You can update app state based on notification data
    // For example, refresh orders if order status changed
  }

  /**
   * Handle notification tap
   */
  private handleNotificationTap(response: Notifications.NotificationResponse) {
    const { data } = response.notification.request.content;
    
    // Navigate to relevant screen based on notification data
    if (data.orderId) {
      // Navigate to order tracking screen
      // navigation.navigate('DeliveryTracking', { orderId: data.orderId });
      console.log('Should navigate to order:', data.orderId);
    }
  }

  /**
   * Send local notification (for testing)
   */
  async sendLocalNotification(
    title: string,
    body: string,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Schedule local notification
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerSeconds: number,
    data?: any
  ) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: triggerSeconds,
        repeats: false,
      },
    });
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications() {
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
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Clear badge
   */
  async clearBadge() {
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }
    if (this.responseListener) {
      this.responseListener.remove();
    }
  }

  /**
   * Predefined notification templates for order updates
   */
  async notifyOrderStatusChange(orderId: string, status: string) {
    const notifications: { [key: string]: { title: string; body: string } } = {
      assigned: {
        title: '👤 Rider Assigned!',
        body: `A rider has been assigned to your order #${orderId}`,
      },
      pickup: {
        title: '📦 Rider Picking Up',
        body: `Your rider is picking up your order #${orderId}`,
      },
      picked_up: {
        title: '✅ Order Picked Up',
        body: `Your order #${orderId} has been picked up and is on the way!`,
      },
      in_transit: {
        title: '🚴 On the Way!',
        body: `Your order #${orderId} is on the way to you!`,
      },
      delivered: {
        title: '🎉 Delivered!',
        body: `Your order #${orderId} has been delivered. Enjoy!`,
      },
    };

    const notification = notifications[status];
    if (notification) {
      await this.sendLocalNotification(
        notification.title,
        notification.body,
        { orderId, status }
      );
    }
  }
}

export default new PushNotificationService();
