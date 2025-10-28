# Customer Location Fix

## Problem
Customer location coordinates were not being saved to the database, causing the rider map to show "Customer location not available".

## Root Cause
The `create_order()` function in `db.py` was **NOT** including the `customer_location` column in its INSERT statement, even though:
- ✅ The database schema had the `customer_location TEXT` column
- ✅ The backend `python_server.py` was passing the location data
- ✅ The frontend was sending the coordinates
- ✅ The Pydantic model had the field defined

## Data Flow (Before Fix)
1. ✅ **Frontend (CheckoutScreen.tsx)**: User pins location → coordinates sent in order
   ```typescript
   const orderData: OrderCreateRequest = {
     ...
     customer_location: deliveryLocation, // { lat: 14.123, lng: -87.456 }
   };
   ```

2. ✅ **Backend (python_server.py)**: Receives location and prepares order
   ```python
   order = {
     ...
     "customer_location": json.dumps(order_data.customer_location) if order_data.customer_location else None,
   }
   ```

3. ❌ **Database (db.py)**: INSERT statement was MISSING customer_location
   ```python
   # OLD CODE - customer_location was NOT in the INSERT
   cur.execute('''INSERT OR REPLACE INTO orders
       (id, items, total, ..., tracking_info)  # <-- customer_location missing!
       VALUES (?,?,?,...)
   ''')
   ```

4. ❌ **Backend Response**: Returns order WITHOUT customer_location (because it was never saved)

5. ❌ **Rider Map**: Shows "Customer location not available"

## Solution Applied

### 1. Updated `create_order()` in db.py
**File**: `d:\E\code\gasfil\gasfill_app\db.py` (line 268-290)

**Before**:
```python
cur.execute('''INSERT OR REPLACE INTO orders
    (id, items, total, customer_email, customer_name, customer_phone, customer_address, delivery_type, status, payment_status, payment_reference, created_at, updated_at, rider_id, tracking_info)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
''', (
    order.get('id'),
    ...
    json.dumps(order.get('tracking_info')) if order.get('tracking_info') is not None else None
))
```

**After**:
```python
cur.execute('''INSERT OR REPLACE INTO orders
    (id, items, total, customer_email, customer_name, customer_phone, customer_address, delivery_type, status, payment_status, payment_reference, created_at, updated_at, rider_id, tracking_info, customer_location)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
''', (
    order.get('id'),
    ...
    json.dumps(order.get('tracking_info')) if order.get('tracking_info') is not None else None,
    order.get('customer_location')  # <-- ADDED THIS
))
```

### 2. Updated `_row_to_order()` in db.py
**File**: `d:\E\code\gasfil\gasfill_app\db.py` (line 216-266)

**Added**:
```python
# Parse customer_location from JSON string to dict
try:
    customer_location = row['customer_location']
    if customer_location:
        order_dict['customer_location'] = json.loads(customer_location) if isinstance(customer_location, str) else customer_location
    else:
        order_dict['customer_location'] = None
except (KeyError, IndexError):
    order_dict['customer_location'] = None
```

This ensures that when orders are retrieved from the database, the `customer_location` JSON string is parsed back into a dictionary object.

## Data Flow (After Fix)
1. ✅ **Frontend**: User pins location → coordinates sent
2. ✅ **Backend**: Receives and prepares location data
3. ✅ **Database**: INSERT statement now includes customer_location
4. ✅ **Database**: SELECT statement parses customer_location from JSON to dict
5. ✅ **Backend Response**: Returns order WITH customer_location
6. ✅ **Rider Map**: Displays customer marker with coordinates

## Testing

### Test the Fix:
1. **Place a new order with pinned location**:
   - Go to checkout
   - Click "Pin Location"
   - Drag marker to desired location
   - Click "Confirm Location"
   - Complete order

2. **Verify in database**:
   ```sql
   SELECT id, customer_location FROM orders WHERE id = 'ORD-XXX';
   ```
   Should return: `{"lat": 14.123, "lng": -87.456}`

3. **Verify rider can see location**:
   - Assign order to a rider
   - Rider navigates to "View Map"
   - Should see red home icon marker at customer location
   - Should see distance and ETA

## Files Modified
- ✅ `gasfill_app/db.py` - Added customer_location to INSERT and SELECT logic

## Files Already Correct (No Changes Needed)
- ✅ `gasfill-mobile/src/screens/CheckoutScreen.tsx` - Already sends coordinates
- ✅ `gasfill-mobile/src/types/index.ts` - Already has customer_location in OrderCreateRequest
- ✅ `gasfill_app/python_server.py` - Already has customer_location in OrderCreate model and order creation
- ✅ `gasfill-mobile/src/screens/RiderDeliveryMapScreen.tsx` - Already displays coordinates
- ✅ `gasfill-mobile/src/services/riderApi.ts` - Already has customer_location in ActiveOrder interface

## Summary
The fix was simple: add `customer_location` to the database INSERT and SELECT operations. The entire rest of the system was already correctly configured to handle location data. This was a **database layer bug** that prevented the location coordinates from being persisted and retrieved.
