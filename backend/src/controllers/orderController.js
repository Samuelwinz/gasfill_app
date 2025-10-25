const Order = require('../models/Order');
const User = require('../models/User');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    try {
        const {
            customerInfo,
            items,
            deliveryAddress,
            deliveryTime,
            notes,
            paymentMethod
        } = req.body;

        // Validation
        if (!customerInfo || !items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Customer info and items are required'
            });
        }

        // Calculate total amount
        const totalAmount = items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // Create order
        const order = await Order.create({
            userId: req.user ? req.user.id : null,
            customerInfo,
            items,
            totalAmount,
            deliveryAddress: deliveryAddress || customerInfo.address,
            deliveryTime: deliveryTime || new Date(Date.now() + 2 * 60 * 60 * 1000), // Default 2 hours from now
            notes: notes || '',
            paymentMethod: paymentMethod || 'cash_on_delivery',
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating order'
        });
    }
};

// @desc    Get all orders (admin) or user orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
    try {
        let query = {};
        
        // If not admin, only show user's orders
        if (req.user && req.user.role !== 'admin') {
            query.userId = req.user.id;
        }

        // Add filters
        if (req.query.status) {
            query.status = req.query.status;
        }
        
        if (req.query.date) {
            const date = new Date(req.query.date);
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            
            query.createdAt = {
                $gte: date,
                $lt: nextDay
            };
        }

        const orders = await Order.find(query)
            .populate('userId', 'name email phone')
            .populate('riderId', 'name phone')
            .sort({ createdAt: -1 })
            .limit(parseInt(req.query.limit) || 50);

        res.json({
            success: true,
            count: orders.length,
            data: orders
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching orders'
        });
    }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email phone')
            .populate('riderId', 'name phone location');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user owns the order (unless admin)
        if (req.user && req.user.role !== 'admin' && order.userId && 
            order.userId._id.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this order'
            });
        }

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching order'
        });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private (Admin/Rider)
const updateOrderStatus = async (req, res) => {
    try {
        const { status, location, estimatedDelivery } = req.body;
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Update order
        order.status = status;
        
        if (location && (status === 'in_transit' || status === 'delivered')) {
            order.riderLocation = location;
        }
        
        if (estimatedDelivery) {
            order.estimatedDelivery = new Date(estimatedDelivery);
        }

        // Add status update to tracking
        order.tracking.push({
            status,
            timestamp: new Date(),
            location: location || 'GasFill Station',
            message: getStatusMessage(status)
        });

        // If delivered, set delivery time
        if (status === 'delivered') {
            order.deliveredAt = new Date();
        }

        await order.save();

        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating order'
        });
    }
};

// @desc    Assign rider to order
// @route   PUT /api/orders/:id/assign
// @access  Private (Admin)
const assignRider = async (req, res) => {
    try {
        const { riderId } = req.body;
        
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if rider exists
        const rider = await User.findOne({ _id: riderId, role: 'rider' });
        if (!rider) {
            return res.status(404).json({
                success: false,
                message: 'Rider not found'
            });
        }

        order.riderId = riderId;
        order.status = 'assigned';
        
        // Add tracking entry
        order.tracking.push({
            status: 'assigned',
            timestamp: new Date(),
            location: 'GasFill Station',
            message: `Order assigned to rider ${rider.name}`
        });

        await order.save();

        const updatedOrder = await Order.findById(order._id)
            .populate('riderId', 'name phone');

        res.json({
            success: true,
            data: updatedOrder
        });
    } catch (error) {
        console.error('Assign rider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error assigning rider'
        });
    }
};

// @desc    Cancel order
// @route   DELETE /api/orders/:id
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        // Check if user owns the order (unless admin)
        if (req.user && req.user.role !== 'admin' && order.userId && 
            order.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to cancel this order'
            });
        }

        // Can't cancel delivered orders
        if (order.status === 'delivered') {
            return res.status(400).json({
                success: false,
                message: 'Cannot cancel delivered order'
            });
        }

        order.status = 'cancelled';
        order.tracking.push({
            status: 'cancelled',
            timestamp: new Date(),
            location: 'System',
            message: 'Order cancelled by user'
        });

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error cancelling order'
        });
    }
};

// Helper function to get status messages
const getStatusMessage = (status) => {
    const messages = {
        pending: 'Order received and being processed',
        confirmed: 'Order confirmed by GasFill',
        assigned: 'Rider assigned to your order',
        preparing: 'Order is being prepared',
        in_transit: 'Order is on the way',
        delivered: 'Order delivered successfully',
        cancelled: 'Order has been cancelled'
    };
    return messages[status] || 'Status updated';
};

// @desc    Get order statistics (Admin)
// @route   GET /api/orders/stats
// @access  Private (Admin)
const getOrderStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - 7);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const stats = await Promise.all([
            // Total orders
            Order.countDocuments(),
            // Today's orders
            Order.countDocuments({ createdAt: { $gte: startOfDay } }),
            // This week's orders
            Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
            // This month's orders
            Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
            // Pending orders
            Order.countDocuments({ status: 'pending' }),
            // In transit orders
            Order.countDocuments({ status: 'in_transit' }),
            // Delivered orders
            Order.countDocuments({ status: 'delivered' }),
            // Revenue this month
            Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startOfMonth },
                        status: 'delivered'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$totalAmount' }
                    }
                }
            ])
        ]);

        res.json({
            success: true,
            data: {
                totalOrders: stats[0],
                todayOrders: stats[1],
                weekOrders: stats[2],
                monthOrders: stats[3],
                pendingOrders: stats[4],
                inTransitOrders: stats[5],
                deliveredOrders: stats[6],
                monthlyRevenue: stats[7][0]?.total || 0
            }
        });
    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching statistics'
        });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    assignRider,
    cancelOrder,
    getOrderStats
};