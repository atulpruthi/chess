import express from 'express';
import { getGameById } from '../controllers/gameController';

const router = express.Router();

router.get('/:gameId', getGameById);

export default router;
