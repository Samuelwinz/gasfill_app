/**
 * WebSocket Service for Real-time Updates
 * Handles connection, reconnection, and event management
 */

export interface WebSocketMessage {
  type: 
    | 'new_order_assigned' 
    | 'order_status_updated' 
    | 'earnings_updated' 
    | 'rider_location_updated' 
    | 'rider_location_update'  // Client -> Server
    | 'rider_location'         // Server -> Client
    | 'ping' 
    | 'pong'
    | 'chat_message'
    | 'chat_typing'
    | 'chat_join_room'
    | 'chat_leave_room'
    | 'chat_mark_read'
    | 'chat_message_delivered'
    | 'chat_typing_start'
    | 'chat_typing_stop'
    | 'chat_send_message';
  data?: any;
  timestamp?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
}

type EventCallback = (data: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private shouldReconnect = true;
  private authToken: string | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      pingInterval: config.pingInterval || 30000,
    };
  }

  /**
   * Set authentication token for WebSocket connection
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;
      this.shouldReconnect = true;

      try {
        // Build WebSocket URL with auth token if available
        const wsUrl = this.authToken 
          ? `${this.config.url}?token=${this.authToken}`
          : this.config.url;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.emit('connected', {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          // Skip non-JSON messages (like ping/pong or server info messages)
          if (typeof event.data !== 'string') {
            return;
          }
          
          const dataStr = event.data.trim();
          if (!dataStr || !dataStr.startsWith('{')) {
            // Silently ignore non-JSON messages (server info, ping/pong, etc.)
            return;
          }
          
          try {
            const message: WebSocketMessage = JSON.parse(dataStr);
            this.handleMessage(message);
          } catch (error) {
            // Only log parse errors for messages that looked like JSON
            console.warn('[WebSocket] Failed to parse JSON message:', dataStr.substring(0, 100));
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          this.emit('error', { error });
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected');
          this.isConnecting = false;
          this.stopPingInterval();
          this.emit('disconnected', {});

          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        console.error('[WebSocket] Connection failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.shouldReconnect = false;
    this.stopPingInterval();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message to WebSocket server
   */
  send(message: WebSocketMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(event, callback);
    };
  }

  /**
   * Unsubscribe from WebSocket events
   */
  off(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(message: WebSocketMessage) {
    console.log('[WebSocket] 🔔 RAW MESSAGE:', JSON.stringify(message, null, 2));

    // Handle pong response
    if (message.type === 'pong') {
      return;
    }

    console.log('[WebSocket] 📢 EMITTING EVENT:', message.type, 'with data:', message.data);
    
    // Emit specific event type
    this.emit(message.type, message.data);
    
    // Emit generic message event
    this.emit('message', message);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      this.emit('max_reconnects_reached', {});
      return;
    }

    this.clearReconnectTimer();
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnect failed:', error);
      });
    }, delay);
  }

  /**
   * Clear reconnect timer
   */
  private clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval() {
    this.stopPingInterval();
    
    this.pingTimer = setInterval(() => {
      this.send({ type: 'ping', timestamp: new Date().toISOString() });
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get ready state
   */
  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

// Export singleton instance
let wsInstance: WebSocketService | null = null;

export const getWebSocketService = (config?: WebSocketConfig): WebSocketService => {
  if (!wsInstance && config) {
    wsInstance = new WebSocketService(config);
  }
  
  if (!wsInstance) {
    throw new Error('WebSocket service not initialized. Call with config first.');
  }
  
  return wsInstance;
};

export const resetWebSocketService = () => {
  if (wsInstance) {
    wsInstance.disconnect();
    wsInstance = null;
  }
};
