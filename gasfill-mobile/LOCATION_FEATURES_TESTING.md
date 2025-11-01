# Location Features Testing Guide

## Overview
This guide covers testing for two new location features:
- **Feature B**: Update delivery location for pending/assigned orders
- **Feature C**: Automatic address geocoding in checkout

---

## Prerequisites

### 1. Start Backend Server
```bash
cd d:\E\code\gasfil\gasfill_app
python python_server.py
```
Server should start on `http://localhost:8000`

### 2. Start Mobile App
```bash
cd d:\E\code\gasfil\gasfill_app\gasfill-mobile
npx expo start
```

### 3. Device Requirements
- **GPS enabled** (for current location features)
- **Location permissions** granted to the app
- **Internet connection** (for geocoding and map tiles)

---

## Feature B: Update Delivery Location

### Test Case 1: Update Location for Pending Order

**Steps:**
1. **Place a new order** (it will be in 'pending' status)
   - Go to Products → Add items to cart
   - Go to Cart → Checkout
   - Fill in customer details
   - (Optionally pin location or skip it)
   - Complete payment with Paystack test card
   - Order should be created successfully

2. **Open Order Tracking**
   - Go to "My Orders" tab
   - Tap on the newly created order
   - You should see the delivery tracking screen

3. **Check for Update Button**
   - For pending orders, you should see either:
     - "Pin Exact Location" (if no location was pinned)
     - "Update Location" (if location was already pinned)

4. **Open Location Picker**
   - Tap the "Pin Exact Location" or "Update Location" button
   - App should request GPS permissions (if not already granted)
   - Modal should open with a map

5. **Select New Location**
   - **Option A**: Drag the red marker to your desired location
   - **Option B**: Tap anywhere on the map to move the marker
   - **Option C**: Tap the locate icon (top right) to use current GPS location
   - Coordinates should update in real-time at the bottom

6. **Confirm Location Update**
   - Review the coordinates displayed
   - Tap "Confirm Location" button
   - Should show "Updating location..." loading state

7. **Verify Success**
   - Success alert should appear
   - Tracking screen should reload
   - New location should be visible on the map
   - "Location pinned" badge should show new coordinates

8. **Verify Backend Update**
   - Check server logs for:
     ```
     PATCH /api/orders/{order_id}/location
     Successfully updated location for order {order_id}
     ```
   - Check database (optional):
     ```bash
     sqlite3 gasfill.db
     SELECT customer_location FROM orders WHERE id = '{order_id}';
     ```

### Test Case 2: Update Not Allowed for Completed Orders

**Steps:**
1. Create an order and mark it as 'completed' or 'cancelled' in the database
2. Open tracking for that order
3. **Expected**: "Update Location" button should NOT appear
4. Order status should show as completed/cancelled

### Test Case 3: Error Handling

**Steps:**
1. Turn off internet connection
2. Try to update location for a pending order
3. **Expected**: Error alert showing "Failed to update location"
4. Location should remain unchanged

---

## Feature C: Address Geocoding

### Test Case 1: Geocode Valid Ghana Address

**Steps:**
1. **Go to Checkout**
   - Add items to cart
   - Navigate to checkout screen

2. **Enter a Valid Address**
   - In "Delivery Address" field, enter:
     ```
     Circle, Accra, Ghana
     ```
   - Or:
     ```
     Kwame Nkrumah Circle, Accra
     ```
   - Or:
     ```
     Oxford Street, Osu, Accra
     ```

3. **Tap "Find on Map" Button**
   - Button should show "Finding..." with spinner
   - Wait 1-3 seconds

4. **Verify Success**
   - Alert should appear: "Address Located! 📍"
   - Should show:
     - Formatted address from geocoding
     - Coordinates (latitude, longitude)
     - Message about adjusting pin if needed
   - Green checkmark should appear below address field
   - "Location pinned: {lat}, {lng}" should be visible

5. **Verify Map Integration** (Optional)
   - Tap "Pin Location" button
   - Map should center on the geocoded location
   - Marker should be at the found coordinates

### Test Case 2: Geocode with Manual Adjustment

**Steps:**
1. Enter address: `University of Ghana, Legon`
2. Tap "Find on Map"
3. Location should be found and pinned
4. Tap "Pin Location" to open map
5. Drag marker to adjust the exact building/entrance
6. Confirm the adjusted location
7. **Expected**: Location updates with adjusted coordinates

### Test Case 3: Address Not Found

**Steps:**
1. Enter gibberish address: `XYZ123 Invalid Street`
2. Tap "Find on Map"
3. **Expected**:
   - Alert: "Address Not Found"
   - Suggestions to check for typos or use manual pin
   - No location should be set

### Test Case 4: Outside Service Area

**Steps:**
1. Enter address outside Ghana: `Times Square, New York, USA`
2. Tap "Find on Map"
3. **Expected**:
   - Alert: "Outside Service Area"
   - Message: "We currently only deliver within Ghana"
   - No location should be set

### Test Case 5: Empty Address

**Steps:**
1. Leave "Delivery Address" field empty
2. Try to tap "Find on Map"
3. **Expected**:
   - Button should be disabled (grayed out)
   - OR alert: "Please enter a delivery address first"

### Test Case 6: Geocoding While Typing

**Steps:**
1. Enter partial address: `Circle`
2. Tap "Find on Map"
3. Should find "Circle, Accra"
4. Enter more specific: `Circle Odorkor`
5. Tap "Find on Map" again
6. Should find different location (Odorkor area)

