# Backend Chat API Implementation Guide

## Overview
The mobile app's chat system is now ready and waiting for backend API endpoints. Currently, it gracefully falls back to mock data when the endpoints aren't available.

## Current Status
✅ **Mobile App**: Fully implemented with WebSocket support, typing indicators, and read receipts  
⚠️ **Backend APIs**: Not yet implemented (app uses mock data as fallback)  
⚠️ **WebSocket Events**: Backend sends non-JSON messages that need to be handled

## Required API Endpoints

### 1. Get or Create Chat Room
**Endpoint**: `POST /api/chat/rooms`

**Request**:
```json
{
  "order_id": 123,
  "user_id": 456,
  "user_type": "customer" | "rider"
}
```

**Response** (200):
```json
{
  "id": "room_123",
  "order_id": 123,
  "customer_id": 456,
  "customer_name": "John Doe",
  "customer_avatar": "https://...",
  "rider_id": 789,
  "rider_name": "Mike Rider",
  "rider_avatar": "https://...",
  "last_message": "Hello!",
  "last_message_time": "2025-10-27T12:00:00Z",
  "unread_count": 0,
  "status": "active",
  "created_at": "2025-10-27T10:00:00Z",
  "updated_at": "2025-10-27T12:00:00Z"
}
```

**Business Logic**:
- Check if chat room exists for this order_id
- If exists, return existing room
- If not, create new room with both customer and rider
- Link room to the order
- Set initial status as "active"

---

### 2. Get Message History
**Endpoint**: `GET /api/chat/rooms/{chatRoomId}/messages`

**Query Parameters**:
- `limit` (optional): Number of messages to return (default: 50)
- `offset` (optional): Pagination offset (default: 0)

**Response** (200):
```json
[
  {
    "id": "msg_1",
    "chat_room_id": "room_123",
    "sender_id": 456,
    "sender_type": "customer",
    "sender_name": "John Doe",
    "message": "Hello!",
    "message_type": "text",
    "is_read": true,
    "is_delivered": true,
    "created_at": "2025-10-27T12:00:00Z",
    "read_at": "2025-10-27T12:01:00Z"
  }
]
```

**Business Logic**:
- Verify user has access to this chat room
- Return messages in chronological order
- Include pagination support
- Return empty array if no messages

---

### 3. Send Message (HTTP Fallback)
**Endpoint**: `POST /api/chat/messages`

**Request**:
```json
{
  "chat_room_id": "room_123",
  "sender_id": 456,
  "sender_type": "customer",
  "sender_name": "John Doe",
  "message": "Hello!",
  "message_type": "text",
  "is_read": false
}
```

**Optional Fields** (for rich media):
```json
{
  "image_url": "https://...",  // For image messages
  "location": {                 // For location messages
    "latitude": 6.5244,
    "longitude": 3.3792,
    "address": "123 Main St"
  }
}
```

**Response** (201):
```json
{
  "id": "msg_123",
  "chat_room_id": "room_123",
  "sender_id": 456,
  "sender_type": "customer",
  "sender_name": "John Doe",
  "message": "Hello!",
  "message_type": "text",
  "is_read": false,
  "is_delivered": false,
  "created_at": "2025-10-27T12:00:00Z"
}
```

**Business Logic**:
- Verify user has access to chat room
- Save message to database
- Set initial is_delivered = false, is_read = false
- Broadcast message via WebSocket to other participant
- Update chat room's last_message and last_message_time

---

### 4. Mark Messages as Read
**Endpoint**: `POST /api/chat/rooms/{chatRoomId}/read`

**Request**:
```json
{
  "message_ids": ["msg_1", "msg_2", "msg_3"]
}
```

**Response** (200):
```json
{
  "success": true
}
```

**Business Logic**:
- Verify user has access to chat room
- Update is_read = true for all message_ids
- Set read_at timestamp
- Send read receipt via WebSocket to sender
- Decrease unread_count in chat room

---

### 5. Upload Chat Image
**Endpoint**: `POST /api/chat/upload-image`

**Request**: FormData
- `image`: File (JPEG, PNG, max 5MB)
- `chat_room_id`: string

**Response** (200):
```json
{
  "image_url": "https://yourdomain.com/chat-images/abc123.jpg"
}
```

**Business Logic**:
- Validate file type (JPEG, PNG only)
- Validate file size (max 5MB)
- Compress image if needed
- Upload to storage (S3, local storage, etc.)
- Return public URL
- Delete after 30 days or when chat closed (optional)

