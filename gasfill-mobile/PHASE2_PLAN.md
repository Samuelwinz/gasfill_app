# Phase 2: Rider System & Real-time Features

## 🎯 Objectives
Transform GasFill into a complete delivery platform with rider management, real-time tracking, and live order updates.

## 📋 Current Status Assessment

### ✅ Already Implemented (From Phase 1)
- [x] Backend API on port 8000
- [x] User authentication (customer)
- [x] Product catalog
- [x] Shopping cart
- [x] Order creation
- [x] Order history
- [x] Demo mode fallback
- [x] Ghana Cedis (₵) currency

### 📱 Existing Screens (Need Integration)
- [x] `RiderDashboard.tsx` - Rider overview screen
- [x] `RiderJobsScreen.tsx` - Job management
- [x] `RiderEarningsScreen.tsx` - Earnings tracking
- [x] `DeliveryTrackingScreen.tsx` - Map-based tracking
- [x] `AdminDashboard.tsx` - Admin management

### 🔧 Needs Enhancement
- [ ] Real-time order updates (WebSocket)
- [ ] GPS location tracking
- [ ] Push notifications
- [ ] Order assignment algorithm
- [ ] Rider availability system
- [ ] Live map tracking for customers

---

## 📝 Phase 2 Tasks

### Task 1: Rider Authentication & Profile ✨
**Priority:** HIGH  
**Estimated Time:** 3-4 hours

#### Subtasks:
- [ ] Create `RiderRegistrationScreen.tsx`
- [ ] Add rider-specific fields (vehicle info, license, etc.)
- [ ] Implement document upload (ID, license, vehicle docs)
- [ ] Add rider login flow to `AuthContext`
- [ ] Update backend to support rider role
- [ ] Add rider profile management

**Files to Create:**
- `src/screens/RiderRegistrationScreen.tsx`
- `src/screens/RiderProfileScreen.tsx`

**Files to Update:**
- `src/context/AuthContext.tsx` (add rider auth)
- `src/services/api.ts` (add rider endpoints)
- `src/types/index.ts` (add Rider interface)

---

### Task 2: Order Assignment System 🎯
**Priority:** HIGH  
**Estimated Time:** 4-5 hours

#### Subtasks:
- [ ] Implement order assignment algorithm
- [ ] Create rider availability toggle
- [ ] Add order acceptance/rejection flow
- [ ] Implement auto-assignment for available riders
- [ ] Add order queue management
- [ ] Create notification for new orders

**Logic:**
```typescript
// Order Assignment Algorithm
1. Check rider availability (is_available = true)
2. Check rider capacity (current_orders < max_orders)
3. Calculate distance from rider to pickup location
4. Assign to nearest available rider
5. Send push notification to rider
6. Wait for acceptance (30 second timeout)
7. If rejected/timeout, assign to next rider
```

**Files to Create:**
- `src/services/orderAssignment.ts`
- `src/components/OrderAssignmentModal.tsx`

**Files to Update:**
- `src/screens/RiderDashboard.tsx` (add availability toggle)
- `src/screens/RiderJobsScreen.tsx` (add accept/reject)

---

### Task 3: Real-time Communication (WebSocket) 🔌
**Priority:** HIGH  
**Estimated Time:** 5-6 hours

#### Subtasks:
- [ ] Set up WebSocket client
- [ ] Connect to backend WebSocket server
- [ ] Implement order status updates
- [ ] Add location updates from rider
- [ ] Create real-time chat (rider ↔ customer)
- [ ] Handle connection errors and reconnection

**WebSocket Events:**
```typescript
// Client → Server
- 'rider_location_update' // GPS coordinates
- 'order_status_change' // Status updates
- 'message_send' // Chat messages

// Server → Client
- 'new_order_assigned' // New order for rider
- 'order_status_updated' // Customer sees updates
- 'rider_location' // Customer tracks rider
- 'message_received' // Chat messages
```

**Files to Create:**
- `src/services/websocket.ts`
- `src/hooks/useWebSocket.ts`
- `src/context/WebSocketContext.tsx`

