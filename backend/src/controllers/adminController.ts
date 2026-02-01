import { Request, Response } from 'express';
import pool from '../config/database';

// Get all users with pagination
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search as string || '';

    let query = `
      SELECT u.id, u.username, u.email, u.role, u.rating, u.created_at,
             COUNT(DISTINCT g.id) as total_games,
             EXISTS(SELECT 1 FROM banned_users WHERE user_id = u.id) as is_banned
      FROM users u
      LEFT JOIN games g ON (g.white_player_id = u.id OR g.black_player_id = u.id)
      WHERE u.username ILIKE $1 OR u.email ILIKE $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) FROM users 
      WHERE username ILIKE $1 OR email ILIKE $1
    `;

    const [users, count] = await Promise.all([
      pool.query(query, [`%${search}%`, limit, offset]),
      pool.query(countQuery, [`%${search}%`])
    ]);

    res.json({
      users: users.rows,
      total: parseInt(count.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin dashboard statistics
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days') as new_users_week,
        (SELECT COUNT(*) FROM games) as total_games,
        (SELECT COUNT(*) FROM games WHERE created_at > NOW() - INTERVAL '24 hours') as games_today,
        (SELECT COUNT(*) FROM banned_users) as banned_users,
        (SELECT COUNT(*) FROM commentary) as total_commentaries
    `);

    const recentUsers = await pool.query(`
      SELECT id, username, email, rating, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);

    const recentGames = await pool.query(`
      SELECT g.id, g.result, g.created_at,
             wu.username as white_player,
             bu.username as black_player
      FROM games g
      JOIN users wu ON g.white_player_id = wu.id
      JOIN users bu ON g.black_player_id = bu.id
      ORDER BY g.created_at DESC
      LIMIT 10
    `);

    res.json({
      stats: stats.rows[0],
      recentUsers: recentUsers.rows,
      recentGames: recentGames.rows
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user role
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = (req as any).userId;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    await pool.query(
      'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [role, userId]
    );

    // Log the action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UPDATE_ROLE', 'user', userId, `Changed role to ${role}`]
    );

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Ban user
export const banUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason, duration } = req.body; // duration in days, null for permanent
    const adminId = (req as any).userId;

    if (!reason) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }

    const bannedUntil = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

    await pool.query(
      `INSERT INTO banned_users (user_id, banned_by, reason, banned_until)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) 
       DO UPDATE SET reason = $3, banned_until = $4, created_at = CURRENT_TIMESTAMP`,
      [userId, adminId, reason, bannedUntil]
    );

    // Log the action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'BAN_USER', 'user', userId, `Banned: ${reason}${duration ? ` for ${duration} days` : ' permanently'}`]
    );

    res.json({ message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unban user
export const unbanUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = (req as any).userId;

    await pool.query('DELETE FROM banned_users WHERE user_id = $1', [userId]);

    // Log the action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'UNBAN_USER', 'user', userId, 'User unbanned']
    );

    res.json({ message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = (req as any).userId;

    // Get user info before deleting
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const username = userResult.rows[0].username;

    // Delete user (cascade will handle related records)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Log the action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'DELETE_USER', 'user', userId, `Deleted user: ${username}`]
    );

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin logs
export const getAdminLogs = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const logs = await pool.query(`
      SELECT al.*, u.username as admin_username
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const count = await pool.query('SELECT COUNT(*) FROM admin_logs');

    res.json({
      logs: logs.rows,
      total: parseInt(count.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all games with filters
export const getAllGames = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const games = await pool.query(`
      SELECT g.id, g.result, g.time_control, g.is_rated, g.created_at, g.completed_at,
             wu.username as white_player,
             bu.username as black_player,
             wu.rating as white_rating,
             bu.rating as black_rating
      FROM games g
      JOIN users wu ON g.white_player_id = wu.id
      JOIN users bu ON g.black_player_id = bu.id
      ORDER BY g.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const count = await pool.query('SELECT COUNT(*) FROM games');

    res.json({
      games: games.rows,
      total: parseInt(count.rows[0].count),
      page,
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit)
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete game
export const deleteGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const adminId = (req as any).userId;

    await pool.query('DELETE FROM games WHERE id = $1', [gameId]);

    // Log the action
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'DELETE_GAME', 'game', gameId, 'Game deleted']
    );

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
