# WebSocket Real-time Updates - Implementation Guide

## Overview
The GasFill app now includes WebSocket support for real-time updates, enabling instant notifications for riders when new orders are assigned, order statuses change, or earnings are updated.

## Architecture

### Components
1. **WebSocket Service** (`src/services/websocket.ts`)
   - Low-level WebSocket connection management
   - Auto-reconnection with exponential backoff
   - Keep-alive ping/pong mechanism
   - Event subscription system

2. **WebSocket Context** (`src/context/WebSocketContext.tsx`)
   - React context provider for app-wide WebSocket access
   - Automatic connection for authenticated riders
   - Convenient hooks for event subscription
   - Token management integration

3. **Screen Integrations**
   - `RiderDashboard.tsx`: Real-time stats updates
   - `RiderJobsScreen.tsx`: New order notifications
   - `RiderEarningsScreen.tsx`: Live earnings updates

## WebSocket Endpoint

**URL:** `ws://192.168.1.25:8000/ws`

Connection includes authentication token as query parameter:
```
ws://192.168.1.25:8000/ws?token=<JWT_TOKEN>
```

## Event Types

### Client → Server
```typescript
{
  type: 'ping',
  timestamp: '2025-10-26T10:30:00.000Z'
}
```

### Server → Client

#### 1. New Order Assigned
Sent when a new order is assigned to the rider
```json
{
  "type": "new_order_assigned",
  "data": {
    "order_id": 123,
    "customer_name": "John Doe",
    "pickup_location": "123 Main St",
    "delivery_location": "456 Oak Ave",
    "items": [...],
    "delivery_fee": 15.00
  },
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

#### 2. Order Status Updated
Sent when any order's status changes
```json
{
  "type": "order_status_updated",
  "data": {
    "order_id": 123,
    "status": "in_transit",
    "updated_by": "rider",
    "timestamp": "2025-10-26T10:35:00.000Z"
  },
  "timestamp": "2025-10-26T10:35:00.000Z"
}
```

#### 3. Earnings Updated
Sent when rider completes a delivery
```json
{
  "type": "earnings_updated",
  "data": {
    "order_id": 123,
    "amount": 15.00,
    "today_earnings": 145.50,
    "total_earnings": 1250.00,
    "pending_earnings": 145.50,
    "timestamp": "2025-10-26T10:40:00.000Z"
  },
  "timestamp": "2025-10-26T10:40:00.000Z"
}
```

#### 4. Pong Response
Server response to ping (keep-alive)
```json
{
  "type": "pong",
  "timestamp": "2025-10-26T10:30:00.000Z"
}
```

## Usage Examples

### Basic Usage in Components

```typescript
import { useRiderUpdates } from '../context/WebSocketContext';

const MyComponent = () => {
  useRiderUpdates({
    onNewOrder: (data) => {
      console.log('New order!', data);
      // Show notification, refresh data, etc.
    },
    onOrderStatusUpdate: (data) => {
      console.log('Order status changed:', data);
      // Update UI accordingly
    },
    onEarningsUpdate: (data) => {
      console.log('Earnings updated:', data);
      // Update earnings display
    },
  });

  // Rest of component...
};
```

### Manual Event Subscription

```typescript
import { useWebSocket, useWebSocketEvent } from '../context/WebSocketContext';

const MyComponent = () => {
  const { isConnected, send } = useWebSocket();

  // Subscribe to specific event
  useWebSocketEvent('new_order_assigned', (data) => {
    Alert.alert('New Order!', `Order #${data.order_id} assigned`);
  });

  // Send custom message
  const sendMessage = () => {
    send('custom_event', { key: 'value' });
  };

  return (
    <View>
      <Text>Connected: {isConnected ? 'Yes' : 'No'}</Text>
    </View>
  );
};
```

### Connection Management

```typescript
import { useWebSocket } from '../context/WebSocketContext';

