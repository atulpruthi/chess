import express from 'express';
import multer from 'multer';
import { register, login, getProfile, updateProfile, uploadAvatar, sendOTP, verifyOTPAndRegister, checkUsername, checkEmail, getUserById, sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 200 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (!file.mimetype || !file.mimetype.startsWith('image/')) {
			return cb(new Error('Only image uploads are allowed'));
		}
		cb(null, true);
	},
});

const avatarUploadMiddleware: express.RequestHandler = (req, res, next) => {
	upload.single('avatar')(req, res, (err: any) => {
		if (!err) return next();

		if (err?.code === 'LIMIT_FILE_SIZE') {
			return res.status(413).json({ error: 'Avatar must be 200KB or smaller' });
		}

		return res.status(400).json({ error: err?.message || 'Invalid upload' });
	});
};

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
router.post('/profile/avatar', authMiddleware, avatarUploadMiddleware, uploadAvatar);

export default router;