**Files to Update:**
- `src/screens/DeliveryTrackingScreen.tsx` (add real-time updates)
- `src/screens/RiderJobsScreen.tsx` (add status updates)

---

### Task 4: GPS Location Tracking 📍
**Priority:** HIGH  
**Estimated Time:** 3-4 hours

#### Subtasks:
- [ ] Request location permissions
- [ ] Implement background location tracking (rider app)
- [ ] Send location updates via WebSocket
- [ ] Display rider location on customer map
- [ ] Calculate ETA based on distance
- [ ] Add route visualization on map

**Implementation:**
```typescript
// Rider sends location every 10 seconds
useEffect(() => {
  const locationInterval = startLocationTracking();
  return () => stopLocationTracking(locationInterval);
}, [isOnDelivery]);
```

**Files to Create:**
- `src/services/locationTracking.ts`
- `src/hooks/useLocationTracking.ts`

**Files to Update:**
- `src/screens/DeliveryTrackingScreen.tsx` (show live location)
- `src/screens/RiderJobsScreen.tsx` (track during delivery)

---

### Task 5: Push Notifications 🔔
**Priority:** MEDIUM  
**Estimated Time:** 4-5 hours

#### Subtasks:
- [ ] Set up Expo Push Notifications
- [ ] Request notification permissions
- [ ] Store push tokens in backend
- [ ] Send notifications for:
  - New order assigned (rider)
  - Order status change (customer)
  - Rider nearby (customer)
  - Delivery completed
- [ ] Add in-app notification center
- [ ] Implement notification preferences

**Notification Types:**
```typescript
// Rider Notifications
- "New order assigned! Tap to view"
- "Order #123 cancelled by customer"
- "Payment received for order #123"

// Customer Notifications
- "Your order is confirmed!"
- "Rider is on the way"
- "Rider is 5 minutes away"
- "Order delivered successfully"
```

**Files to Create:**
- `src/services/pushNotifications.ts`
- `src/screens/NotificationsScreen.tsx`
- `src/components/NotificationBadge.tsx`

**Files to Update:**
- `src/context/AuthContext.tsx` (register push token)
- `App.tsx` (initialize notifications)

---

### Task 6: Enhanced Rider Dashboard 📊
**Priority:** MEDIUM  
**Estimated Time:** 3-4 hours

#### Subtasks:
- [ ] Add availability toggle (Available/Offline)
- [ ] Show active orders count
- [ ] Display today's earnings
- [ ] Add order history for rider
- [ ] Show performance metrics
- [ ] Add quick actions (Navigate, Call customer)

**Dashboard Widgets:**
- Active Orders Count
- Today's Earnings
- Completed Deliveries
- Average Rating
- Available/Offline Toggle

**Files to Update:**
- `src/screens/RiderDashboard.tsx` (enhance UI)
- `src/screens/RiderEarningsScreen.tsx` (add real-time data)

---

### Task 7: Live Tracking for Customers 🗺️
**Priority:** MEDIUM  
**Estimated Time:** 3-4 hours

#### Subtasks:
- [ ] Show rider's live location on map
- [ ] Display delivery route
- [ ] Calculate and show ETA
- [ ] Add delivery progress timeline
- [ ] Show rider info (name, photo, rating, vehicle)
- [ ] Add contact rider button

**Timeline Steps:**
1. Order Confirmed ✅
2. Rider Assigned ✅
3. Pickup Complete ✅
4. On the Way 🚚 (current)
5. Delivered ⏳

**Files to Update:**
- `src/screens/DeliveryTrackingScreen.tsx` (add live updates)
- `src/screens/OrderDetailsScreen.tsx` (add tracking button)

---

### Task 8: Backend Enhancements 🔧
**Priority:** HIGH  
**Estimated Time:** 6-8 hours

#### Subtasks:
- [ ] Add WebSocket server (Socket.IO)
- [ ] Create rider endpoints (register, update profile)
- [ ] Implement order assignment API
- [ ] Add location tracking endpoints
- [ ] Create push notification service
- [ ] Add rider availability management
- [ ] Implement earnings calculation

