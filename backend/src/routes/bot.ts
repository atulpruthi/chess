import express from 'express';
import { createBotGame, makeBotMove, getBotGame, endBotGame } from '../controllers/botController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// All bot routes require authentication
router.post('/create', authMiddleware, createBotGame);
router.post('/:gameId/move', authMiddleware, makeBotMove);
router.post('/:gameId/end', authMiddleware, endBotGame);
router.get('/:gameId', authMiddleware, getBotGame);

export default router;
