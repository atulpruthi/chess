import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface JwtPayload {
  userId: string;
  username: string;
}

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Check if user has admin role
    const result = await pool.query(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Attach user info to request
    (req as any).userId = user.id;
    (req as any).username = user.username;
    (req as any).userRole = user.role;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check for moderator or admin
export const moderatorMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    const result = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Moderator or admin access required' });
    }

    (req as any).userId = user.id;
    (req as any).username = user.username;
    (req as any).userRole = user.role;

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