---

### 6. Get User's Chat Rooms
**Endpoint**: `GET /api/chat/rooms`

**Query Parameters**:
- `user_id`: number (required)
- `user_type`: "customer" | "rider" (required)

**Response** (200):
```json
[
  {
    "id": "room_123",
    "order_id": 123,
    "customer_id": 456,
    "customer_name": "John Doe",
    "customer_avatar": "https://...",
    "rider_id": 789,
    "rider_name": "Mike Rider",
    "rider_avatar": "https://...",
    "last_message": "I'll be there soon",
    "last_message_time": "2025-10-27T12:30:00Z",
    "unread_count": 2,
    "status": "active",
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T12:30:00Z"
  }
]
```

**Business Logic**:
- Return all chat rooms for this user
- Order by last_message_time (most recent first)
- Include unread count
- Only return active rooms (optionally include closed)

---

### 7. Close Chat Room
**Endpoint**: `POST /api/chat/rooms/{chatRoomId}/close`

**Response** (200):
```json
{
  "success": true
}
```

**Business Logic**:
- Set status = "closed"
- Optionally archive messages
- Send notification to other participant
- Prevent new messages from being sent

---

## WebSocket Events

### Current Issue
The backend WebSocket is sending non-JSON messages (starting with "M") which the client can't parse. The client now logs and skips these messages.

**Fix Required**: Ensure all WebSocket messages are valid JSON.

### Client → Server Events

