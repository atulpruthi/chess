import express from 'express';
import { register, login, getProfile, updateProfile, sendOTP, verifyOTPAndRegister, checkUsername, checkEmail, getUserById, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/check-username', checkUsername);
router.get('/check-email', checkEmail);
router.post('/register/send-otp', sendOTP);
router.post('/register/verify', verifyOTPAndRegister);
router.post('/register', register);
router.post('/login', login);
router.get('/users/:userId', authMiddleware, getUserById);

// Password reset routes
router.post('/forgot-password/send-otp', sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', verifyPasswordResetOTP);
router.post('/forgot-password/reset', resetPassword);

// Protected routes
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);

export default router;
