# GasFill Order Tracking System - Complete Documentation

## ✅ Status Flow (Standardized)

```
pending → assigned → pickup → in_transit → delivered
   ↓          ↓         ↓          ↓
cancelled  (back)   (back)     (back)
```

### State Descriptions

1. **pending** - Customer creates order, waiting for rider assignment
2. **assigned** - Rider accepts order, preparing to collect cylinder
3. **pickup** - Rider at depot collecting LPG cylinder  
4. **in_transit** - Rider delivering cylinder to customer
5. **delivered** - Order successfully completed
6. **cancelled** - Order cancelled (terminal state)

## 🔒 State Validation

### Valid Transitions (Enforced)

```python
ORDER_STATUS_FLOW = {
    "pending": ["assigned"],
    "assigned": ["pickup", "pending"],  # Can cancel back to pending
    "pickup": ["in_transit", "assigned"],
    "in_transit": ["delivered", "pickup"],
    "delivered": [],  # Terminal state
    "cancelled": []   # Terminal state
}
```

### Validation Function

All status updates go through `validate_status_transition(current, new)` which:
- Ensures only allowed transitions occur
- Returns 400 Bad Request for invalid transitions
- Provides clear error messages with allowed options

## 📡 API Endpoints

### 1. Accept Order (pending → assigned)
```http
POST /api/rider/orders/{order_id}/accept
Authorization: Bearer {rider_token}
```

**Response:**
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "order_id": "ORD-1",
  "status": "assigned",
  "rider_id": 1001,
  "tracking_info": {
    "rider_id": 1001,
    "rider_name": "rider1",
    "assigned_at": "2025-10-25T13:32:20Z",
    "status_history": [...]
  }
}
```

### 2. Update Order Status
```http
PUT /api/rider/orders/{order_id}/status
Authorization: Bearer {rider_token}
Content-Type: application/json

