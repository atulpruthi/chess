"use strict";
/**
 * Game Service
 * Handles game completion, rating updates, and match history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameService = void 0;
const database_1 = require("../config/database");
const EloService_1 = require("./EloService");
class GameService {
    /**
     * Save a completed game and update player ratings
     */
    async saveCompletedGame(gameResult) {
        const client = await (0, database_1.query)('BEGIN');
        try {
            // Get current player games count for K-factor calculation
            const whiteStats = await (0, database_1.query)('SELECT games_played FROM user_statistics WHERE user_id = $1', [gameResult.whitePlayer.userId]);
            const blackStats = await (0, database_1.query)('SELECT games_played FROM user_statistics WHERE user_id = $1', [gameResult.blackPlayer.userId]);
            const whiteGamesPlayed = whiteStats.rows[0]?.games_played || 0;
            const blackGamesPlayed = blackStats.rows[0]?.games_played || 0;
            // Calculate new ratings if game is rated
            let whiteRatingChange = 0;
            let blackRatingChange = 0;
            let whiteNewRating = gameResult.whitePlayer.rating;
            let blackNewRating = gameResult.blackPlayer.rating;
            if (gameResult.isRated) {
                const ratingResult = EloService_1.eloService.calculateNewRatings(gameResult.whitePlayer.rating, gameResult.blackPlayer.rating, gameResult.winner, whiteGamesPlayed, blackGamesPlayed);
                whiteRatingChange = ratingResult.whiteChange;
                blackRatingChange = ratingResult.blackChange;
                whiteNewRating = ratingResult.whiteNewRating;
                blackNewRating = ratingResult.blackNewRating;
            }
            // Insert game into database
            const gameInsert = await (0, database_1.query)(`INSERT INTO games (
          white_player_id, 
          black_player_id, 
          game_type, 
          time_control,
          result, 
          status,
          pgn,
          current_fen,
          is_rated,
          white_rating_before,
          white_rating_after,
          white_rating_change,
          black_rating_before,
          black_rating_after,
          black_rating_change,
          white_time_remaining,
          black_time_remaining,
          total_moves,
          completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
        RETURNING id`, [
                parseInt(gameResult.whitePlayer.userId),
                parseInt(gameResult.blackPlayer.userId),
                'multiplayer',
                gameResult.timeControl || 'blitz',
                gameResult.winner,
                'completed',
                gameResult.pgn,
                gameResult.fen,
                gameResult.isRated,
                gameResult.whitePlayer.rating,
                whiteNewRating,
                whiteRatingChange,
                gameResult.blackPlayer.rating,
                blackNewRating,
                blackRatingChange,
                gameResult.whiteTimeRemaining || 0,
                gameResult.blackTimeRemaining || 0,
                gameResult.moveHistory.length
            ]);
            const gameId = gameInsert.rows[0].id;
            // Update player ratings if game is rated
            if (gameResult.isRated) {
                await (0, database_1.query)('UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2', [whiteNewRating, parseInt(gameResult.whitePlayer.userId)]);
                await (0, database_1.query)('UPDATE users SET rating = $1, updated_at = NOW() WHERE id = $2', [blackNewRating, parseInt(gameResult.blackPlayer.userId)]);
            }
            // Update statistics for both players
            await this.updatePlayerStatistics(parseInt(gameResult.whitePlayer.userId), gameResult.winner === 'white' ? 'win' : gameResult.winner === 'draw' ? 'draw' : 'loss', gameResult.timeControl || 'blitz', whiteNewRating);
            await this.updatePlayerStatistics(parseInt(gameResult.blackPlayer.userId), gameResult.winner === 'black' ? 'win' : gameResult.winner === 'draw' ? 'draw' : 'loss', gameResult.timeControl || 'blitz', blackNewRating);
            await (0, database_1.query)('COMMIT');
            return {
                gameId,
                whiteRatingChange,
                blackRatingChange,
                whiteNewRating,
                blackNewRating,
            };
        }
        catch (error) {
            await (0, database_1.query)('ROLLBACK');
            console.error('Error saving game:', error);
            throw error;
        }
    }
    /**
     * Update player statistics after a game
     */
    async updatePlayerStatistics(userId, result, timeControl, newRating) {
        // Ensure user statistics record exists
        await (0, database_1.query)(`INSERT INTO user_statistics (user_id) 
       VALUES ($1) 
       ON CONFLICT (user_id) DO NOTHING`, [userId]);
        // Get current statistics
        const stats = await (0, database_1.query)('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
        const currentStats = stats.rows[0];
        const currentWinStreak = currentStats?.current_win_streak || 0;
        const bestWinStreak = currentStats?.best_win_streak || 0;
        // Calculate new win streak
        let newWinStreak = result === 'win' ? currentWinStreak + 1 : 0;
        let newBestStreak = Math.max(bestWinStreak, newWinStreak);
        // Determine time control column
        const timeControlColumn = `${timeControl}_games`;
        // Update statistics
        const updateQuery = `
      UPDATE user_statistics SET
        games_played = games_played + 1,
        games_won = games_won + ${result === 'win' ? 1 : 0},
        games_lost = games_lost + ${result === 'loss' ? 1 : 0},
        games_drawn = games_drawn + ${result === 'draw' ? 1 : 0},
        multiplayer_games = multiplayer_games + 1,
        ${timeControlColumn} = ${timeControlColumn} + 1,
        highest_rating = GREATEST(highest_rating, $1),
        lowest_rating = LEAST(lowest_rating, $1),
        current_win_streak = $2,
        best_win_streak = $3,
        last_game_at = NOW(),
        updated_at = NOW()
      WHERE user_id = $4
    `;
        await (0, database_1.query)(updateQuery, [newRating, newWinStreak, newBestStreak, userId]);
        // Record activity
        await (0, database_1.query)(`INSERT INTO user_activity (user_id, activity_type, activity_data)
       VALUES ($1, $2, $3)`, [
            userId,
            'game_completed',
            JSON.stringify({ result, timeControl, newRating })
        ]);
        // Check for achievements
        await this.checkAchievements(userId);
    }
    /**
     * Check and unlock achievements for a user
     */
    async checkAchievements(userId) {
        const stats = await (0, database_1.query)('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
        if (stats.rows.length === 0)
            return;
        const userStats = stats.rows[0];
        const userRating = await (0, database_1.query)('SELECT rating FROM users WHERE id = $1', [userId]);
        const rating = userRating.rows[0]?.rating || 1200;
        // Define achievement conditions
        const achievementChecks = [
            { name: 'First Victory', condition: userStats.games_won >= 1 },
            { name: 'Century', condition: userStats.games_played >= 100 },
            { name: 'Rising Star', condition: rating >= 1400 },
            { name: 'Expert', condition: rating >= 1600 },
            { name: 'Master', condition: rating >= 2000 },
            { name: 'Win Streak', condition: userStats.best_win_streak >= 5 },
        ];
        for (const check of achievementChecks) {
            if (check.condition) {
                // Try to unlock achievement
                await (0, database_1.query)(`INSERT INTO user_achievements (user_id, achievement_id)
           SELECT $1, id FROM achievements WHERE name = $2
           ON CONFLICT (user_id, achievement_id) DO NOTHING`, [userId, check.name]);
            }
        }
    }
    /**
     * Get match history for a user
     */
    async getMatchHistory(userId, page = 1, limit = 20, timeControl) {
        const offset = (page - 1) * limit;
        let whereClause = `WHERE (g.white_player_id = $1 OR g.black_player_id = $1) 
                       AND g.status = 'completed'`;
        const params = [userId, limit, offset];
        if (timeControl) {
            whereClause += ` AND g.time_control = $4`;
            params.push(timeControl);
        }
        const gamesQuery = `
      SELECT 
        g.*,
        w.username as white_username,
        w.avatar_url as white_avatar,
        b.username as black_username,
        b.avatar_url as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      ${whereClause}
      ORDER BY g.completed_at DESC
      LIMIT $2 OFFSET $3
    `;
        const countQuery = `
      SELECT COUNT(*) 
      FROM games g
      ${whereClause.replace(/\$2|\$3/g, '').replace('LIMIT $2 OFFSET $3', '')}
    `;
        const [games, count] = await Promise.all([
            (0, database_1.query)(gamesQuery, params),
            (0, database_1.query)(countQuery, [userId, ...(timeControl ? [timeControl] : [])])
        ]);
        return {
            games: games.rows.map(game => ({
                id: game.id,
                whitePlayer: {
                    id: game.white_player_id,
                    username: game.white_username,
                    avatar: game.white_avatar,
                    ratingBefore: game.white_rating_before,
                    ratingAfter: game.white_rating_after,
                    ratingChange: game.white_rating_change,
                },
                blackPlayer: {
                    id: game.black_player_id,
                    username: game.black_username,
                    avatar: game.black_avatar,
                    ratingBefore: game.black_rating_before,
                    ratingAfter: game.black_rating_after,
                    ratingChange: game.black_rating_change,
                },
                result: game.result,
                timeControl: game.time_control,
                isRated: game.is_rated,
                totalMoves: game.total_moves,
                completedAt: game.completed_at,
                isWin: (game.white_player_id === userId && game.result === 'white') ||
                    (game.black_player_id === userId && game.result === 'black'),
                isDraw: game.result === 'draw',
                playerColor: game.white_player_id === userId ? 'white' : 'black',
            })),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count.rows[0].count / limit),
                totalGames: parseInt(count.rows[0].count),
                hasMore: offset + games.rows.length < count.rows[0].count,
            }
        };
    }
}
exports.gameService = new GameService();
exports.default = GameService;