#### 1. Join Chat Room
```json
{
  "type": "chat_join_room",
  "data": {
    "chat_room_id": "room_123",
    "user_id": 456,
    "user_type": "customer"
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 2. Leave Chat Room
```json
{
  "type": "chat_leave_room",
  "data": {
    "chat_room_id": "room_123",
    "user_id": 456
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 3. Send Message
```json
{
  "type": "chat_send_message",
  "data": {
    "chat_room_id": "room_123",
    "sender_id": 456,
    "sender_type": "customer",
    "message": "Hello!",
    "message_type": "text"
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 4. Typing Start
```json
{
  "type": "chat_typing_start",
  "data": {
    "chat_room_id": "room_123",
    "user_id": 456,
    "user_type": "customer"
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 5. Typing Stop
```json
{
  "type": "chat_typing_stop",
  "data": {
    "chat_room_id": "room_123",
    "user_id": 456,
    "user_type": "customer"
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 6. Mark Messages Read
```json
{
  "type": "chat_mark_read",
  "data": {
    "chat_room_id": "room_123",
    "message_ids": ["msg_1", "msg_2"],
    "user_id": 456
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 7. Message Delivered
```json
{
  "type": "chat_message_delivered",
  "data": {
    "chat_room_id": "room_123",
    "message_id": "msg_1",
    "user_id": 456
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

---

### Server → Client Events

#### 1. New Message
```json
{
  "type": "chat_message",
  "data": {
    "id": "msg_123",
    "chat_room_id": "room_123",
    "sender_id": 789,
    "sender_type": "rider",
    "sender_name": "Mike Rider",
    "message": "I'm on my way!",
    "message_type": "text",
    "is_read": false,
    "is_delivered": true,
    "created_at": "2025-10-27T12:00:00Z"
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 2. Typing Indicator
```json
{
  "type": "chat_typing",
  "data": {
    "chat_room_id": "room_123",
    "user_id": 789,
    "user_type": "rider",
    "is_typing": true
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 3. Messages Read
```json
{
  "type": "chat_messages_read",
  "data": {
    "message_ids": ["msg_1", "msg_2"]
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 4. Messages Delivered
```json
{
  "type": "chat_messages_delivered",
  "data": {
    "message_ids": ["msg_1", "msg_2"]
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

#### 5. User Status
```json
{
  "type": "chat_user_status",
  "data": {
    "user_id": 789,
    "is_online": true
  },
  "timestamp": "2025-10-27T12:00:00Z"
}
```

---

## Database Schema Suggestions

### chat_rooms Table
```sql
CREATE TABLE chat_rooms (
  id VARCHAR(50) PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  customer_id INTEGER REFERENCES users(id),
  rider_id INTEGER REFERENCES users(id),
  last_message TEXT,
  last_message_time TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id)
);
```

### chat_messages Table
```sql
CREATE TABLE chat_messages (
  id VARCHAR(50) PRIMARY KEY,
  chat_room_id VARCHAR(50) REFERENCES chat_rooms(id),
  sender_id INTEGER REFERENCES users(id),
  sender_type VARCHAR(20),
  sender_name VARCHAR(100),
  message TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  image_url TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  location_address TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  INDEX idx_chat_room (chat_room_id),
  INDEX idx_created_at (created_at)
);
```

### chat_participants Table (Optional - for group chats)
```sql
CREATE TABLE chat_participants (
  id SERIAL PRIMARY KEY,
  chat_room_id VARCHAR(50) REFERENCES chat_rooms(id),
  user_id INTEGER REFERENCES users(id),
  user_type VARCHAR(20),
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(chat_room_id, user_id)
);
```

---

## Testing the Implementation

### 1. Test with Mock Data (Current State)
The mobile app currently works with mock data. You should see:
- ✅ Chat screen opens successfully
- ✅ Mock messages are displayed
- ✅ You can type messages (stored locally only)
- ✅ WebSocket connects (but skips non-JSON messages)
- ⚠️ Messages don't persist or sync across devices

### 2. Test with Real API
Once you implement the endpoints:
1. Test creating a chat room from an order
2. Test sending messages via HTTP
3. Test WebSocket message broadcasting
4. Test typing indicators
5. Test read receipts
6. Test delivery receipts
7. Test image upload
8. Test with multiple devices/users

### 3. Test Checklist
- [ ] Chat room creation
- [ ] Message history loading
- [ ] Sending text messages
- [ ] Real-time message delivery
- [ ] Typing indicators (both directions)
- [ ] Read receipts
- [ ] Delivery receipts
- [ ] Online/offline status
- [ ] Image upload and display
- [ ] Location sharing
- [ ] Chat room closure
- [ ] Unread message count
- [ ] Message persistence
- [ ] Multiple concurrent chats

---

## Error Handling

The mobile app handles these scenarios gracefully:

1. **API Unavailable**: Falls back to mock data
2. **WebSocket Disconnected**: Falls back to HTTP for sending messages
3. **Non-JSON WebSocket Messages**: Logs and skips them
4. **Network Errors**: Shows error messages, retries connection
5. **Empty Chat**: Shows helpful empty state

---

## Security Considerations

### Required Validations:
1. ✅ Verify user authentication (Bearer token)
2. ✅ Verify user has access to chat room (is participant)
3. ✅ Validate message content (XSS prevention)
4. ✅ Rate limiting (prevent spam)
5. ✅ Image file type validation
6. ✅ File size limits
7. ✅ Sanitize user inputs
8. ✅ Encrypt messages at rest (optional)

### Access Control:
- Only participants of a chat room can read messages
- Only participants can send messages
- Only sender can delete their own messages (if implemented)
- Verify order ownership before creating chat room

---

## Performance Optimization

1. **Pagination**: Implement message pagination (already supported in mobile app)
2. **Indexing**: Add database indexes on chat_room_id and created_at
3. **Caching**: Cache recent messages in Redis
4. **Connection Pooling**: Reuse database connections
5. **Image Compression**: Compress images before storage
6. **CDN**: Use CDN for image delivery

---

## Next Steps

### Phase 1: Basic Chat (Priority: HIGH)
1. ✅ Implement `POST /api/chat/rooms`
2. ✅ Implement `GET /api/chat/rooms/{id}/messages`
3. ✅ Implement `POST /api/chat/messages`
4. ✅ Fix WebSocket JSON formatting
5. ✅ Implement basic WebSocket message broadcasting

### Phase 2: Real-Time Features (Priority: MEDIUM)
1. ⬜ Implement typing indicator events
2. ⬜ Implement read receipt events
3. ⬜ Implement delivery receipt events
4. ⬜ Implement online/offline status

### Phase 3: Rich Media (Priority: LOW)
1. ⬜ Implement image upload endpoint
2. ⬜ Implement location sharing
3. ⬜ Implement push notifications

### Phase 4: Advanced Features (Priority: LOW)
1. ⬜ Message editing
2. ⬜ Message deletion
3. ⬜ Message reactions
4. ⬜ Voice messages
5. ⬜ File attachments

---

## Support

If you need help implementing any of these endpoints or have questions about the mobile app's expectations, please refer to:
- **Mobile Implementation**: `gasfill-mobile/CHAT_SYSTEM_IMPLEMENTATION.md`
- **Chat Service**: `gasfill-mobile/src/services/chat.ts`
- **WebSocket Hook**: `gasfill-mobile/src/hooks/useChatWebSocket.ts`
- **ChatScreen**: `gasfill-mobile/src/screens/ChatScreen.tsx`
