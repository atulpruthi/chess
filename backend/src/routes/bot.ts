import express from 'express';
import { createBotGame, makeBotMove, getBotGame, endBotGame } from '../controllers/botController';
import { optionalAuthMiddleware } from '../middleware/optionalAuthMiddleware';

const router = express.Router();

// Bot routes support both authenticated and guest users
router.post('/create', optionalAuthMiddleware, createBotGame);
router.post('/:gameId/move', optionalAuthMiddleware, makeBotMove);
router.post('/:gameId/end', optionalAuthMiddleware, endBotGame);
router.get('/:gameId', optionalAuthMiddleware, getBotGame);

export default router;
