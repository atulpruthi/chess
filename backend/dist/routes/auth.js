"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 200 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image uploads are allowed'));
        }
        cb(null, true);
    },
});
const avatarUploadMiddleware = (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (!err)
            return next();
        if (err?.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Avatar must be 200KB or smaller' });
        }
        return res.status(400).json({ error: err?.message || 'Invalid upload' });
    });
};
// Public routes
router.get('/check-username', authController_1.checkUsername);
router.get('/check-email', authController_1.checkEmail);
router.post('/register/send-otp', authController_1.sendOTP);
router.post('/register/verify', authController_1.verifyOTPAndRegister);
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/users/:userId', authMiddleware_1.authMiddleware, authController_1.getUserById);
// Password reset routes
router.post('/forgot-password/send-otp', authController_1.sendPasswordResetOTP);
router.post('/forgot-password/verify-otp', authController_1.verifyPasswordResetOTP);
router.post('/forgot-password/reset', authController_1.resetPassword);
// Protected routes
router.get('/profile', authMiddleware_1.authMiddleware, authController_1.getProfile);
router.put('/profile', authMiddleware_1.authMiddleware, authController_1.updateProfile);
router.post('/profile/avatar', authMiddleware_1.authMiddleware, avatarUploadMiddleware, authController_1.uploadAvatar);
exports.default = router;