{
  "status": "pickup",
  "location": "GasFill Depot, Tema",
  "notes": "Collecting cylinder from depot"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Picking Up Cylinder",
  "order_id": "ORD-1",
  "previous_status": "assigned",
  "new_status": "pickup",
  "tracking_info": {...},
  "timestamp": "2025-10-25T13:32:25Z"
}
```

### 3. Get Rider's Orders
```http
GET /api/rider/orders?status=assigned
Authorization: Bearer {rider_token}
```

**Query Parameters:**
- `status` (optional): Filter by status (assigned, pickup, in_transit, delivered)
- If omitted: Returns all orders for the rider

### 4. Get Available Orders
```http
GET /api/rider/orders/available
Authorization: Bearer {rider_token}
```

Returns orders with `status=pending` and no `rider_id` assigned.

### 5. Customer View Orders
```http
GET /api/customer/orders
Authorization: Bearer {customer_token}
```

Returns all orders for the authenticated customer with full tracking info.

## 📊 Tracking Info Structure

```json
{
  "rider_id": 1001,
  "rider_name": "rider1",
  "rider_phone": "+233241234567",
  "assigned_at": "2025-10-25T13:32:20Z",
  "current_location": "Ring Road, Accra",
  "location_updated_at": "2025-10-25T13:32:27Z",
  "delivered_at": "2025-10-25T13:32:30Z",
  "status_history": [
    {
      "status": "assigned",
      "timestamp": "2025-10-25T13:32:20Z",
      "note": "Order accepted by rider"
    },
    {
      "status": "pickup",
      "timestamp": "2025-10-25T13:32:25Z",
      "location": "GasFill Depot, Tema",
      "note": "Collecting cylinder from depot"
    },
    {
      "status": "in_transit",
      "timestamp": "2025-10-25T13:32:27Z",
      "location": "Ring Road, Accra",
      "note": "On the way to customer"
    },
    {
      "status": "delivered",
      "timestamp": "2025-10-25T13:32:30Z",
      "location": "123 Test Street, Accra",
      "note": "Delivered successfully"
    }
  ],
  "notes": [
    {
      "note": "Collecting cylinder from depot",
      "timestamp": "2025-10-25T13:32:25Z",
      "status": "pickup"
    },
    ...
  ]
}
```

## 🖥️ Frontend Integration

### Rider Dashboard

**Status Modal Options (Context-Aware)**
```javascript
function openOrderStatusModal(orderId, currentStatus) {
  // Based on current status:
  if (currentStatus === 'assigned') {
    options = '<option value="pickup">Start Pickup</option>';
  } else if (currentStatus === 'pickup') {
    options = '<option value="in_transit">In Transit</option>';
  } else if (currentStatus === 'in_transit') {
    options = '<option value="delivered">Mark Delivered</option>';
  }
}
```

**Load Active Orders**
```javascript
async function loadMyServices() {
  // Fetch all active statuses
  const assigned = await apiCall('/rider/orders?status=assigned');
  const pickup = await apiCall('/rider/orders?status=pickup');
  const transit = await apiCall('/rider/orders?status=in_transit');
  
  const allActive = [...assigned, ...pickup, ...transit];
  // Display combined list
}
```

**Status Labels**
```javascript
const statusLabels = {
  'pending': 'Pending Assignment',
  'assigned': 'Assigned to You',
  'pickup': 'Picking Up',
  'in_transit': 'In Transit',
  'delivered': 'Delivered',
  'cancelled': 'Cancelled'
};
```

### Customer Dashboard (g8.html)

The customer dashboard already fetches `/api/customer/orders` and displays:
- Order status with badge
- Rider information (name, phone, rating)
- Current location
- Status history timeline
- ETA (if available)

## 🧪 Testing

Run comprehensive test suite:
```bash
python test_tracking_flow.py
```

**Test Coverage:**
1. ✅ Rider login and authentication
2. ✅ Customer order creation (pending status)
3. ✅ Order appears in available list
4. ✅ Rider accepts order (pending → assigned)
5. ✅ Order appears in rider's active list
6. ✅ Status update to pickup (assigned → pickup)
7. ✅ Status update to in_transit (pickup → in_transit)
8. ✅ Status update to delivered (in_transit → delivered)
9. ✅ Customer views tracking info
10. ✅ Invalid transition rejected (delivered → pickup)

## 🔐 Security & Authorization

1. **Rider Ownership Verification**: 
   - All status updates verify `order.rider_id == current_rider.id`
   - Returns 403 Forbidden if not the assigned rider

2. **Status Transition Validation**:
   - Backend enforces valid state machine transitions
   - Frontend prevents invalid options from appearing

3. **Customer Privacy**:
   - Customers can only view their own orders
   - Filtered by `customer_email` from JWT token

## 🗃️ Database Schema

```sql
CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    items TEXT,  -- JSON array
    total REAL,
    customer_email TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    delivery_type TEXT,
    status TEXT,  -- pending, assigned, pickup, in_transit, delivered, cancelled
    payment_status TEXT,
    payment_reference TEXT,
    created_at TEXT,
    updated_at TEXT,
    rider_id INTEGER,  -- Foreign key to rider
    tracking_info TEXT  -- JSON object with full tracking history
)
```

## 📈 Future Enhancements

### Planned Features
- [ ] Real-time WebSocket updates for live location tracking
- [ ] Push notifications on status changes
- [ ] Map integration for rider location visualization
- [ ] Estimated time of arrival (ETA) calculation
- [ ] Photo upload for delivery proof
- [ ] Customer rating system after delivery

### Potential Status Additions
- `preparing` - Order being prepared at depot (between assigned and pickup)
- `delayed` - Order experiencing delays (any active status)
- `failed` - Delivery attempt failed (terminal state requiring retry)

## 🎯 Key Benefits

1. **Clear State Machine**: Unambiguous order progression with validation
2. **Complete Audit Trail**: Full status_history with timestamps and locations
3. **Rider Accountability**: All updates tied to authenticated rider
4. **Customer Transparency**: Real-time visibility into order status
5. **Error Prevention**: Invalid transitions automatically rejected
6. **Scalable**: Clean separation of concerns, easy to extend

---

**Last Updated**: October 25, 2025  
**Version**: 2.0  
**Status**: ✅ Production Ready
