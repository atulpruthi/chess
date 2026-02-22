import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable must be set');
}

interface JwtPayload {
  userId: string;
  username: string;
}

/**
 * Optional authentication middleware
 * Allows both authenticated and guest users
 * If token is present and valid, attaches user info to request
 * If no token or invalid token, allows request to continue as guest
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token - allow as guest
      (req as any).userId = null;
      (req as any).username = null;
      (req as any).isGuest = true;
      return next();
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      
      // Attach user info to request
      (req as any).userId = decoded.userId;
      (req as any).username = decoded.username;
      (req as any).isGuest = false;
      
      next();
    } catch (error) {
      // Invalid token - allow as guest
      (req as any).userId = null;
      (req as any).username = null;
      (req as any).isGuest = true;
      next();
    }
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
