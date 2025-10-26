# WebSocket & Phase 2 Testing Checklist

## 🧪 Test Environment Status

### Backend Server
- ✅ Running on http://192.168.1.25:8000
- ✅ WebSocket endpoint: ws://192.168.1.25:8000/ws
- ✅ WebSocket support confirmed (connection accepted)

### Frontend App
- ✅ Expo running on port 8082
- ✅ Can connect from iOS device at 192.168.1.25

### Test Accounts
```
Rider 1: rider1@gasfill.com / rider123
Rider 2: rider2@gasfill.com / rider123
Admin:   admin@gasfill.com / admin123
```

---

## 📋 Manual Testing Checklist

### 1. Rider Authentication
- [ ] Open app and navigate to Login screen
- [ ] Enter rider1@gasfill.com / rider123
- [ ] Verify successful login
- [ ] Verify redirect to Rider Dashboard (not Customer Dashboard)
- [ ] Check console logs for "Connected to WebSocket server"

**Expected WebSocket Log:**
```
[WebSocket] Connected
[WebSocketContext] Connected to server
[WebSocketContext] Auto-connecting for rider...
```

---

### 2. Rider Dashboard - Real-time Updates

#### Initial Load
- [ ] Dashboard loads successfully
- [ ] Today's earnings displayed
- [ ] Stats grid shows: Active Orders, Rating, Total Earnings, Deliveries
- [ ] Status toggle reflects current status
- [ ] No error messages

#### WebSocket Connection
- [ ] Check browser/expo console for WebSocket connection logs
- [ ] Look for: `[WebSocket] Connected`
- [ ] Verify ping/pong keep-alive messages every 30 seconds

#### Test Real-time Updates (Manual Backend Trigger)
To test, you would need to trigger backend events. For now, verify:
- [ ] Dashboard auto-refreshes when WebSocket `earnings_updated` received
- [ ] Stats update without manual refresh
- [ ] No UI freezing or errors

#### Status Toggle
- [ ] Toggle status to "Available" (green)
- [ ] Verify API call succeeds
- [ ] Toggle status to "Offline" (gray)
- [ ] Verify status persists on refresh

---

### 3. Rider Jobs Screen - New Order Notifications

#### Available Orders Tab
- [ ] Navigate to Jobs screen
- [ ] Select "Available Orders" tab
- [ ] Orders list loads (may be empty)
- [ ] Pull-to-refresh works

#### Active Orders Tab
- [ ] Select "Active Orders" tab
- [ ] Active orders list loads (may be empty)
- [ ] Pull-to-refresh works

#### Order Acceptance Flow
- [ ] If available order exists, tap on it
- [ ] Order details modal opens
- [ ] Tap "Accept Order"
- [ ] Success confirmation appears
- [ ] Automatically switches to "Active Orders" tab
- [ ] Accepted order appears in active list

#### Order Status Update Flow
- [ ] Open an active order
- [ ] Status shows "Assigned"
- [ ] Tap "Start Pickup" → status becomes "Pickup"
- [ ] Tap "Mark In Transit" → status becomes "In Transit"
- [ ] Tap "Complete Delivery" → status becomes "Delivered"
- [ ] Each transition shows success feedback

#### Real-time Notifications (Requires Backend Event)
To test new order notifications:
- [ ] Keep app open on Jobs screen
- [ ] Backend assigns new order to rider
- [ ] Alert appears: "New Order Available!"
- [ ] Tap "View" → navigates to Available Orders
- [ ] New order appears in list

**Expected WebSocket Event:**
```json
{
  "type": "new_order_assigned",
  "data": {
    "order_id": 123,
    "customer_name": "John Doe",
    ...
  }
}
```

---

### 4. Rider Earnings Screen - Live Updates

#### Overview Tab
- [ ] Navigate to Earnings screen
- [ ] "Overview" tab selected by default
- [ ] Pending Earnings card displays
- [ ] 4 earnings cards show: Today, Week, Month, Total
- [ ] Breakdown stats display: Paid, Pending, Total
- [ ] All amounts in Ghana Cedis (₵)

#### History Tab
- [ ] Select "History" tab
- [ ] Earnings breakdown list loads
- [ ] Each item shows: Order ID, Amount, Date, Status
- [ ] Status badges color-coded (Green=Paid, Yellow=Pending)
- [ ] Empty state if no history

