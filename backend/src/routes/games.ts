import express from 'express';
import { getGameById, getMatchHistory, getRecentGames } from '../controllers/gameController';

const router = express.Router();

router.get('/:gameId', getGameById);
router.get('/user/:userId/history', getMatchHistory);
router.get('/user/:userId/recent', getRecentGames);

export default router;
