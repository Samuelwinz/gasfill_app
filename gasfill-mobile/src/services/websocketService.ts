/**
 * WebSocket Service for Real-Time Order Tracking
 * Connects to backend WebSocket server to receive live updates
 */

type MessageHandler = (data: any) => void;
type ConnectionStatusHandler = (connected: boolean) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000; // 3 seconds
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private connectionStatusHandlers: ConnectionStatusHandler[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private baseUrl: string;

  constructor() {
    // Default to localhost, update based on environment
    this.baseUrl = __DEV__ 
      ? 'ws://localhost:8000/ws' 
      : 'wss://your-production-server.com/ws';
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      const url = `${this.baseUrl}?user_id=${userId}`;
      console.log('Connecting to WebSocket:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus(true);
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('⚠️ WebSocket connection failed (backend may not be running)');
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyConnectionStatus(false);
        this.stopHeartbeat();
        this.attemptReconnect(userId);
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.attemptReconnect(userId);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
  }

  /**
   * Subscribe to specific message type
   */
  subscribe(eventType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType)?.push(handler);
  }

  /**
   * Unsubscribe from message type
   */
  unsubscribe(eventType: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  onConnectionChange(handler: ConnectionStatusHandler) {
    this.connectionStatusHandlers.push(handler);
  }

  /**
   * Send message to server
   */
  send(message: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  /**
   * Subscribe to order updates
   */
  subscribeToOrder(orderId: string) {
    this.send({
      type: 'subscribe',
      order_id: orderId,
    });
  }

  /**
   * Unsubscribe from order updates
   */
  unsubscribeFromOrder(orderId: string) {
    this.send({
      type: 'unsubscribe',
      order_id: orderId,
    });
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  private handleMessage(data: any) {
    const { type } = data;
    const handlers = this.messageHandlers.get(type) || [];
    handlers.forEach(handler => handler(data));

    // Also notify 'all' handlers
    const allHandlers = this.messageHandlers.get('all') || [];
    allHandlers.forEach(handler => handler(data));
  }

  private notifyConnectionStatus(connected: boolean) {
    this.connectionStatusHandlers.forEach(handler => handler(connected));
  }

  private attemptReconnect(userId: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('⚠️ Max WebSocket reconnect attempts reached. Real-time features disabled.');
      console.log('💡 Tip: Start backend WebSocket server for real-time tracking.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`Attempting WebSocket reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect(userId);
    }, delay);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// Export singleton instance
export default new WebSocketService();
