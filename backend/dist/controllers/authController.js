"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.verifyPasswordResetOTP = exports.sendPasswordResetOTP = exports.getUserById = exports.uploadAvatar = exports.updateProfile = exports.getProfile = exports.login = exports.register = exports.verifyOTPAndRegister = exports.sendOTP = exports.checkEmail = exports.checkUsername = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("../config/database"));
const OTPService_1 = require("../services/OTPService");
const RateLimitService_1 = require("../services/RateLimitService");
const RecaptchaService_1 = require("../services/RecaptchaService");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set');
}
const JWT_EXPIRES_IN = '7d';
// Helper function to generate username suggestions
const generateUsernameSuggestions = async (baseUsername, count = 3) => {
    const suggestions = [];
    const suffixes = [
        Math.floor(Math.random() * 1000),
        Math.floor(Math.random() * 10000),
        Math.floor(Math.random() * 100),
        Date.now().toString().slice(-4),
        Math.floor(Math.random() * 9999),
    ];
    for (let i = 0; i < suffixes.length && suggestions.length < count; i++) {
        const suggestion = `${baseUsername}${suffixes[i]}`;
        // Check if this suggestion is available
        const exists = await database_1.default.query('SELECT id FROM users WHERE username = $1', [suggestion]);
        if (exists.rows.length === 0) {
            suggestions.push(suggestion);
        }
    }
    // If we still need more suggestions, try with prefixes
    if (suggestions.length < count) {
        const prefixes = ['the', 'pro', 'mr', 'ms', 'king', 'chess'];
        for (const prefix of prefixes) {
            if (suggestions.length >= count)
                break;
            const suggestion = `${prefix}_${baseUsername}`;
            const exists = await database_1.default.query('SELECT id FROM users WHERE username = $1', [suggestion]);
            if (exists.rows.length === 0) {
                suggestions.push(suggestion);
            }
        }
    }
    return suggestions;
};
const MAX_AVATAR_BYTES = 200 * 1024;
const detectImageExtension = (buffer) => {
    if (buffer.length < 12)
        return null;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a) {
        return { ext: 'png', mime: 'image/png' };
    }
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { ext: 'jpg', mime: 'image/jpeg' };
    }
    // GIF: 47 49 46 38
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
        return { ext: 'gif', mime: 'image/gif' };
    }
    // WEBP: RIFF .... WEBP
    if (buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50) {
        return { ext: 'webp', mime: 'image/webp' };
    }
    return null;
};
const checkUsername = async (req, res) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required' });
        }
        // Check if username exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existingUser.rows.length > 0) {
            // Username is taken, generate suggestions
            const suggestions = await generateUsernameSuggestions(username, 3);
            return res.status(200).json({
                available: false,
                suggestions,
            });
        }
        // Username is available
        res.status(200).json({
            available: true,
            suggestions: [],
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Check username error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkUsername = checkUsername;
const checkEmail = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email || typeof email !== 'string') {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(200).json({
                valid: false,
                exists: false,
                message: 'Invalid email format',
            });
        }
        // Check if email exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(200).json({
                valid: true,
                exists: true,
                message: 'Email already registered. Please login.',
            });
        }
        // Email is valid and available
        res.status(200).json({
            valid: true,
            exists: false,
            message: 'Email is available',
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Check email error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.checkEmail = checkEmail;
const sendOTP = async (req, res) => {
    try {
        const { username, email, password, recaptchaToken } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Username validation
        if (username.length < 5) {
            return res.status(400).json({ error: 'Username must be at least 5 characters' });
        }
        // Check if username is alphanumeric only
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.status(400).json({ error: 'Username must contain only letters and numbers' });
        }
        // Strong password validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and number' });
        }
        // Verify CAPTCHA - always required for registration
        if (!recaptchaToken) {
            return res.status(400).json({
                error: 'Please complete the CAPTCHA verification',
                requiresCaptcha: true
            });
        }
        const isCaptchaValid = await RecaptchaService_1.recaptchaService.verifyToken(recaptchaToken);
        if (!isCaptchaValid) {
            return res.status(400).json({
                error: 'Invalid CAPTCHA. Please try again.',
                requiresCaptcha: true
            });
        }
        // Check if user already exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Generate and store OTP
        const otp = OTPService_1.otpService.storeOTP(email, username, password);
        // In production, send OTP via email service
        // For now, log it to console for testing
        OTPService_1.otpService.logOTP(email, otp);
        res.status(200).json({
            message: 'OTP sent successfully to your email',
            email: email
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Send OTP error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendOTP = sendOTP;
const verifyOTPAndRegister = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        // Verify OTP
        const verification = OTPService_1.otpService.verifyOTP(email, otp);
        if (!verification.valid || !verification.data) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        if (verification.data.type !== 'registration') {
            return res.status(400).json({ error: 'Invalid OTP type' });
        }
        const { username, password } = verification.data;
        if (!username || !password) {
            return res.status(400).json({ error: 'Invalid registration data' });
        }
        // Re-validate username (security check)
        if (username.length < 5) {
            return res.status(400).json({ error: 'Username must be at least 5 characters' });
        }
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.status(400).json({ error: 'Username must contain only letters and numbers' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (username, email, password_hash, rating, role) 
       VALUES ($1, $2, $3, 1200, 'user') 
       RETURNING id, username, email, rating, role, created_at`, [username, email, passwordHash]);
        const user = result.rows[0];
        // Delete OTP after successful registration
        OTPService_1.otpService.deleteOTP(email);
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            role: user.role || 'user'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                role: user.role,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        console.error('Verify OTP and registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyOTPAndRegister = verifyOTPAndRegister;
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        // Strong password validation
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and number' });
        }
        // Check if user already exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (username, email, password_hash, rating, role) 
       VALUES ($1, $2, $3, 1200, 'user') 
       RETURNING id, username, email, rating, role, created_at`, [username, email, passwordHash]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            role: user.role || 'user'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                role: user.role,
                createdAt: user.created_at,
            },
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password, recaptchaToken } = req.body;
        // Get IP address
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Check if CAPTCHA is required
        const requiresCaptcha = RateLimitService_1.rateLimitService.requiresCaptchaForLogin(ip);
        if (requiresCaptcha) {
            if (!recaptchaToken) {
                return res.status(400).json({
                    error: 'Too many login attempts. Please complete the CAPTCHA.',
                    requiresCaptcha: true,
                    attemptCount: RateLimitService_1.rateLimitService.getLoginAttemptCount(ip)
                });
            }
            // Verify CAPTCHA
            const isCaptchaValid = await RecaptchaService_1.recaptchaService.verifyToken(recaptchaToken);
            if (!isCaptchaValid) {
                return res.status(400).json({
                    error: 'Invalid CAPTCHA. Please try again.',
                    requiresCaptcha: true
                });
            }
        }
        // Find user
        const result = await database_1.default.query('SELECT id, username, email, password_hash, rating, role, avatar_url, bio FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            // Record failed attempt
            RateLimitService_1.rateLimitService.recordLoginAttempt(ip);
            return res.status(401).json({
                error: 'Invalid credentials',
                requiresCaptcha: RateLimitService_1.rateLimitService.requiresCaptchaForLogin(ip),
                attemptCount: RateLimitService_1.rateLimitService.getLoginAttemptCount(ip)
            });
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            // Record failed attempt
            RateLimitService_1.rateLimitService.recordLoginAttempt(ip);
            return res.status(401).json({
                error: 'Invalid credentials',
                requiresCaptcha: RateLimitService_1.rateLimitService.requiresCaptchaForLogin(ip),
                attemptCount: RateLimitService_1.rateLimitService.getLoginAttemptCount(ip)
            });
        }
        // Clear login attempts on successful login
        RateLimitService_1.rateLimitService.clearLoginAttempts(ip);
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            role: user.role || 'user'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                role: user.role || 'user',
                avatarUrl: user.avatar_url,
                bio: user.bio,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.login = login;
const getProfile = async (req, res) => {
    try {
        const userId = req.userId; // Set by auth middleware
        const result = await database_1.default.query(`SELECT id, username, email, rating, avatar_url, bio, created_at, updated_at 
       FROM users WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                createdAt: user.created_at,
                updatedAt: user.updated_at,
            },
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Get user by ID error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { username, bio, avatarUrl } = req.body;
        // Validate avatar URL if provided
        if (avatarUrl) {
            try {
                const url = new URL(avatarUrl);
                // Allow only HTTPS (or HTTP in development)
                if (url.protocol !== 'https:' && (process.env.NODE_ENV === 'production' || url.protocol !== 'http:')) {
                    return res.status(400).json({ error: 'Avatar URL must use HTTPS' });
                }
                // Optional: whitelist allowed domains
                // const allowedDomains = ['gravatar.com', 'your-cdn.com', 'imgur.com'];
                // if (!allowedDomains.includes(url.hostname)) {
                //   return res.status(400).json({ error: 'Avatar URL domain not allowed' });
                // }
            }
            catch {
                return res.status(400).json({ error: 'Invalid avatar URL format' });
            }
        }
        // Sanitize bio - limit length and remove null bytes
        let sanitizedBio = bio;
        if (bio) {
            sanitizedBio = bio.replace(/\0/g, '').substring(0, 500);
        }
        // Check if username is taken by another user
        if (username) {
            const existingUser = await database_1.default.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (existingUser.rows.length > 0) {
                return res.status(409).json({ error: 'Username already taken' });
            }
        }
        const result = await database_1.default.query(`UPDATE users 
       SET username = COALESCE($1, username),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, rating, avatar_url, bio, updated_at`, [username, sanitizedBio, avatarUrl, userId]);
        const user = result.rows[0];
        res.json({
            message: 'Profile updated successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                updatedAt: user.updated_at,
            },
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.updateProfile = updateProfile;
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.userId;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'Avatar file is required' });
        }
        if (file.size > MAX_AVATAR_BYTES) {
            return res.status(413).json({ error: 'Avatar must be 200KB or smaller' });
        }
        if (!file.buffer || file.buffer.length === 0) {
            return res.status(400).json({ error: 'Uploaded file is empty' });
        }
        const detected = detectImageExtension(file.buffer);
        if (!detected) {
            return res.status(400).json({ error: 'Invalid image file. Please upload a PNG, JPG, GIF, or WEBP image.' });
        }
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'avatars');
        await promises_1.default.mkdir(uploadDir, { recursive: true });
        const filename = `user-${userId}-${Date.now()}.${detected.ext}`;
        const filepath = path_1.default.join(uploadDir, filename);
        await promises_1.default.writeFile(filepath, file.buffer);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const publicUrl = `${baseUrl}/uploads/avatars/${filename}`;
        const result = await database_1.default.query(`UPDATE users
       SET avatar_url = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, email, rating, avatar_url, bio, updated_at`, [publicUrl, userId]);
        const user = result.rows[0];
        res.json({
            message: 'Avatar uploaded successfully',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                updatedAt: user.updated_at,
            },
        });
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.uploadAvatar = uploadAvatar;
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await database_1.default.query(`SELECT id, username, rating, avatar_url, bio, created_at 
       FROM users WHERE id = $1`, [userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        res.json({
            id: user.id,
            username: user.username,
            rating: user.rating,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            createdAt: user.created_at,
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Registration error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getUserById = getUserById;
const sendPasswordResetOTP = async (req, res) => {
    try {
        const { email, recaptchaToken } = req.body;
        // Get IP address
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        // Check if CAPTCHA is required
        const requiresCaptcha = RateLimitService_1.rateLimitService.requiresCaptchaForPasswordReset(ip);
        if (requiresCaptcha) {
            if (!recaptchaToken) {
                return res.status(400).json({
                    error: 'Too many password reset attempts. Please complete the CAPTCHA.',
                    requiresCaptcha: true,
                    attemptCount: RateLimitService_1.rateLimitService.getPasswordResetAttemptCount(ip)
                });
            }
            // Verify CAPTCHA
            const isCaptchaValid = await RecaptchaService_1.recaptchaService.verifyToken(recaptchaToken);
            if (!isCaptchaValid) {
                return res.status(400).json({
                    error: 'Invalid CAPTCHA. Please try again.',
                    requiresCaptcha: true
                });
            }
        }
        // Check if user exists (but don't reveal this information)
        const userResult = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        // Record attempt regardless of whether email exists
        RateLimitService_1.rateLimitService.recordPasswordResetAttempt(ip);
        // If user exists, generate and send OTP
        if (userResult.rows.length > 0) {
            const otp = OTPService_1.otpService.storePasswordResetOTP(email);
            // Log OTP to console (in production, send via email service)
            OTPService_1.otpService.logOTP(email, otp);
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Password Reset] OTP generated for verified email: ${email}`);
            }
        }
        else {
            if (process.env.NODE_ENV === 'development') {
                console.log(`[Password Reset] Email not found in database: ${email}`);
            }
        }
        // Always return success to prevent email enumeration
        res.status(200).json({
            message: 'If an account exists with this email, a password reset code has been sent',
            requiresCaptcha: RateLimitService_1.rateLimitService.requiresCaptchaForPasswordReset(ip),
            attemptCount: RateLimitService_1.rateLimitService.getPasswordResetAttemptCount(ip)
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Send password reset OTP error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.sendPasswordResetOTP = sendPasswordResetOTP;
const verifyPasswordResetOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'Email and OTP are required' });
        }
        // Verify email exists in database
        const userResult = await database_1.default.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            // Use same error message as invalid OTP to prevent email enumeration
            return res.status(400).json({
                error: 'Invalid or expired verification code. Please request a new code or check your email address.'
            });
        }
        const verification = OTPService_1.otpService.verifyOTP(email, otp);
        if (!verification.valid) {
            return res.status(400).json({
                error: 'Invalid or expired verification code. Please request a new code.'
            });
        }
        if (verification.data?.type !== 'password_reset') {
            return res.status(400).json({
                error: 'Invalid verification code. Please use the code sent for password reset.'
            });
        }
        // OTP is valid, return success
        res.status(200).json({
            message: 'OTP verified successfully',
            email,
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Verify password reset OTP error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.verifyPasswordResetOTP = verifyPasswordResetOTP;
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'Email, OTP, and new password are required' });
        }
        // Strong password validation
        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, and number' });
        }
        // Verify OTP one more time
        const verification = OTPService_1.otpService.verifyOTP(email, otp);
        if (!verification.valid) {
            return res.status(400).json({
                error: 'Invalid or expired verification code. Please request a new password reset code.'
            });
        }
        if (verification.data?.type !== 'password_reset') {
            return res.status(400).json({
                error: 'Invalid verification code. Please use the code sent for password reset.'
            });
        }
        // Hash new password
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        // Update password in database
        const result = await database_1.default.query(`UPDATE users 
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, username, email, rating`, [hashedPassword, email]);
        if (result.rows.length === 0) {
            // Use generic error message to prevent email enumeration
            return res.status(400).json({
                error: 'Unable to reset password. Please request a new password reset code.'
            });
        }
        // Delete OTP after successful password reset
        OTPService_1.otpService.deleteOTP(email);
        const user = result.rows[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            username: user.username,
            role: user.role || 'user'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(200).json({
            message: 'Password reset successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
                role: user.role || 'user',
            },
        });
    }
    catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.error('Reset password error:', error);
        }
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.resetPassword = resetPassword;
