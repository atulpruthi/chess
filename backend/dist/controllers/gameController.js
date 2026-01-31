"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGameById = void 0;
const database_1 = __importDefault(require("../config/database"));
const getGameById = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const result = await database_1.default.query(`SELECT 
        g.*,
        w.username as white_username,
        w.avatar_url as white_avatar,
        b.username as black_username,
        b.avatar_url as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE g.id = $1`, [gameId]);
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
            whiteRatingBefore: game.white_rating_before,
            whiteRatingAfter: game.white_rating_after,
            whiteRatingChange: game.white_rating_change,
            blackRatingBefore: game.black_rating_before,
            blackRatingAfter: game.black_rating_after,
            blackRatingChange: game.black_rating_change,
        });
    }
    catch (error) {
        console.error('Error fetching game:', error);
        res.status(500).json({ error: 'Failed to fetch game' });
    }
};
exports.getGameById = getGameById;
