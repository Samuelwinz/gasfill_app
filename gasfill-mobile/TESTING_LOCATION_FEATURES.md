# Location Features Testing Guide - Quick Start

## 🎯 What We're Testing

1. ✅ **Feature B**: Update location for pending orders
2. ✅ **Feature C**: Address geocoding in checkout  
3. ✅ **Feature D**: Reverse geocoding (show formatted addresses)

---

## 🚀 Quick Start

### Step 1: Start Backend Server

```bash
# Terminal 1
cd d:\E\code\gasfil\gasfill_app
python python_server.py
```

**Expected Output**:
```
✅ Default rider users created
🚀 Starting GasFill Python Backend Server...
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Mobile App

```bash
# Terminal 2  
cd d:\E\code\gasfil\gasfill_app\gasfill-mobile
npx expo start
```

Then press:
- `a` for Android
- `i` for iOS
- `w` for web (limited functionality)

---

## 📱 Test Scenarios

### ✅ Test 1: Reverse Geocoding (Feature D)

**Purpose**: Verify that pinned locations show formatted addresses

**Steps**:
1. Login to the app (or create account)
2. Go to **"My Orders"** tab
3. Tap on any test order (TEST-20251029-001 through 010)
4. Look for the "Exact location pinned" section

**Expected Result**:
```
✓ Exact location pinned
📍 Circle, Kwame Nkrumah Avenue, Accra, Greater Accra Region, Ghana
[Open in Maps button]
```

**What to Check**:
- ✅ Green badge with "Exact location pinned"
- ✅ Formatted address (not just coordinates)
- ✅ Location emoji 📍
- ✅ "Open in Maps" button works
- ✅ Map shows correct location marker

**Fallback Behavior**:
- If reverse geocoding fails → Shows coordinates: `5.56975, -0.21509`
- Should still work, just less pretty

---

### ✅ Test 2: Update Location (Feature B)

**Purpose**: Allow customers to change delivery location after ordering

**Steps**:
1. Open any **PENDING** test order (TEST-20251029-001)
2. Scroll down to "Order Details" section
3. Look for **"Update Location"** or **"Pin Exact Location"** button
4. Tap the button

**Expected**:
- Full-screen modal opens
- Map shows with draggable red pin
- Current location displayed at bottom

**Test Actions**:
5. **Drag the marker** to a new location
   - Coordinates update in real-time
6. **OR tap anywhere** on the map
   - Pin moves to tapped location
7. **OR tap locate icon** (top right)
   - Uses your current GPS location
8. Tap **"Confirm Location"** button

**Expected Result**:
- ✅ Success alert appears
- ✅ Modal closes
- ✅ Order tracking screen reloads
- ✅ New location shown on map
- ✅ Formatted address updates (via reverse geocoding)

**Backend Verification**:
Check server logs for:
```
PATCH /api/orders/TEST-20251029-001/location
customer_location from request: {'lat': ..., 'lng': ...}
Successfully updated location for order TEST-20251029-001
```

---

### ✅ Test 3: Address Geocoding (Feature C)

**Purpose**: Automatically convert text addresses to GPS coordinates

**Prerequisites**:
- Have some items in cart
- Be on checkout screen

**Steps**:
1. Go to **Products** tab
2. Add any product to cart (e.g., 13kg cylinder)
3. Go to **Cart** tab
4. Tap **"Proceed to Checkout"**
5. Fill in customer details:
   - Name: Test User
   - Email: test@example.com
   - Phone: 0200000000
6. In **"Delivery Address"** field, type:
   ```
   Circle, Accra
   ```
7. Tap **"Find on Map"** button

**Expected Result**:
- ✅ Button shows "Finding..." with spinner
- ✅ Wait 1-3 seconds
- ✅ Alert appears:
  ```
  Address Located! 📍
  
  Found: Circle, Kwame Nkrumah Avenue, Accra...
  Coordinates: 5.56975, -0.21509
  
  You can adjust the pin if needed.
  ```
- ✅ Green checkmark appears below address
- ✅ Shows: "Location pinned: 5.56975, -0.21509"

**Test More Addresses**:
8. Try these Ghana addresses:
   - `Osu, Accra`
   - `University of Ghana, Legon`
   - `Accra Mall`
   - `Labadi Beach`
   - `Kotoka Airport`

**Test Edge Cases**:

9. **Invalid Address**: Type `XYZ123 Fake Street`
   - Tap "Find on Map"
   - Expected: Alert "Address Not Found"
   - No location set

10. **Outside Ghana**: Type `Times Square, New York`
    - Tap "Find on Map"  
    - Expected: Alert "Outside Service Area"
    - Message: "We currently only deliver within Ghana"

11. **Empty Address**:
    - Leave address blank
    - Expected: "Find on Map" button is disabled/grayed

12. **Manual Adjustment**:
    - Geocode address: `Circle, Accra`
    - Tap **"Pin Location"** button
    - Map opens with geocoded location
    - Drag marker to adjust exact spot
    - Confirm
    - Expected: Uses adjusted coordinates

---

### ✅ Test 4: Complete Checkout Flow

**Purpose**: Verify geocoded location is saved with order

**Steps**:
1. Add items to cart
2. Go to checkout
3. Enter details
4. Enter address: `Madina Market, Accra`
5. Tap "Find on Map" → Should geocode successfully
6. Complete payment (use Paystack test card):
   ```
   Card: 4084 0840 8408 4081
   CVV: 408
   Expiry: 12/25
   PIN: 0000
   OTP: 123456
   ```
7. Order should be created

**Verification**:
8. Go to "My Orders"
9. Open the newly created order
10. Check:
    - ✅ Map shows correct location marker
    - ✅ "Exact location pinned" badge visible
    - ✅ Formatted address displays (via reverse geocoding)
    - ✅ "Open in Maps" works

---

### ✅ Test 5: Warning Messages

**Purpose**: Verify users are guided to pin locations

**Scenario A: Address Without Geocoding**
1. In checkout, enter address: `123 Test Street`
2. **Don't** tap "Find on Map" or "Pin Location"
3. Expected: Yellow warning appears
   ```
   ⚠️ Tip: Use "Find on Map" or "Pin Location" for accurate delivery
   ```

**Scenario B: Order Without Location**
1. Open an old order without `customer_location`
2. Expected: Yellow badge appears
   ```
   ⚠️ Location not pinned - Using text address
   ```

---

## 🐛 Troubleshooting

### Issue: "Find on Map" Button Not Working

**Check**:
- Is address field filled in?
- Button should be disabled when empty
- Check console for errors

**Fix**:
- Enter an address first
- Try a well-known location like "Circle, Accra"

### Issue: Geocoding Always Fails

**Possible Causes**:
1. No internet connection
2. Geocoding API rate limit
3. Address outside Ghana

**Solutions**:
- Check internet
- Wait 5 minutes and try again
- Use "Pin Location" as fallback

### Issue: Reverse Geocoding Not Showing

**Check**:
- Does order have `customer_location`?
- Check console for "Reverse geocoding" logs
- May show coordinates as fallback

**This is OK**: Fallback to coordinates still works

### Issue: Update Location Not Saving

**Check Server Logs**:
```
PATCH /api/orders/{id}/location
```

**Check Order Status**:
- Only works for `pending` and `assigned` orders
- Won't work for `completed` or `cancelled`

### Issue: Map Not Loading

**Checks**:
- Internet connection
- expo-location installed: `npx expo install expo-location`
- react-native-maps installed
- Location permissions granted

---

## ✅ Success Criteria

Mark each as you test:

### Feature D: Reverse Geocoding
- [ ] Formatted addresses appear for pinned locations
- [ ] Shows coordinates as fallback if geocoding fails
- [ ] Loading state appears ("Loading address...")
- [ ] Updates after location change

### Feature B: Update Location
- [ ] "Update Location" button appears for pending orders
- [ ] Modal opens with map
- [ ] Can drag marker to new location
- [ ] Can use current GPS location
- [ ] Location saves to database
- [ ] Map updates with new location
- [ ] Reverse geocoding updates with new address

### Feature C: Address Geocoding
- [ ] "Find on Map" button works
- [ ] Geocodes valid Ghana addresses
- [ ] Shows formatted address in alert
- [ ] Sets location coordinates
- [ ] Rejects addresses outside Ghana
- [ ] Handles invalid addresses gracefully
- [ ] Can manually adjust geocoded location
- [ ] Order created with coordinates

### Integration
- [ ] All three features work together
- [ ] Geocode → Update → Reverse geocode flow works
- [ ] No errors in console
- [ ] Backend saves locations correctly
- [ ] Maps display correctly

---

## 📊 Test Orders Available

We have 10 pre-geocoded test orders:

| Order ID | Address | Coordinates |
|----------|---------|-------------|
| TEST-20251029-001 | Circle, Accra | 5.56975, -0.21509 |
| TEST-20251029-002 | Osu, Accra | 5.56059, -0.18244 |
| TEST-20251029-003 | Tema Station | 5.63128, 0.00181 |
| TEST-20251029-004 | Madina Market | 5.67927, -0.16948 |
| TEST-20251029-005 | University of Ghana | 5.64660, -0.18800 |
| TEST-20251029-006 | Accra Mall | 5.62277, -0.17405 |
| TEST-20251029-007 | Kotoka Airport | 5.60384, -0.16827 |
| TEST-20251029-008 | Ridge, Accra | 5.55680, -0.19594 |
| TEST-20251029-009 | Dansoman, Accra | 5.54681, -0.26566 |
| TEST-20251029-010 | Labadi Beach | 5.56394, -0.14061 |

All have `status: pending`, perfect for testing update location!

---

## 🎬 Quick Test Script

**5-Minute Full Test**:

1. **Start servers** (backend + mobile)
2. **Login** to app
3. **Test Reverse Geocoding**:
   - Open TEST-20251029-001
   - Check formatted address appears
4. **Test Update Location**:
   - Tap "Update Location"
   - Drag marker
   - Confirm → verify it saves
5. **Test Geocoding**:
   - Add product to cart
   - Checkout
   - Enter "Osu, Accra"
   - Tap "Find on Map"
   - Verify coordinates set
6. **Complete Order**:
   - Finish checkout
   - Verify order has location
   - Check reverse geocoding works

**If all 6 steps pass → Everything works! ✅**

---

## 📝 Reporting Issues

If you find bugs, note:
1. **Which test** failed
2. **Steps to reproduce**
3. **Expected vs actual** behavior
4. **Console errors** (from Expo CLI)
5. **Server logs** (from Python server)
6. **Screenshots** (if UI issue)

---

## Next Steps After Testing

Once testing is complete:
1. Fix any bugs found
2. Deploy to production
3. Train support team
4. Monitor geocoding success rates
5. Consider upgrading to paid geocoding API for better accuracy

---

**Ready to test!** Start with the 5-minute quick test, then do comprehensive testing if time permits.
