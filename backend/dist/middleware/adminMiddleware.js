"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderatorMiddleware = exports.adminMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = __importDefault(require("../config/database"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set');
}
const adminMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        // Check if user has admin role
        const result = await database_1.default.query('SELECT id, username, email, role FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        if (user.role !== 'admin' && user.role !== 'moderator') {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        // Attach user info to request
        req.userId = user.id;
        req.username = user.username;
        req.userRole = user.role;
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.adminMiddleware = adminMiddleware;
// Middleware to check for moderator or admin
const moderatorMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const result = await database_1.default.query('SELECT id, username, role FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        if (user.role !== 'admin' && user.role !== 'moderator') {
            return res.status(403).json({ error: 'Moderator or admin access required' });
        }
        req.userId = user.id;
        req.username = user.username;
        req.userRole = user.role;
        next();
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.moderatorMiddleware = moderatorMiddleware;
