import express from 'express';
import {
  analyzeGame,
  getGameAnalysis,
  getCriticalPositions,
  addCommentary,
  getGameCommentaries,
  likeCommentary,
  bookmarkPosition,
  getUserBookmarks,
} from '../controllers/analysisController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/games/:gameId/analysis', getGameAnalysis);
router.get('/games/:gameId/commentaries', getGameCommentaries);

// Protected routes
router.post('/games/:gameId/analyze', authMiddleware, analyzeGame);
router.get('/games/:gameId/critical', authMiddleware, getCriticalPositions);
router.post('/games/:gameId/commentary', authMiddleware, addCommentary);
router.post('/commentaries/:commentaryId/like', authMiddleware, likeCommentary);
router.post('/games/:gameId/bookmark-position', authMiddleware, bookmarkPosition);
router.get('/bookmarks/positions', authMiddleware, getUserBookmarks);

export default router;
