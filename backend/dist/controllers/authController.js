"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        // Check if user already exists
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }
        // Hash password
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        // Create user
        const result = await database_1.default.query(`INSERT INTO users (username, email, password_hash, rating) 
       VALUES ($1, $2, $3, 1200) 
       RETURNING id, username, email, rating, created_at`, [username, email, passwordHash]);
        const user = result.rows[0];
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
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
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Find user
        const result = await database_1.default.query('SELECT id, username, email, password_hash, rating, avatar_url, bio FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
        // Verify password
        const isValidPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                rating: user.rating,
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
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { username, bio, avatarUrl } = req.body;
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
       RETURNING id, username, email, rating, avatar_url, bio, updated_at`, [username, bio, avatarUrl, userId]);
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
