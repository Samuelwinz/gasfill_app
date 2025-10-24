const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rider',
    default: null
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    specifications: {
      cylinderType: String,
      exchangeRequired: { type: Boolean, default: false },
      notes: String
    }
  }],
  deliveryAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    region: String,
    landmark: String,
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    instructions: String,
    contactPhone: String
  },
  status: {
    type: String,
    enum: [
      'pending',      // Order created, waiting for rider assignment
      'assigned',     // Rider assigned, order confirmed
      'accepted',     // Rider accepted the order
      'picked_up',    // Items picked up from depot
      'in_transit',   // On the way to customer
      'nearby',       // Rider is nearby (< 5 min)
      'delivered',    // Order completed successfully
      'cancelled',    // Order cancelled
      'failed'        // Delivery failed
    ],
    default: 'pending'
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    location: {
      lat: Number,
      lng: Number
    },
    notes: String,
    updatedBy: {
      userId: mongoose.Schema.Types.ObjectId,
      role: String
    }
  }],
  scheduling: {
    requestedTime: Date,
    scheduledTime: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    timeWindow: {
      start: Date,
      end: Date
    },
    isUrgent: { type: Boolean, default: false },
    deliveryInstructions: String
  },
  payment: {
    method: {
      type: String,
      enum: ['cash', 'momo', 'card', 'wallet'],
      required: true
    },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'GHS' },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partial_refund'],
      default: 'pending'
    },
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    paidAt: Date,
    refundedAt: Date,
    refundAmount: Number
  },
  tracking: {
    assignedAt: Date,
    acceptedAt: Date,
    pickedUpAt: Date,
    inTransitAt: Date,
    nearbyAt: Date,
    deliveredAt: Date,
    currentLocation: {
      lat: Number,
      lng: Number,
      timestamp: Date
    },
    estimatedDuration: Number, // in minutes
    actualDuration: Number,    // in minutes
    distance: Number,          // in kilometers
    route: [{
      lat: Number,
      lng: Number,
      timestamp: Date
    }]
  },
  rating: {
    customerRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    },
    riderRating: {
      score: { type: Number, min: 1, max: 5 },
      feedback: String,
      ratedAt: Date
    }
  },
  communication: {
    messages: [{
      from: { type: String, enum: ['customer', 'rider', 'system'] },
      message: String,
      timestamp: { type: Date, default: Date.now },
      read: { type: Boolean, default: false }
    }],
    lastCustomerMessage: Date,
    lastRiderMessage: Date
  },
  metadata: {
    source: { 
      type: String, 
      enum: ['web', 'mobile_app', 'whatsapp', 'phone', 'admin'],
      default: 'web' 
    },
    priority: { 
      type: String, 
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal' 
    },
    campaignId: String,
    promoCode: String,
    referralCode: String,
    customerNotes: String,
    internalNotes: String,
    tags: [String]
  },
  cancellation: {
    cancelledBy: { type: String, enum: ['customer', 'rider', 'admin', 'system'] },
    reason: String,
    cancelledAt: Date,
    refundStatus: { type: String, enum: ['none', 'partial', 'full'] }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ rider: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'deliveryAddress.coordinates': '2dsphere' });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ 'scheduling.scheduledTime': 1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.orderNumber = `GF${dateStr}${randomStr}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Pre-save middleware to update status history
orderSchema.pre('save', function(next) {
  if (this.isModified('status') && !this.isNew) {
    this.statusHistory.push({
      status: this.status,
      timestamp: new Date(),
      notes: `Status changed to ${this.status}`
    });
  }
  next();
});

// Virtual for order age in hours
orderSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60));
});

// Virtual for delivery duration
orderSchema.virtual('deliveryDuration').get(function() {
  if (this.tracking.deliveredAt && this.createdAt) {
    return Math.floor((this.tracking.deliveredAt - this.createdAt) / (1000 * 60));
  }
  return null;
});

// Instance method to update status with tracking
orderSchema.methods.updateStatus = function(newStatus, location = null, notes = '', updatedBy = null) {
  this.status = newStatus;
  
  // Update tracking timestamps
  const timestamp = new Date();
  switch (newStatus) {
    case 'assigned':
      this.tracking.assignedAt = timestamp;
      break;
    case 'accepted':
      this.tracking.acceptedAt = timestamp;
      break;
    case 'picked_up':
      this.tracking.pickedUpAt = timestamp;
      break;
    case 'in_transit':
      this.tracking.inTransitAt = timestamp;
      break;
    case 'nearby':
      this.tracking.nearbyAt = timestamp;
      break;
    case 'delivered':
      this.tracking.deliveredAt = timestamp;
      this.payment.status = this.payment.method === 'cash' ? 'paid' : this.payment.status;
      break;
  }
  
  // Update current location if provided
  if (location) {
    this.tracking.currentLocation = {
      lat: location.lat,
      lng: location.lng,
      timestamp: timestamp
    };
  }
  
  // Add to status history
  this.statusHistory.push({
    status: newStatus,
    timestamp: timestamp,
    location: location,
    notes: notes,
    updatedBy: updatedBy
  });
  
  return this.save();
};

// Instance method to calculate totals
orderSchema.methods.calculateTotals = function() {
  this.payment.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  this.payment.total = this.payment.subtotal + this.payment.deliveryFee + this.payment.tax - this.payment.discount;
  return this;
};

// Static method to get orders by status
orderSchema.statics.findByStatus = function(status, limit = 10) {
  return this.find({ status })
    .populate('customer', 'name phone email')
    .populate('rider', 'name phone vehicle')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to get revenue statistics
orderSchema.statics.getRevenueStats = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        'payment.status': 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$payment.total' },
        totalOrders: { $sum: 1 },
        averageOrderValue: { $avg: '$payment.total' }
      }
    }
  ]);
};

module.exports = mongoose.model('Order', orderSchema);