import { Router } from 'express';
import {
  getRandomPuzzle,
  getDailyPuzzle,
  getPuzzleById,
  submitPuzzleAttempt,
  getUserPuzzleStats,
  getPuzzlesByTheme,
  getPuzzleThemes,
  verifyPuzzleSolution
} from '../controllers/puzzleController';
import { authMiddleware } from '../middleware/authMiddleware';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = Router();

// Public routes
router.get('/daily', getDailyPuzzle);
router.get('/themes', getPuzzleThemes);

// Routes with optional authentication (work for both guests and authenticated users)
router.get('/random', optionalAuthMiddleware, getRandomPuzzle);
router.get('/theme/:themeName', optionalAuthMiddleware, getPuzzlesByTheme);
router.get('/:puzzleId', optionalAuthMiddleware, getPuzzleById);
router.post('/:puzzleId/verify', optionalAuthMiddleware, verifyPuzzleSolution);

// Protected routes (require authentication)
router.get('/stats', authMiddleware, getUserPuzzleStats);
router.post('/:puzzleId/attempt', authMiddleware, submitPuzzleAttempt);

export default router;
