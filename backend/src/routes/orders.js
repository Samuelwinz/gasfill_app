const express = require('express');
const router = express.Router();
const {
    createOrder,
    getOrders,
    getOrder,
    updateOrderStatus,
    assignRider,
    cancelOrder,
    getOrderStats
} = require('../controllers/orderController');
const { protect, optionalAuth, adminOnly, riderOrAdmin } = require('../middleware/auth');

// Public/Optional Auth Routes
router.post('/', optionalAuth, createOrder);

// Protected Routes
router.use(protect); // All routes below require authentication

router.get('/', getOrders);
router.get('/stats', adminOnly, getOrderStats);
router.get('/:id', getOrder);
router.put('/:id/status', riderOrAdmin, updateOrderStatus);
router.put('/:id/assign', adminOnly, assignRider);
router.delete('/:id', cancelOrder);

module.exports = router;