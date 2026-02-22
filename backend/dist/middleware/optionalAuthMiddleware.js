"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set');
}
/**
 * Optional authentication middleware
 * Allows both authenticated and guest users
 * If token is present and valid, attaches user info to request
 * If no token or invalid token, allows request to continue as guest
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token - allow as guest
            req.userId = null;
            req.username = null;
            req.isGuest = true;
            return next();
        }
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Attach user info to request
            req.userId = decoded.userId;
            req.username = decoded.username;
            req.isGuest = false;
            next();
        }
        catch (error) {
            // Invalid token - allow as guest
            req.userId = null;
            req.username = null;
            req.isGuest = true;
            next();
        }
    }
    catch (error) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.optionalAuthMiddleware = optionalAuthMiddleware;
