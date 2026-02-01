import express from 'express';
import {
  getAllUsers,
  getDashboardStats,
  updateUserRole,
  banUser,
  unbanUser,
  deleteUser,
  getAdminLogs,
  getAllGames,
  deleteGame
} from '../controllers/adminController';
import { adminMiddleware, moderatorMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

// Dashboard stats (moderators can view)
router.get('/stats', moderatorMiddleware, getDashboardStats);

// User management
router.get('/users', moderatorMiddleware, getAllUsers);
router.put('/users/:userId/role', adminMiddleware, updateUserRole);
router.post('/users/:userId/ban', moderatorMiddleware, banUser);
router.delete('/users/:userId/ban', moderatorMiddleware, unbanUser);
router.delete('/users/:userId', adminMiddleware, deleteUser);

// Game management
router.get('/games', moderatorMiddleware, getAllGames);
router.delete('/games/:gameId', adminMiddleware, deleteGame);

// Admin logs (admin only)
router.get('/logs', adminMiddleware, getAdminLogs);

export default router;