---

## Integration Tests

### Test Case 1: Geocode Then Checkout

**Steps:**
1. Add items to cart
2. Go to checkout
3. Enter address: `Accra Mall, Tetteh Quarshie`
4. Tap "Find on Map"
5. Verify location is found
6. Complete checkout with payment
7. **Verify**:
   - Order is created with geocoded coordinates
   - Check backend logs for customer_location in order data
   - Open tracking → location should be visible on map

### Test Case 2: Manual Pin Then Update After Order

**Steps:**
1. Checkout with manual pin location
2. Complete order
3. Order goes to tracking
4. Update location using "Update Location" button
5. **Verify**:
   - Both original and updated locations work
   - Order reflects the latest update

### Test Case 3: Geocode + Manual Adjustment + Order + Update

**Full workflow:**
1. Enter address and geocode it
2. Open map and manually adjust pin
3. Place order
4. Later, update location again using tracking screen
5. **Verify**: All location changes are saved correctly

---

## UI/UX Validation

### Checkout Screen
- [ ] "Find on Map" button appears next to "Pin Location"
- [ ] Button shows spinner when geocoding
- [ ] Button is disabled when address is empty
- [ ] Green checkmark appears after successful geocode
- [ ] Yellow warning appears when address entered but not geocoded/pinned
- [ ] Coordinates are formatted to 5 decimal places
- [ ] Alert messages are clear and helpful

### Tracking Screen
- [ ] "Update Location" button appears for pending/assigned orders
- [ ] Button text changes based on whether location exists
- [ ] Modal opens smoothly with map
- [ ] Map marker is draggable
- [ ] Coordinates update in real-time
- [ ] "Use Current Location" (locate icon) works
- [ ] Confirm button shows loading state
- [ ] Success/error alerts are clear

---

## Error Scenarios to Test

### Network Errors
- [ ] No internet during geocoding
- [ ] No internet during location update
- [ ] Backend server down

### Permission Errors
- [ ] Location permissions denied
- [ ] GPS disabled on device

### Data Validation
- [ ] Very long address strings
- [ ] Special characters in address
- [ ] Non-English characters (e.g., French accents)
- [ ] Coordinates outside valid ranges

---

## Performance Testing

### Geocoding Performance
- [ ] Response time under 3 seconds for most addresses
- [ ] No app freeze during geocoding
- [ ] Smooth UI updates

### Map Performance
- [ ] Map loads within 2 seconds
- [ ] Marker dragging is smooth
- [ ] No lag when updating coordinates

---

## Backend Validation

### Database Checks
After each location update or geocoded order:

```bash
# Connect to database
sqlite3 gasfill.db

# Check customer_location format
SELECT id, customer_location FROM orders WHERE id = 'YOUR_ORDER_ID';

# Expected format:
# {"lat": 5.6037, "lng": -0.1870}
```

### API Logs to Check

**For Feature B (Update Location):**
```
PATCH request to update order location: {order_id}
customer_location from request: {'lat': ..., 'lng': ...}
Successfully updated location for order {order_id}
```

**For Feature C (Geocoding):**
```
Geocoding address: Circle, Accra
Geocoded location: lat=..., lng=...
Order created with customer_location: {'lat': ..., 'lng': ...}
```

---

## Test Data

### Valid Ghana Addresses for Testing
```
Circle, Accra
Osu, Accra
Tema Station
Madina Market, Greater Accra
University of Ghana, Legon
Accra Mall, Tetteh Quarshie
Labadi Beach, Accra
Kotoka International Airport
37 Military Hospital, Accra
Ridge, Accra
Dansoman, Accra
Kumasi Central Market
```

### Paystack Test Card
```
Card Number: 4084084084084081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

---

## Known Limitations

1. **Geocoding Accuracy**: Depends on expo-location's geocoding API
   - May not find very specific house numbers
   - Better with landmarks and major streets

2. **Service Area**: Currently limited to Ghana
   - Coordinates validated: 4.74°N to 11.17°N, -3.26°W to 1.20°E

3. **Update Restrictions**: Can only update for pending/assigned orders
   - Cannot update for completed, cancelled, or in-transit orders

---

## Troubleshooting

### Geocoding Returns No Results
- Check internet connection
- Try more general address (e.g., "Accra" instead of specific house number)
- Use landmarks: "near Circle, Accra"
- Fall back to manual pin

### Location Update Fails
- Verify order is in pending/assigned status
- Check backend server is running
- Check API logs for errors
- Verify customer_location format is correct

### Map Not Loading
- Check internet connection
- Verify map API keys (if using Google Maps)
- Check expo-location is installed: `npx expo install expo-location`
- Check react-native-maps is installed

---

## Success Criteria

### Feature B (Update Location)
- ✅ Button appears for pending/assigned orders
- ✅ Modal opens with map
- ✅ Location can be updated via drag, tap, or GPS
- ✅ Backend receives and saves new location
- ✅ Tracking screen reflects updated location
- ✅ Error handling works for network issues

### Feature C (Geocoding)
- ✅ "Find on Map" button works
- ✅ Valid Ghana addresses are geocoded successfully
- ✅ Geocoded location is set correctly
- ✅ Service area validation prevents out-of-bounds
- ✅ Error messages are helpful
- ✅ Orders are created with geocoded coordinates

---

## Reporting Issues

When reporting bugs, include:
1. **Device**: iOS/Android, version
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if UI issue)
6. **Backend logs** (if API issue)
7. **Console errors** (from Expo CLI)
