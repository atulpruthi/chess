import express from 'express';
import {
  getUserStats,
  getGameHistory,
  getLeaderboard,
  getUserRank,
  getUserAchievements,
  bookmarkGame,
  getBookmarkedGames
} from '../controllers/statsController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/users/:userId/stats', getUserStats);
router.get('/users/:userId/history', getGameHistory);
router.get('/users/:userId/rank', getUserRank);
router.get('/users/:userId/achievements', getUserAchievements);
router.get('/leaderboard', getLeaderboard);

// Protected routes
router.post('/games/:gameId/bookmark', authMiddleware, bookmarkGame);
router.get('/bookmarks', authMiddleware, getBookmarkedGames);

export default router;
