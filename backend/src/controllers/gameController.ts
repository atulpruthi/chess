import { Request, Response } from 'express';
import pool from '../config/database';
import { gameService } from '../services/GameService';

export const getGameById = async (req: Request, res: Response) => {
  try {
    const gameId = parseInt(String(req.params.gameId));

    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const result = await pool.query(
      `SELECT 
        g.*,
        w.username as white_username,
        w.avatar_url as white_avatar,
        w.rating as white_current_rating,
        b.username as black_username,
        b.avatar_url as black_avatar,
        b.rating as black_current_rating
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE g.id = $1`,
      [gameId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];

    res.json({
      id: game.id,
      whitePlayerId: game.white_player_id,
      blackPlayerId: game.black_player_id,
      whiteUsername: game.white_username,
      blackUsername: game.black_username,
      whiteAvatar: game.white_avatar,
      blackAvatar: game.black_avatar,
      gameType: game.game_type,
      timeControl: game.time_control,
      result: game.result,
      isRated: game.is_rated,
      totalMoves: game.total_moves,
      pgn: game.pgn,
      createdAt: game.created_at,
      completedAt: game.completed_at,
      whiteRatingBefore: game.white_rating_before || game.white_current_rating,
      whiteRatingAfter: game.white_rating_after,
      whiteRatingChange: game.white_rating_change,
      blackRatingBefore: game.black_rating_before || game.black_current_rating,
      blackRatingAfter: game.black_rating_after,
      blackRatingChange: game.black_rating_change,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
};

/**
 * Get match history for a user
 * GET /api/games/user/:userId/history?page=1&limit=20&timeControl=blitz
 */
export const getMatchHistory = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const page = parseInt(String(req.query.page)) || 1;
    const limit = parseInt(String(req.query.limit)) || 20;
    const timeControl = req.query.timeControl as string | undefined;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const history = await gameService.getMatchHistory(userId, page, limit, timeControl);
    res.json(history);
  } catch (error) {
    console.error('Error fetching match history:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
};

/**
 * Get recent games (for dashboard)
 * GET /api/games/user/:userId/recent?limit=5
 */
export const getRecentGames = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const limit = parseInt(String(req.query.limit)) || 5;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const result = await pool.query(
      `SELECT 
        g.id,
        g.result,
        g.time_control,
        g.is_rated,
        g.completed_at,
        g.white_rating_change,
        g.black_rating_change,
        CASE 
          WHEN g.white_player_id = $1 THEN 'white'
          ELSE 'black'
        END as player_color,
        CASE 
          WHEN g.white_player_id = $1 THEN b.username
          ELSE w.username
        END as opponent_username,
        CASE 
          WHEN g.white_player_id = $1 THEN b.avatar_url
          ELSE w.avatar_url
        END as opponent_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
        AND g.status = 'completed'
      ORDER BY g.completed_at DESC
      LIMIT $2`,
      [userId, limit]
    );

    const games = result.rows.map(game => ({
      id: game.id,
      result: game.result,
      timeControl: game.time_control,
      isRated: game.is_rated,
      completedAt: game.completed_at,
      playerColor: game.player_color,
      opponentUsername: game.opponent_username,
      opponentAvatar: game.opponent_avatar,
      ratingChange: game.player_color === 'white' ? game.white_rating_change : game.black_rating_change,
      isWin: (game.player_color === 'white' && game.result === 'white') ||
            (game.player_color === 'black' && game.result === 'black'),
      isDraw: game.result === 'draw',
    }));

    res.json({ games });
  } catch (error) {
    console.error('Error fetching recent games:', error);
    res.status(500).json({ error: 'Failed to fetch recent games' });
  }
};
