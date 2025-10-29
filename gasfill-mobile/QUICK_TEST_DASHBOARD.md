# Quick Test Guide: Enhanced Dashboard

## 🚀 Start Testing in 3 Minutes

### Prerequisites
- Backend server running on port 8000
- 10 test orders with geocoded locations (from batch_geocode_orders.py)
- Expo app installed on device/emulator

---

## Step 1: Start Servers (1 min)

### Terminal 1: Python Backend
```bash
cd gasfill_app
python python_server.py
```
✅ Server should start on http://localhost:8000

### Terminal 2: Expo Frontend
```bash
cd gasfill_app/gasfill-mobile
npm start
# or
expo start
```
✅ Scan QR code or press 'w' for web

---

## Step 2: Login & Navigate (30 seconds)

1. **Login** with test credentials
2. **Navigate to HomeScreen** (should be default)
3. **Allow location permissions** when prompted

---

## Step 3: Test Location Features (1 min)

### ✅ Location Banner
- [ ] Green banner appears at top
- [ ] Shows your current location name
- [ ] Displays "Getting your location..." while loading
- [ ] Shows coordinates if reverse geocoding fails
- [ ] Refresh icon works to update location

**Expected**:
```
📍 [Your Location Name]
    Osu, Accra (example)
    🔄
```

---

## Step 4: Test Enhanced Active Orders (1 min)

### ✅ Progress Bar
- [ ] Green progress bar at top of each order
- [ ] Width varies by status (20%-100%)
- [ ] Smooth, professional appearance

### ✅ Order Header
- [ ] Order ID bold and prominent
- [ ] Status badge with green dot
- [ ] Human-readable status text
- [ ] ETA badge on right (green pill)
- [ ] Clock icon in ETA badge

### ✅ Delivery Address
- [ ] Grey address row appears (for geocoded orders)
- [ ] Shows location pin icon
- [ ] Formatted address displays
- [ ] Long addresses truncate with "..."

### ✅ Mini Map (if rider assigned)
- [ ] 120px map preview appears
- [ ] Blue rider marker (bicycle icon)
- [ ] Green customer marker (home icon)
- [ ] Both markers have white borders
- [ ] Expand icon in bottom-right
- [ ] Tap to open full tracking

### ✅ Order Items
- [ ] First 2 items shown with quantities
- [ ] "+X more items" for 3+ items

### ✅ Footer Actions
- [ ] "Total Amount" label
- [ ] **GH₵ XX.XX** format
- [ ] Call button (blue circle) when rider assigned
- [ ] Track Live button (green)
- [ ] White text on green button

---

## Step 5: Test Interactions (30 seconds)

### Tap Tests
1. **Tap Order Card** → Opens DeliveryTrackingScreen
2. **Tap Refresh Icon** → Updates location
3. **Tap Track Live** → Opens tracking
4. **Tap Mini Map** → Opens tracking (coming soon)

---

## 🎯 What You Should See

### Perfect Test Order Display
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [90% progress]

📦 Order #1                           ⏱️ ETA 10-15 min
● On the Way

📍 Circle, Kwame Nkrumah Avenue, Accra, Greater Accra...

┌────────────────────────────┐
│    🗺️                      │
│  🚴 (rider)    🏠 (you)    │ [Mini Map]
│                          🔍 │
└────────────────────────────┘

2x LPG Cylinder 6kg
+1 more items

Total Amount                    📞   🧭 Track Live
GH₵ 450.00
```

---

## 🐛 Common Issues & Fixes

### Location Not Showing
**Issue**: Location banner shows "Getting location..."
**Fix**: 
- Check location permissions
- Make sure on physical device (not web)
- Check GPS is enabled

### No Address in Orders
**Issue**: Delivery address row doesn't appear
**Fix**: 
- Make sure orders have customer_location
- Run batch_geocode_orders.py to add coordinates
- Check test orders were created properly

### Mini Map Not Showing
**Issue**: No map preview in orders
**Fix**: 
- Maps only show when rider is assigned
- Check order has rider_location in database
- Verify react-native-maps is installed

### Call Button Missing
**Issue**: No phone icon
**Fix**: 
- Call button only shows when rider assigned
- Check order has rider_phone field
- Status must be 'assigned' or later

### Wrong Currency Symbol
**Issue**: Shows ₵ instead of GH₵
**Fix**: This is correct! Ghana uses ₵ symbol
- Format should be: `GH₵ 450.00`

---

## 📊 Test Results Template

```
✅ PASS / ❌ FAIL - Feature Name

Location Banner:
[ ] Displays correctly
[ ] Shows location name
[ ] Refresh works

Progress Bars:
[ ] All orders have bars
[ ] Correct widths
[ ] Green color

Status Badges:
[ ] Green dots visible
[ ] Text readable
[ ] ETA shows

Addresses:
[ ] Formatted correctly
[ ] Icons show
[ ] Truncates long text

Mini Maps:
[ ] Appears when rider assigned
[ ] Both markers visible
[ ] Can tap to expand

Currency:
[ ] GH₵ format
[ ] 2 decimal places
[ ] All prices correct

Actions:
[ ] Track button works
[ ] Call button appears
[ ] Tap card opens tracking
```

---

## 🎉 Success Criteria

**All tests pass if:**
1. ✅ Location banner shows your area
2. ✅ Progress bars visible on all orders
3. ✅ Status badges clear and readable
4. ✅ Delivery addresses formatted nicely
5. ✅ Mini maps show when rider assigned
6. ✅ All prices show "GH₵ XX.XX"
7. ✅ Can tap to track orders
8. ✅ No crashes or errors

**Total Test Time: ~3 minutes** ⚡

---

## 📸 Screenshot Checklist

Take screenshots of:
1. Location banner (top of screen)
2. Active order with progress bar
3. Mini map with both markers
4. GHS currency formatting
5. Full dashboard view

Share with team for review! 🚀

---

## 🔄 After Testing

### If Everything Works
1. Mark features as tested ✅
2. Update DASHBOARD_ENHANCEMENTS_COMPLETE.md
3. Move to next screens (add GHS everywhere)
4. Implement call rider functionality

### If Issues Found
1. Document in TESTING_ISSUES.md
2. Screenshot the problem
3. Note device/OS version
4. Describe steps to reproduce
5. Report back for fixes

---

Happy Testing! 🎊
