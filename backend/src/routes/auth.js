const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .matches(/^(\+233|0)[2-9]\d{8}$/)
    .withMessage('Please provide a valid Ghana phone number'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['customer', 'rider'])
    .withMessage('Role must be either customer or rider')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const verifyPhoneValidation = [
  body('phone')
    .matches(/^(\+233|0)[2-9]\d{8}$/)
    .withMessage('Please provide a valid Ghana phone number'),
  body('code')
    .isLength({ min: 4, max: 6 })
    .withMessage('Verification code must be 4-6 digits')
];

// Routes
router.post('/register', registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validate, authController.forgotPassword);
router.put('/reset-password', resetPasswordValidation, validate, authController.resetPassword);
router.post('/verify-email', authController.verifyEmail);
router.post('/verify-phone', verifyPhoneValidation, validate, authController.verifyPhone);
router.post('/resend-verification', authController.resendVerification);
router.get('/me', authController.protect, authController.getMe);
router.put('/update-password', authController.protect, authController.updatePassword);

module.exports = router;