#### Payout Tab
- [ ] Select "Payout" tab
- [ ] Available balance displays (pending_earnings)
- [ ] "Request Payout" button visible
- [ ] Info cards show: Minimum (₵50), Processing time, Methods, Fees

#### Payout Request Flow
- [ ] If balance ≥ ₵50, tap "Request Payout"
- [ ] Confirmation dialog appears
- [ ] Tap "Confirm"
- [ ] Success message with request ID
- [ ] Balance updates

**Validation:**
- [ ] If balance < ₵50, button is disabled
- [ ] Helpful message explains ₵50 minimum

#### Real-time Earnings Update (Requires Backend Event)
- [ ] Keep app on Earnings screen
- [ ] Complete a delivery (in Active Orders)
- [ ] Earnings auto-update without refresh
- [ ] Today's earnings increases
- [ ] Total earnings increases
- [ ] New item appears in History

**Expected WebSocket Event:**
```json
{
  "type": "earnings_updated",
  "data": {
    "order_id": 123,
    "amount": 15.00,
    "today_earnings": 145.50,
    "total_earnings": 1250.00
  }
}
```

---

### 5. WebSocket Connection Resilience

#### Auto-reconnect Test
- [ ] Open app as rider (connected to WebSocket)
- [ ] Stop backend server (Ctrl+C in terminal)
- [ ] Watch console logs for reconnection attempts
- [ ] Verify exponential backoff: 3s, 6s, 12s, etc.
- [ ] Restart backend server
- [ ] Connection automatically re-establishes
- [ ] App functions normally after reconnect

**Expected Logs:**
```
[WebSocket] Disconnected
[WebSocket] Reconnecting in 3000ms (attempt 1)
[WebSocket] Reconnecting in 6000ms (attempt 2)
[WebSocket] Connected
```

#### Network Interruption Test
- [ ] Connect to WebSocket
- [ ] Turn off WiFi on phone
- [ ] App handles disconnection gracefully
- [ ] Turn WiFi back on
- [ ] Connection re-establishes
- [ ] No crashes or frozen UI

#### Max Reconnect Attempts
- [ ] Disconnect backend permanently
- [ ] Watch for 10 reconnection attempts
- [ ] After 10 attempts, stops trying
- [ ] Log shows: `[WebSocket] Max reconnect attempts reached`
- [ ] App still usable (just no real-time updates)

---

### 6. Pull-to-Refresh Functionality

#### Rider Dashboard
- [ ] Pull down on dashboard
- [ ] Loading indicator appears
- [ ] Data refreshes
- [ ] Indicator disappears

#### Rider Jobs Screen
- [ ] Pull down on Available Orders
- [ ] List refreshes
- [ ] Pull down on Active Orders
- [ ] List refreshes

#### Rider Earnings Screen
- [ ] Pull down on Overview
- [ ] Data refreshes
- [ ] Pull down on History
- [ ] Data refreshes
- [ ] Pull down on Payout
- [ ] Data refreshes

---

### 7. Error Handling

#### Network Timeout
- [ ] Turn off backend server
- [ ] Try to load dashboard
- [ ] Error message appears: "Failed to load dashboard"
- [ ] "Retry" button visible
- [ ] Tap Retry → shows loading
- [ ] Error persists (server still off)

#### Invalid Token
- [ ] Manually expire token (or wait for expiration)
- [ ] Make API request
- [ ] App handles 401 Unauthorized
- [ ] Redirects to login screen

#### WebSocket Connection Failure
- [ ] Start app with backend WebSocket disabled
- [ ] App loads normally (WebSocket is enhancement, not required)
- [ ] All features work via polling/manual refresh
- [ ] Console shows connection errors but no crashes

---

### 8. Role-based Navigation

#### Rider Login
- [ ] Login as rider1@gasfill.com
- [ ] Navigates to Rider Dashboard
- [ ] Bottom tabs show: Dashboard, Jobs, Earnings, Profile
- [ ] Cannot access customer features

#### Customer Login
- [ ] Logout rider
- [ ] Login as customer (create account if needed)
- [ ] Navigates to Customer Home
- [ ] Bottom tabs show: Home, Cart, Orders, Profile
- [ ] Cannot access rider features

#### Admin Login
- [ ] Logout customer
- [ ] Login as admin@gasfill.com
- [ ] Navigates to Admin Dashboard
- [ ] Admin-specific features visible

---

### 9. Logout and Cleanup

