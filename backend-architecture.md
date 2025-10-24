# GasFill Backend Architecture - Node.js/Express Implementation

## Project Structure
```
gasfill-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── orderController.js
│   │   ├── riderController.js
│   │   ├── customerController.js
│   │   └── adminController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Order.js
│   │   ├── Rider.js
│   │   ├── Product.js
│   │   └── Location.js
│   ├── services/
│   │   ├── matchingService.js
│   │   ├── routingService.js
│   │   ├── notificationService.js
│   │   ├── paymentService.js
│   │   └── locationService.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── rateLimiting.js
│   ├── routes/
│   │   ├── api/
│   │   └── websocket/
│   ├── utils/
│   └── config/
├── package.json
├── docker-compose.yml
└── README.md
```

## Core Models (MongoDB/Mongoose)

### User Model
```javascript
const userSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['customer', 'rider', 'admin'], 
    default: 'customer' 
  },
  profile: {
    avatar: String,
    address: {
      street: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      language: { type: String, default: 'en' }
    }
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Order Model
```javascript
const orderSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  orderNumber: { type: String, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rider: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    specifications: {
      cylinderType: String,
      exchangeRequired: Boolean
    }
  }],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    landmark: String,
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    instructions: String
  },
  status: {
    type: String,
    enum: [
      'pending', 'assigned', 'accepted', 'picked_up', 
      'in_transit', 'nearby', 'delivered', 'cancelled', 'failed'
    ],
    default: 'pending'
  },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number
    },
    notes: String
  }],
  scheduling: {
    requestedTime: Date,
    estimatedTime: Date,
    actualTime: Date,
    timeWindow: {
      start: Date,
      end: Date
    }
  },
  payment: {
    method: { 
      type: String, 
      enum: ['cash', 'momo', 'card', 'wallet'],
      required: true 
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'GHS' },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending' 
    },
    transactionId: String,
    paidAt: Date
  },
  tracking: {
    assignedAt: Date,
    pickedUpAt: Date,
    deliveredAt: Date,
    rating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },
  metadata: {
    source: { type: String, default: 'web' }, // web, mobile, whatsapp
    urgency: { type: String, enum: ['normal', 'urgent', 'scheduled'] },
    notes: String
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### Rider Model
```javascript
const riderSchema = new Schema({
  _id: { type: Schema.Types.ObjectId, auto: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  license: {
    number: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    verified: { type: Boolean, default: false }
  },
  vehicle: {
    type: { type: String, required: true }, // motorcycle, van, truck
    model: String,
    plateNumber: { type: String, required: true },
    capacity: {
      weight: Number, // kg
      cylinders: {
        small: Number, // 5-6kg
        medium: Number, // 12.5kg
        large: Number  // 37kg+
      }
    }
  },
  availability: {
    status: { 
      type: String, 
      enum: ['available', 'busy', 'offline'], 
      default: 'offline' 
    },
    schedule: [{
      day: { type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
      startTime: String, // HH:MM
      endTime: String    // HH:MM
    }],
    currentLocation: {
      lat: Number,
      lng: Number,
      accuracy: Number,
      timestamp: Date
    },
    workingArea: {
      zones: [String], // Array of area codes/names
      radius: Number   // km from base location
    }
  },
  performance: {
    totalOrders: { type: Number, default: 0 },
    completedOrders: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    onTimeDeliveries: { type: Number, default: 0 },
    lastActiveAt: Date
  },
  documents: {
    idCard: {
      url: String,
      verified: Boolean,
      verifiedAt: Date
    },
    license: {
      url: String,
      verified: Boolean,
      verifiedAt: Date
    }
  },
  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    verified: { type: Boolean, default: false }
  },
  isApproved: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

## API Endpoints

### Authentication Routes
```javascript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/verify-phone
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

### Order Management
```javascript
GET    /api/orders                 // Get user's orders
POST   /api/orders                 // Create new order
GET    /api/orders/:id             // Get order details
PUT    /api/orders/:id/status      // Update order status
DELETE /api/orders/:id             // Cancel order
POST   /api/orders/:id/rating      // Rate completed order
```

### Rider Operations
```javascript
GET    /api/riders/available-orders    // Get available orders for rider
POST   /api/riders/accept-order/:id    // Accept an order
PUT    /api/riders/location            // Update rider location
GET    /api/riders/earnings            // Get earnings summary
POST   /api/riders/status              // Update availability status
```

### Real-time WebSocket Events
```javascript
// Customer events
'order:status_updated'
'rider:location_updated'
'order:eta_updated'

// Rider events
'order:new_assignment'
'order:cancelled'
'customer:message'

// Admin events
'rider:status_changed'
'order:created'
'system:alert'
```

## Key Services

### Rider Matching Service
```javascript
class RiderMatchingService {
  static async findBestRider(order) {
    const availableRiders = await this.getAvailableRiders(order.deliveryAddress);
    
    return availableRiders
      .map(rider => ({
        rider,
        score: this.calculateMatchScore(rider, order)
      }))
      .sort((a, b) => b.score - a.score)[0]?.rider;
  }
  
  static calculateMatchScore(rider, order) {
    const factors = {
      distance: this.calculateDistance(rider.location, order.deliveryAddress),
      capacity: this.checkCapacity(rider, order.items),
      rating: rider.performance.averageRating,
      workload: rider.currentOrders.length,
      specialization: this.checkSpecialization(rider, order.items)
    };
    
    // Weighted scoring algorithm
    return (
      (1 / factors.distance) * 0.4 +
      factors.capacity * 0.2 +
      factors.rating * 0.2 +
      (1 / (factors.workload + 1)) * 0.1 +
      factors.specialization * 0.1
    );
  }
}
```

### Location Tracking Service
```javascript
class LocationService {
  static async trackRiderLocation(riderId, coordinates) {
    // Update rider location in database
    await Rider.updateOne(
      { _id: riderId },
      { 
        'availability.currentLocation': {
          ...coordinates,
          timestamp: new Date()
        }
      }
    );
    
    // Get rider's active orders
    const activeOrders = await Order.find({
      rider: riderId,
      status: { $in: ['accepted', 'picked_up', 'in_transit'] }
    });
    
    // Broadcast location to customers
    activeOrders.forEach(order => {
      this.broadcastToCustomer(order.customer, 'rider:location_updated', {
        orderId: order._id,
        riderLocation: coordinates,
        eta: this.calculateETA(coordinates, order.deliveryAddress)
      });
    });
  }
  
  static calculateETA(riderLocation, destination) {
    // Integration with Google Maps Directions API
    // Returns estimated time in minutes
  }
}
```

## Database Indices for Performance
```javascript
// Orders collection
db.orders.createIndex({ customer: 1, createdAt: -1 })
db.orders.createIndex({ rider: 1, status: 1 })
db.orders.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ "deliveryAddress.coordinates": "2dsphere" })

// Riders collection  
db.riders.createIndex({ "availability.status": 1 })
db.riders.createIndex({ "availability.currentLocation": "2dsphere" })
db.riders.createIndex({ "availability.workingArea.zones": 1 })
```

## Security & Performance Features
- JWT-based authentication with refresh tokens
- Rate limiting on all API endpoints
- Input validation and sanitization
- Database query optimization with proper indexing
- Caching with Redis for frequently accessed data
- File upload handling for documents and images
- Real-time communication with Socket.IO
- Background job processing with Bull Queue
- Comprehensive logging and monitoring
- API documentation with Swagger/OpenAPI