const MyComponent = () => {
  const { connect, disconnect, isConnected } = useWebSocket();

  const handleConnect = async () => {
    try {
      await connect();
      console.log('Connected!');
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    console.log('Disconnected!');
  };

  // ...
};
```

## Configuration

### WebSocket Service Configuration

Located in `src/context/WebSocketContext.tsx`:

```typescript
const service = getWebSocketService({
  url: WS_URL,                     // WebSocket server URL
  reconnectInterval: 3000,         // Initial reconnect delay (ms)
  maxReconnectAttempts: 10,        // Max reconnection attempts
  pingInterval: 30000,             // Keep-alive ping interval (ms)
});
```

### Auto-connect Logic

The WebSocket automatically connects when:
- User is authenticated (has valid token)
- User role is 'rider'

Connection is established in the WebSocketContext provider's `useEffect` on mount.

## Connection States

### Connection Lifecycle
1. **CONNECTING** - Attempting to establish connection
2. **OPEN** - Connected and ready to send/receive
3. **CLOSING** - Gracefully shutting down
4. **CLOSED** - Disconnected

### Reconnection Strategy

Uses exponential backoff:
```
Attempt 1: 3 seconds
Attempt 2: 6 seconds
Attempt 3: 12 seconds
Attempt 4: 24 seconds
...
Max: 30 seconds
```

After 10 failed attempts, stops trying and emits `max_reconnects_reached` event.

## Error Handling

### Connection Errors
```typescript
service.on('error', ({ error }) => {
  console.error('WebSocket error:', error);
  // Handle error (show notification, retry, etc.)
});
```

### Max Reconnects Reached
```typescript
service.on('max_reconnects_reached', () => {
  console.error('Cannot connect to server');
  // Show persistent error message
  // Offer manual retry option
});
```

### Message Parse Errors
Handled internally - logged to console but don't crash the app.

## Testing WebSocket Events

### Using Browser/Postman
Not recommended - requires WebSocket client and proper authentication.

### Backend Testing
The backend should implement event emission at appropriate points:

**Example: New Order Assignment**
```python
# In python_server.py after order assignment
await manager.send_personal_message(
    json.dumps({
        "type": "new_order_assigned",
        "data": order_data,
        "timestamp": datetime.utcnow().isoformat()
    }),
    rider_websocket
)
```

**Example: Earnings Update**
```python
# After order completion
await manager.send_personal_message(
    json.dumps({
        "type": "earnings_updated",
        "data": {
            "order_id": order.id,
            "amount": delivery_fee,
            "today_earnings": rider.today_earnings,
            "total_earnings": rider.total_earnings
        },
        "timestamp": datetime.utcnow().isoformat()
    }),
    rider_websocket
)
```

## Performance Considerations

### Message Size
- Keep messages lightweight (< 1KB recommended)
- Only send necessary data
- Use JSON serialization

### Ping Interval
- Default: 30 seconds
- Too frequent = unnecessary traffic
- Too infrequent = delayed disconnect detection

### Reconnection
- Exponential backoff prevents server overload
- Max 30-second delay prevents long waits
- 10 attempts balance persistence vs. resource usage

## Security

### Authentication
- JWT token passed as query parameter
- Backend must validate token before accepting connection
- Token refresh not automatic - reconnect with new token

### Data Validation
- Always validate incoming message format
- Use TypeScript types for type safety
- Sanitize data before displaying to user

### Connection Security
- Use WSS (WebSocket Secure) in production
- Current: `ws://` for development
- Production: `wss://gasfill.app/ws`

## Troubleshooting

### Connection Fails Immediately
- Check server URL is correct
- Verify server is running
- Ensure WebSocket endpoint exists
- Check firewall settings

### Frequent Disconnections
- Increase ping interval
- Check network stability
- Verify server keep-alive settings

### Events Not Received
- Confirm subscription is active
- Check event type matches exactly
- Verify backend is sending events
- Enable console logging for debugging

### Token Errors
- Ensure token is valid and not expired
- Check token is correctly passed to setAuthToken()
- Verify backend validates token properly

## Future Enhancements

### Planned Features
- [ ] Message queuing for offline events
- [ ] Event persistence (store missed events)
- [ ] Push notification integration
- [ ] Binary message support (for images/files)
- [ ] Room/channel support (group updates)
- [ ] Compression for large messages

### Backend Enhancements
- [ ] Per-rider WebSocket rooms
- [ ] Order assignment push events
- [ ] Rider location broadcast
- [ ] Customer-rider chat via WebSocket
- [ ] Admin broadcast messages

## Related Files

```
src/
├── services/
│   └── websocket.ts              # WebSocket service class
├── context/
│   └── WebSocketContext.tsx      # React context & hooks
└── screens/
    ├── RiderDashboard.tsx        # Dashboard real-time updates
    ├── RiderJobsScreen.tsx       # New order notifications
    └── RiderEarningsScreen.tsx   # Earnings real-time updates

App.tsx                           # WebSocket provider integration
```

## API Reference

### WebSocket Service

#### Methods
- `connect(): Promise<void>` - Establish connection
- `disconnect(): void` - Close connection
- `send(message: WebSocketMessage): void` - Send message
- `on(event: string, callback: Function): Function` - Subscribe to event
- `off(event: string, callback: Function): void` - Unsubscribe
- `setAuthToken(token: string | null): void` - Update auth token

#### Properties
- `isConnected: boolean` - Connection status
- `readyState: number` - WebSocket ready state

### WebSocket Context Hooks

#### `useWebSocket()`
Returns: `{ isConnected, connect, disconnect, subscribe, send }`

#### `useWebSocketEvent(event, callback)`
Subscribe to specific event (auto-cleanup on unmount)

#### `useRiderUpdates(callbacks)`
Convenience hook for rider-specific events:
- `onNewOrder`
- `onOrderStatusUpdate`
- `onEarningsUpdate`

## Conclusion

The WebSocket implementation provides a robust foundation for real-time features in the GasFill app. It handles connection management, authentication, auto-reconnection, and provides convenient hooks for React components to subscribe to events.

For questions or issues, refer to the troubleshooting section or check the console logs for detailed WebSocket activity.
