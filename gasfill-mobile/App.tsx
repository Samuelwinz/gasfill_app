import { StatusBar } from 'expo-status-bar';
import React from 'react';
import AuthNavigation from './src/components/AuthNavigation';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { WebSocketProvider } from './src/context/WebSocketContext';

export default function App() {
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
