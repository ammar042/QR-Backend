import express from 'express';
import {
  sendRegistrationOTP,
  verifyRegistrationOTP,
  login,
  sendLoginOTP,
  verifyLoginOTP,
  getMe
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Registration OTP routes
router.post('/send-registration-otp', sendRegistrationOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);

// Login routes
router.post('/login', login);
router.post('/send-login-otp', sendLoginOTP);
router.post('/verify-login-otp', verifyLoginOTP);


// Protected route
router.get('/me', protect, getMe);

export default router;