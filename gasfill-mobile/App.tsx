import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
// import * as Notifications from 'expo-notifications';
import AuthNavigation from './src/components/AuthNavigation';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WebSocketProvider } from './src/context/WebSocketContext';
// import notificationService from './src/services/notificationService';

export default function App() {
  // const notificationListener = useRef<Notifications.Subscription | null>(null);
  // const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // TEMPORARILY DISABLED: Push notifications causing build issues
    // TODO: Re-enable after fixing expo-notifications dependency
    /*
    // Register for push notifications
    notificationService.registerForPushNotifications().then(token => {
      if (token) {
        console.log('Push notification token:', token);
        // Token will be saved to backend after user logs in
      }
    });

    // Listen for notifications received while app is in foreground
    notificationListener.current = notificationService.addNotificationReceivedListener(
      notification => {
        console.log('Notification received:', notification);
      }
    );

    // Listen for user tapping on notification
    responseListener.current = notificationService.addNotificationResponseListener(
      response => {
        console.log('Notification response:', response);
        const data = response.notification.request.content.data;
        
        // Handle notification tap based on type
        if (data.type === 'order_update') {
          // Navigate to order details
          console.log('Navigate to order:', data.order_id);
        } else if (data.type === 'chat_message') {
          // Navigate to chat
          console.log('Navigate to chat:', data.chat_room_id);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
    */
  }, []);

  return (
    <AuthProvider>
      <WebSocketProvider>
        <CartProvider>
          <AuthNavigation />
          <StatusBar style="auto" />
        </CartProvider>
      </WebSocketProvider>
    </AuthProvider>
  );
}

