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

const router = Router();

// Public routes
router.get('/daily', getDailyPuzzle);
router.get('/themes', getPuzzleThemes);

// Protected routes (require authentication)
router.get('/random', authMiddleware, getRandomPuzzle);
router.get('/stats', authMiddleware, getUserPuzzleStats);
router.get('/theme/:themeName', getPuzzlesByTheme);
router.get('/:puzzleId', getPuzzleById);
router.post('/:puzzleId/attempt', authMiddleware, submitPuzzleAttempt);
router.post('/:puzzleId/verify', verifyPuzzleSolution);

export default router;
