import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { otpService } from '../services/OTPService';
import { rateLimitService } from '../services/RateLimitService';
import { recaptchaService } from '../services/RecaptchaService';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Helper function to generate username suggestions
const generateUsernameSuggestions = async (baseUsername: string, count: number = 3): Promise<string[]> => {
  const suggestions: string[] = [];
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
    const exists = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [suggestion]
    );

    if (exists.rows.length === 0) {
      suggestions.push(suggestion);
    }
  }

  // If we still need more suggestions, try with prefixes
  if (suggestions.length < count) {
    const prefixes = ['the', 'pro', 'mr', 'ms', 'king', 'chess'];
    for (const prefix of prefixes) {
      if (suggestions.length >= count) break;
      
      const suggestion = `${prefix}_${baseUsername}`;
      const exists = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [suggestion]
      );

      if (exists.rows.length === 0) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions;
};

export const checkUsername = async (req: Request, res: Response) => {
  try {
    const { username } = req.query;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if username exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

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
  } catch (error) {
    console.error('Check username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
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
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

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
  } catch (error) {
    console.error('Check email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendOTP = async (req: Request, res: Response) => {
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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify CAPTCHA - always required for registration
    if (!recaptchaToken) {
      return res.status(400).json({ 
        error: 'Please complete the CAPTCHA verification',
        requiresCaptcha: true
      });
    }

    const isCaptchaValid = await recaptchaService.verifyToken(recaptchaToken);
    if (!isCaptchaValid) {
      return res.status(400).json({ 
        error: 'Invalid CAPTCHA. Please try again.',
        requiresCaptcha: true
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Generate and store OTP
    const otp = otpService.storeOTP(email, username, password);
    
    // In production, send OTP via email service
    // For now, log it to console for testing
    otpService.logOTP(email, otp);

    res.status(200).json({
      message: 'OTP sent successfully to your email',
      email: email
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyOTPAndRegister = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Verify OTP
    const verification = otpService.verifyOTP(email, otp);

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
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, rating, role) 
       VALUES ($1, $2, $3, 1200, 'user') 
       RETURNING id, username, email, rating, role, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Delete OTP after successful registration
    otpService.deleteOTP(email);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
  } catch (error) {
    console.error('Verify OTP and registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const register = async (req: Request, res: Response) => {
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
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, rating, role) 
       VALUES ($1, $2, $3, 1200, 'user') 
       RETURNING id, username, email, rating, role, created_at`,
      [username, email, passwordHash]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    // Get IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if CAPTCHA is required
    const requiresCaptcha = rateLimitService.requiresCaptchaForLogin(ip);
    
    if (requiresCaptcha) {
      if (!recaptchaToken) {
        return res.status(400).json({ 
          error: 'Too many login attempts. Please complete the CAPTCHA.',
          requiresCaptcha: true,
          attemptCount: rateLimitService.getLoginAttemptCount(ip)
        });
      }

      // Verify CAPTCHA
      const isCaptchaValid = await recaptchaService.verifyToken(recaptchaToken);
      if (!isCaptchaValid) {
        return res.status(400).json({ 
          error: 'Invalid CAPTCHA. Please try again.',
          requiresCaptcha: true 
        });
      }
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, rating, role, avatar_url, bio FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Record failed attempt
      rateLimitService.recordLoginAttempt(ip);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        requiresCaptcha: rateLimitService.requiresCaptchaForLogin(ip),
        attemptCount: rateLimitService.getLoginAttemptCount(ip)
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Record failed attempt
      rateLimitService.recordLoginAttempt(ip);
      return res.status(401).json({ 
        error: 'Invalid credentials',
        requiresCaptcha: rateLimitService.requiresCaptchaForLogin(ip),
        attemptCount: rateLimitService.getLoginAttemptCount(ip)
      });
    }

    // Clear login attempts on successful login
    rateLimitService.clearLoginAttempts(ip);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // Set by auth middleware

    const result = await pool.query(
      `SELECT id, username, email, rating, avatar_url, bio, created_at, updated_at 
       FROM users WHERE id = $1`,
      [userId]
    );

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
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { username, bio, avatarUrl } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, userId]
      );

      if (existingUser.rows.length > 0) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const result = await pool.query(
      `UPDATE users 
       SET username = COALESCE($1, username),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, username, email, rating, avatar_url, bio, updated_at`,
      [username, bio, avatarUrl, userId]
    );

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
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `SELECT id, username, rating, avatar_url, bio, created_at 
       FROM users WHERE id = $1`,
      [userId]
    );

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
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendPasswordResetOTP = async (req: Request, res: Response) => {
  try {
    const { email, recaptchaToken } = req.body;

    // Get IP address
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if CAPTCHA is required
    const requiresCaptcha = rateLimitService.requiresCaptchaForPasswordReset(ip);
    
    if (requiresCaptcha) {
      if (!recaptchaToken) {
        return res.status(400).json({ 
          error: 'Too many password reset attempts. Please complete the CAPTCHA.',
          requiresCaptcha: true,
          attemptCount: rateLimitService.getPasswordResetAttemptCount(ip)
        });
      }

      // Verify CAPTCHA
      const isCaptchaValid = await recaptchaService.verifyToken(recaptchaToken);
      if (!isCaptchaValid) {
        return res.status(400).json({ 
          error: 'Invalid CAPTCHA. Please try again.',
          requiresCaptcha: true 
        });
      }
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Record failed attempt even for non-existent emails to prevent enumeration
      rateLimitService.recordPasswordResetAttempt(ip);
      return res.status(404).json({ 
        error: 'No account found with this email',
        requiresCaptcha: rateLimitService.requiresCaptchaForPasswordReset(ip),
        attemptCount: rateLimitService.getPasswordResetAttemptCount(ip)
      });
    }

    // Record attempt (even for successful attempts to prevent spam)
    rateLimitService.recordPasswordResetAttempt(ip);

    // Generate and store OTP
    const otp = otpService.storePasswordResetOTP(email);

    // Log OTP to console (in production, send via email service)
    otpService.logOTP(email, otp);

    res.status(200).json({
      message: 'Password reset OTP sent successfully',
      email,
      requiresCaptcha: rateLimitService.requiresCaptchaForPasswordReset(ip),
      attemptCount: rateLimitService.getPasswordResetAttemptCount(ip)
    });
  } catch (error) {
    console.error('Send password reset OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyPasswordResetOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const verification = otpService.verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (verification.data?.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid OTP type' });
    }

    // OTP is valid, return success
    res.status(200).json({
      message: 'OTP verified successfully',
      email,
    });
  } catch (error) {
    console.error('Verify password reset OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Verify OTP one more time
    const verification = otpService.verifyOTP(email, otp);

    if (!verification.valid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (verification.data?.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid OTP type' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    const result = await pool.query(
      `UPDATE users 
       SET password = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, username, email, rating`,
      [hashedPassword, email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete OTP after successful password reset
    otpService.deleteOTP(email);

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Password reset successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        rating: user.rating,
      },
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