#### Proper Cleanup
- [ ] Login as rider (WebSocket connected)
- [ ] Navigate to Profile
- [ ] Tap "Logout"
- [ ] Confirmation dialog appears
- [ ] Confirm logout
- [ ] WebSocket disconnects (check console: `[WebSocket] Disconnected`)
- [ ] Token removed from storage
- [ ] Rider data cleared
- [ ] Navigates to Welcome/Login screen

---

## 🔍 Console Log Verification

### Expected Log Sequence on Rider Login:

```
✅ Login successful
[AuthContext] Rider logged in
[WebSocketContext] Auto-connecting for rider...
[WebSocket] Connected
[WebSocketContext] Connected to server
[RiderDashboard] Loading dashboard...
✅ Dashboard loaded: {...}
[WebSocket] Received: {"type":"pong","timestamp":"..."}
```

### Expected Logs for New Order Event:

```
[WebSocket] Received: {
  "type": "new_order_assigned",
  "data": {
    "order_id": 123,
    ...
  }
}
🔔 New order available: {...}
Alert: "New Order Available!"
```

### Expected Logs for Earnings Update:

```
[WebSocket] Received: {
  "type": "earnings_updated",
  "data": {
    "order_id": 123,
    "amount": 15.00,
    "today_earnings": 145.50,
    ...
  }
}
💰 Earnings updated in real-time: {...}
```

---

## 🐛 Known Limitations (Not Bugs)

1. **WebSocket Events**: Backend must emit events for testing real-time features
2. **No Mock Orders**: Available orders may be empty without test data
3. **Payout Minimum**: Need ≥₵50 to test payout request
4. **Network**: Must be on same network as backend (192.168.1.25)

---

## ✅ Quick Smoke Test (3 minutes)

Minimal test to verify everything works:

1. **Login**
   - [ ] Open app → Login as rider1@gasfill.com
   - [ ] Verify Dashboard loads

2. **WebSocket**
   - [ ] Check console for `[WebSocket] Connected`
   - [ ] Wait 30 seconds for ping/pong

3. **Navigation**
   - [ ] Tap Jobs → Available Orders loads
   - [ ] Tap Earnings → Overview loads
   - [ ] Tap Profile → Profile loads

4. **Refresh**
   - [ ] Pull-to-refresh on Dashboard
   - [ ] Data reloads successfully

5. **Logout**
   - [ ] Profile → Logout
   - [ ] Returns to Welcome screen

**If all 5 pass → Phase 2 is working! ✅**

---

## 📝 Testing Notes

### Current Backend Limitations
- WebSocket events must be manually triggered from backend
- No test data generator for orders
- Real-time features need backend implementation of event emission

### Suggested Backend Enhancements for Testing
```python
# After order assignment
await manager.send_personal_message(
    json.dumps({
        "type": "new_order_assigned",
        "data": order_dict,
        "timestamp": datetime.utcnow().isoformat()
    }),
    rider_websocket
)

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

---

## 🎯 Success Criteria

Phase 2 is successful if:
- ✅ Rider can login and see dashboard
- ✅ WebSocket connects automatically
- ✅ All screens load without errors
- ✅ Pull-to-refresh works
- ✅ Orders can be accepted and status updated
- ✅ Earnings display correctly
- ✅ Payout request validation works
- ✅ Logout cleanly disconnects WebSocket
- ✅ No TypeScript/runtime errors
- ✅ Auto-reconnect works when connection drops

---

## 📞 Troubleshooting

### WebSocket Won't Connect
- Check backend is running: `http://192.168.1.25:8000/api/health`
- Verify WebSocket URL in `WebSocketContext.tsx`: `ws://192.168.1.25:8000/ws`
- Check phone is on same network as server
- Look for firewall blocking WebSocket connections

### Rider Dashboard Blank
- Check API response in Network tab
- Verify token in AsyncStorage
- Check rider data exists in backend
- Look for errors in console

### No Real-time Updates
- Verify WebSocket is connected (check logs)
- Backend must emit events for updates to trigger
- Check event type matches exactly (case-sensitive)
- Verify data structure matches TypeScript interfaces

### App Crashes on Login
- Check for TypeScript errors in code
- Verify all imports are correct
- Look for undefined/null reference errors
- Check AsyncStorage permissions

---

**Ready to test! Start with the Quick Smoke Test, then proceed to comprehensive testing.** 🚀
