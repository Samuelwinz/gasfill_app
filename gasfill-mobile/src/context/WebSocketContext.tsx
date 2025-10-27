/**
 * WebSocket Context for Real-time Updates
 * Provides WebSocket connection and event handling throughout the app
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWebSocketService, resetWebSocketService, WebSocketService } from '../services/websocket';

// WebSocket server URL - update to match your backend
const WS_URL = 'ws://192.168.1.25:8000/ws';

// Storage keys - must match what AuthContext uses
const TOKEN_KEY = 'gasfill_token_v1';
const USER_ROLE_KEY = 'userRole';

interface WebSocketContextData {
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  send: (type: string, data?: any) => void;
}

const WebSocketContext = createContext<WebSocketContextData>({} as WebSocketContextData);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const subscribersRef = useRef<Map<string, Set<(data: any) => void>>>(new Map());

  /**
   * Initialize WebSocket service
   */
  const initWebSocket = useCallback(async () => {
    if (wsServiceRef.current) {
      return wsServiceRef.current;
    }

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    
    const service = getWebSocketService({
      url: WS_URL,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      pingInterval: 30000,
    });

    service.setAuthToken(token);
    wsServiceRef.current = service;

    // Set up connection status listeners
    service.on('connected', () => {
      console.log('[WebSocketContext] Connected to server');
      setIsConnected(true);
    });

    service.on('disconnected', () => {
      console.log('[WebSocketContext] Disconnected from server');
      setIsConnected(false);
    });

    service.on('error', ({ error }) => {
      console.error('[WebSocketContext] Error:', error);
    });

    service.on('max_reconnects_reached', () => {
      console.error('[WebSocketContext] Max reconnect attempts reached');
      setIsConnected(false);
    });

    return service;
  }, []);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    try {
      const service = await initWebSocket();
      await service.connect();
    } catch (error) {
      console.error('[WebSocketContext] Connection failed:', error);
      throw error;
    }
  }, [initWebSocket]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (wsServiceRef.current) {
      wsServiceRef.current.disconnect();
      wsServiceRef.current = null;
      resetWebSocketService();
      setIsConnected(false);
    }
  }, []);

  /**
   * Subscribe to WebSocket events
   */
  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    // Add to local subscribers map
    if (!subscribersRef.current.has(event)) {
      subscribersRef.current.set(event, new Set());
    }
    subscribersRef.current.get(event)?.add(callback);

    // Subscribe to WebSocket service
    const unsubscribe = wsServiceRef.current?.on(event, callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current.get(event)?.delete(callback);
      if (subscribersRef.current.get(event)?.size === 0) {
        subscribersRef.current.delete(event);
      }
      unsubscribe?.();
    };
  }, []);

  /**
   * Send message to WebSocket server
   */
  const send = useCallback((type: string, data?: any) => {
    if (wsServiceRef.current?.isConnected) {
      wsServiceRef.current.send({
        type: type as any,
        data,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.warn('[WebSocketContext] Cannot send message - not connected');
    }
  }, []);

  /**
   * Auto-connect on mount if user is authenticated
   */
  useEffect(() => {
    let isMounted = true;

    const autoConnect = async () => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        const userRole = await AsyncStorage.getItem(USER_ROLE_KEY);
        
        // Only auto-connect for riders (they need real-time updates)
        if (token && userRole === 'rider' && isMounted) {
          console.log('[WebSocketContext] Auto-connecting for rider...');
          const service = await initWebSocket();
          await service.connect();
        }
      } catch (error) {
        console.error('[WebSocketContext] Auto-connect failed:', error);
      }
    };

    autoConnect();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (wsServiceRef.current) {
        wsServiceRef.current.disconnect();
        wsServiceRef.current = null;
        resetWebSocketService();
      }
    };
  }, []); // Empty deps - only run once on mount

  /**
   * Update token when it changes
   */
  useEffect(() => {
    const updateToken = async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      wsServiceRef.current?.setAuthToken(token);
    };

    // Listen for storage changes
    const interval = setInterval(updateToken, 5000);

    return () => clearInterval(interval);
  }, []);

  const value: WebSocketContextData = {
    isConnected,
    connect,
    disconnect,
    subscribe,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

/**
 * Hook to use WebSocket context
 */
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  
  return context;
};

/**
 * Hook to subscribe to specific WebSocket events
 */
export const useWebSocketEvent = (event: string, callback: (data: any) => void) => {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
};

/**
 * Hook for rider-specific real-time updates
 */
export const useRiderUpdates = (callbacks: {
  onNewOrder?: (data: any) => void;
  onOrderStatusUpdate?: (data: any) => void;
  onEarningsUpdate?: (data: any) => void;
}) => {
  const { subscribe } = useWebSocket();
  
  // Use refs to avoid re-subscribing when callbacks change
  const callbacksRef = useRef(callbacks);
  
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    if (callbacksRef.current.onNewOrder) {
      unsubscribers.push(subscribe('new_order_assigned', (data) => callbacksRef.current.onNewOrder?.(data)));
    }

    if (callbacksRef.current.onOrderStatusUpdate) {
      unsubscribers.push(subscribe('order_status_updated', (data) => callbacksRef.current.onOrderStatusUpdate?.(data)));
    }

    if (callbacksRef.current.onEarningsUpdate) {
      unsubscribers.push(subscribe('earnings_updated', (data) => callbacksRef.current.onEarningsUpdate?.(data)));
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe]); // Only re-subscribe if subscribe function changes
};
