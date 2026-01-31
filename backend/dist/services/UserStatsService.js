"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
class UserStatsService {
    /**
     * Update user statistics after a game completes
     */
    async updateStatsAfterGame(gameResult) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            const { userId, result, gameType, timeControl, ratingChange, newRating } = gameResult;
            // Get current stats
            const statsQuery = await client.query('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
            let stats = statsQuery.rows[0];
            if (!stats) {
                // Create stats if they don't exist
                await client.query('INSERT INTO user_statistics (user_id) VALUES ($1)', [userId]);
                stats = {
                    games_played: 0,
                    games_won: 0,
                    games_lost: 0,
                    games_drawn: 0,
                    bot_games: 0,
                    multiplayer_games: 0,
                    bullet_games: 0,
                    blitz_games: 0,
                    rapid_games: 0,
                    classical_games: 0,
                    highest_rating: 1200,
                    lowest_rating: 1200,
                    best_win_streak: 0,
                    current_win_streak: 0,
                };
            }
            // Update counters
            const gamesPlayed = stats.games_played + 1;
            const gamesWon = result === 'win' ? stats.games_won + 1 : stats.games_won;
            const gamesLost = result === 'loss' ? stats.games_lost + 1 : stats.games_lost;
            const gamesDrawn = result === 'draw' ? stats.games_drawn + 1 : stats.games_drawn;
            // Update game type counter
            const botGames = gameType === 'bot' ? stats.bot_games + 1 : stats.bot_games;
            const multiplayerGames = gameType === 'multiplayer' ? stats.multiplayer_games + 1 : stats.multiplayer_games;
            // Update time control counter
            let bulletGames = stats.bullet_games;
            let blitzGames = stats.blitz_games;
            let rapidGames = stats.rapid_games;
            let classicalGames = stats.classical_games;
            if (timeControl === 'bullet')
                bulletGames++;
            else if (timeControl === 'blitz')
                blitzGames++;
            else if (timeControl === 'rapid')
                rapidGames++;
            else if (timeControl === 'classical')
                classicalGames++;
            // Update win streak
            let currentWinStreak = result === 'win' ? stats.current_win_streak + 1 : 0;
            const bestWinStreak = Math.max(stats.best_win_streak, currentWinStreak);
            // Update rating records
            const highestRating = Math.max(stats.highest_rating, newRating);
            const lowestRating = Math.min(stats.lowest_rating, newRating);
            // Update statistics
            await client.query(`UPDATE user_statistics SET
          games_played = $1,
          games_won = $2,
          games_lost = $3,
          games_drawn = $4,
          bot_games = $5,
          multiplayer_games = $6,
          bullet_games = $7,
          blitz_games = $8,
          rapid_games = $9,
          classical_games = $10,
          highest_rating = $11,
          lowest_rating = $12,
          best_win_streak = $13,
          current_win_streak = $14,
          last_game_at = NOW(),
          updated_at = NOW()
        WHERE user_id = $15`, [
                gamesPlayed, gamesWon, gamesLost, gamesDrawn,
                botGames, multiplayerGames,
                bulletGames, blitzGames, rapidGames, classicalGames,
                highestRating, lowestRating, bestWinStreak, currentWinStreak,
                userId
            ]);
            // Log activity
            await client.query(`INSERT INTO user_activity (user_id, activity_type, activity_data)
         VALUES ($1, $2, $3)`, [
                userId,
                'game_completed',
                JSON.stringify({
                    gameId: gameResult.gameId,
                    result,
                    gameType,
                    timeControl,
                    ratingChange,
                    newRating
                })
            ]);
            // Check for achievements
            await this.checkAchievements(client, userId, {
                gamesPlayed,
                gamesWon,
                currentWinStreak,
                newRating,
                bulletGames,
                blitzGames
            });
            await client.query('COMMIT');
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get user statistics
     */
    async getUserStats(userId) {
        const result = await database_1.default.query('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = result.rows[0];
        return {
            userId: row.user_id,
            gamesPlayed: row.games_played,
            gamesWon: row.games_won,
            gamesLost: row.games_lost,
            gamesDrawn: row.games_drawn,
            botGames: row.bot_games,
            multiplayerGames: row.multiplayer_games,
            bulletGames: row.bullet_games,
            blitzGames: row.blitz_games,
            rapidGames: row.rapid_games,
            classicalGames: row.classical_games,
            highestRating: row.highest_rating,
            lowestRating: row.lowest_rating,
            bestWinStreak: row.best_win_streak,
            currentWinStreak: row.current_win_streak,
            lastGameAt: row.last_game_at
        };
    }
    /**
     * Get game history for a user
     */
    async getGameHistory(userId, limit = 20, offset = 0) {
        const result = await database_1.default.query(`SELECT 
        g.id,
        g.white_player_id,
        g.black_player_id,
        g.game_type,
        g.time_control,
        g.result,
        g.is_rated,
        g.total_moves,
        g.created_at,
        g.completed_at,
        g.white_rating_before,
        g.white_rating_after,
        g.white_rating_change,
        g.black_rating_before,
        g.black_rating_after,
        g.black_rating_change,
        g.pgn,
        w.username as white_username,
        w.avatar_url as white_avatar,
        b.username as black_username,
        b.avatar_url as black_avatar
      FROM games g
      LEFT JOIN users w ON g.white_player_id = w.id
      LEFT JOIN users b ON g.black_player_id = b.id
      WHERE (g.white_player_id = $1 OR g.black_player_id = $1)
        AND g.status = 'completed'
      ORDER BY g.completed_at DESC
      LIMIT $2 OFFSET $3`, [userId, limit, offset]);
        return result.rows.map(row => ({
            id: row.id,
            whitePlayerId: row.white_player_id,
            blackPlayerId: row.black_player_id,
            whiteUsername: row.white_username,
            blackUsername: row.black_username,
            whiteAvatar: row.white_avatar,
            blackAvatar: row.black_avatar,
            gameType: row.game_type,
            timeControl: row.time_control,
            result: row.result,
            isRated: row.is_rated,
            totalMoves: row.total_moves,
            createdAt: row.created_at,
            completedAt: row.completed_at,
            pgn: row.pgn,
            userColor: row.white_player_id === userId ? 'white' : 'black',
            userRatingBefore: row.white_player_id === userId ? row.white_rating_before : row.black_rating_before,
            userRatingAfter: row.white_player_id === userId ? row.white_rating_after : row.black_rating_after,
            userRatingChange: row.white_player_id === userId ? row.white_rating_change : row.black_rating_change,
        }));
    }
    /**
     * Get leaderboard
     */
    async getLeaderboard(limit = 100, timeControl) {
        let query = `
      SELECT 
        u.id,
        u.username,
        u.rating,
        u.avatar_url,
        s.games_played,
        s.games_won,
        s.games_lost,
        s.games_drawn,
        s.best_win_streak,
        s.last_game_at
      FROM users u
      LEFT JOIN user_statistics s ON u.id = s.user_id
      WHERE s.games_played > 0
    `;
        if (timeControl) {
            query += ` AND s.${timeControl}_games > 0`;
        }
        query += ` ORDER BY u.rating DESC LIMIT $1`;
        const result = await database_1.default.query(query, [limit]);
        return result.rows.map((row, index) => ({
            rank: index + 1,
            userId: row.id,
            username: row.username,
            rating: row.rating,
            avatarUrl: row.avatar_url,
            gamesPlayed: row.games_played,
            gamesWon: row.games_won,
            gamesLost: row.games_lost,
            gamesDrawn: row.games_drawn,
            winRate: row.games_played > 0 ? ((row.games_won / row.games_played) * 100).toFixed(1) : '0.0',
            bestWinStreak: row.best_win_streak,
            lastGameAt: row.last_game_at
        }));
    }
    /**
     * Get user's rank
     */
    async getUserRank(userId) {
        const result = await database_1.default.query(`SELECT COUNT(*) + 1 as rank
       FROM users
       WHERE rating > (SELECT rating FROM users WHERE id = $1)`, [userId]);
        return parseInt(result.rows[0].rank);
    }
    /**
     * Check and award achievements
     */
    async checkAchievements(client, userId, stats) {
        const achievements = [];
        // Check games won
        if (stats.gamesWon === 1)
            achievements.push('First Victory');
        // Check games played
        if (stats.gamesPlayed === 100)
            achievements.push('Century');
        // Check rating milestones
        if (stats.newRating >= 2000)
            achievements.push('Master');
        else if (stats.newRating >= 1600)
            achievements.push('Expert');
        else if (stats.newRating >= 1400)
            achievements.push('Rising Star');
        // Check win streak
        if (stats.currentWinStreak >= 5)
            achievements.push('Win Streak');
        // Award achievements
        for (const achievementName of achievements) {
            try {
                await client.query(`INSERT INTO user_achievements (user_id, achievement_id)
           SELECT $1, id FROM achievements WHERE name = $2
           ON CONFLICT DO NOTHING`, [userId, achievementName]);
            }
            catch (error) {
                // Ignore duplicate key errors
            }
        }
    }
    /**
     * Get user achievements
     */
    async getUserAchievements(userId) {
        const result = await database_1.default.query(`SELECT a.*, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`, [userId]);
        return result.rows.map(row => ({
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            unlockedAt: row.unlocked_at
        }));
    }
    /**
     * Bookmark a game
     */
    async bookmarkGame(userId, gameId, note) {
        await database_1.default.query(`INSERT INTO game_bookmarks (user_id, game_id, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, game_id) DO UPDATE SET note = $3`, [userId, gameId, note || null]);
    }
    /**
     * Get bookmarked games
     */
    async getBookmarkedGames(userId) {
        const result = await database_1.default.query(`SELECT 
        gb.*,
        g.white_player_id,
        g.black_player_id,
        g.result,
        g.time_control,
        g.pgn,
        w.username as white_username,
        b.username as black_username
       FROM game_bookmarks gb
       JOIN games g ON gb.game_id = g.id
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE gb.user_id = $1
       ORDER BY gb.created_at DESC`, [userId]);
        return result.rows;
    }
}
exports.default = new UserStatsService();
