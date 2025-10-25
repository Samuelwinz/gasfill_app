const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getProfile,
    updateProfile,
    changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.use(protect); // All routes below require authentication
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

module.exports = router;