**New API Endpoints:**
```
POST   /api/riders/register
POST   /api/riders/login
GET    /api/riders/profile
PUT    /api/riders/profile
POST   /api/riders/availability
GET    /api/riders/orders
POST   /api/riders/orders/:id/accept
POST   /api/riders/orders/:id/reject
PUT    /api/riders/orders/:id/status
POST   /api/riders/location
GET    /api/riders/earnings
```

**Files to Create (Backend):**
- `backend/src/controllers/riderController.js`
- `backend/src/routes/riders.js`
- `backend/src/services/websocket.js`
- `backend/src/services/orderAssignment.js`
- `backend/src/services/pushNotifications.js`

---

## 🚀 Implementation Order

### Week 1: Foundation
1. ✅ Set up Phase 2 plan
2. 🔨 **Task 8:** Backend enhancements (riders, WebSocket)
3. 🔨 **Task 1:** Rider authentication & profile
4. 🔨 **Task 6:** Enhanced rider dashboard

### Week 2: Real-time Features
5. 🔨 **Task 3:** WebSocket implementation
6. 🔨 **Task 4:** GPS location tracking
7. 🔨 **Task 7:** Live tracking for customers

### Week 3: Order Management
8. 🔨 **Task 2:** Order assignment system
9. 🔨 **Task 5:** Push notifications
10. 🎯 Testing & bug fixes

---

## 📊 Success Criteria

### Functional Requirements
- [ ] Riders can register and login
- [ ] Orders automatically assigned to available riders
- [ ] Riders receive push notifications for new orders
- [ ] Customers can track rider in real-time
- [ ] WebSocket connection stable and reconnects on failure
- [ ] Location updates every 10 seconds during delivery
- [ ] ETA calculated accurately

### Performance Requirements
- [ ] WebSocket latency < 100ms
- [ ] Location updates < 5 seconds delay
- [ ] Push notifications delivered within 3 seconds
- [ ] Map loads < 2 seconds
- [ ] Order assignment < 30 seconds

### User Experience
- [ ] Smooth map animations
- [ ] Clear delivery progress indicators
- [ ] Intuitive rider dashboard
- [ ] Easy order acceptance flow
- [ ] Reliable notification system

---

## 🧪 Testing Checklist

### Unit Tests
- [ ] Order assignment algorithm
- [ ] Location tracking service
- [ ] WebSocket connection handling
- [ ] Push notification service

### Integration Tests
- [ ] Rider registration → login → dashboard
- [ ] Order creation → assignment → tracking
- [ ] WebSocket events end-to-end
- [ ] Location updates → map rendering

### Manual Tests
- [ ] Test with 2 devices (rider + customer)
- [ ] Test offline/online scenarios
- [ ] Test with multiple orders
- [ ] Test notification delivery
- [ ] Test map performance

---

## 📚 Documentation Needed

- [ ] Rider onboarding guide
- [ ] API documentation for new endpoints
- [ ] WebSocket event documentation
- [ ] Push notification setup guide
- [ ] Testing guide for Phase 2

---

## 🔮 Future Enhancements (Phase 3+)

- Multi-stop deliveries
- Route optimization
- In-app chat with rich media
- Rider performance analytics
- Customer ratings and reviews
- Automated bonus calculations
- Heat maps for demand
- Predictive order assignment

---

## 💡 Technical Notes

### WebSocket Strategy
- Use Socket.IO for reliability
- Implement automatic reconnection
- Store messages in queue during offline
- Sync on reconnection

### Location Tracking
- Use Expo Location API
- Request background permissions
- Implement battery-efficient tracking
- Handle permission denials gracefully

### Push Notifications
- Use Expo Push Notifications
- Store tokens securely
- Handle notification taps
- Implement notification preferences

### State Management
- Add WebSocketContext for real-time data
- Use LocationContext for GPS data
- Implement notification state
- Cache rider availability status

---

**Phase 2 Start Date:** {Current Date}  
**Target Completion:** 3 weeks  
**Status:** Planning Complete ✅
