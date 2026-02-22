"use strict";
/**
 * Achievement Service
 * Handles achievement management and synchronization
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.achievementService = void 0;
const database_1 = __importDefault(require("../config/database"));
class AchievementService {
    /**
     * Sync achievements for a specific user based on their current stats
     */
    async syncUserAchievements(userId) {
        const client = await database_1.default.connect();
        const unlockedAchievements = [];
        try {
            await client.query('BEGIN');
            // Get user statistics
            const statsResult = await client.query('SELECT * FROM user_statistics WHERE user_id = $1', [userId]);
            // Get user rating
            const userResult = await client.query('SELECT rating FROM users WHERE id = $1', [userId]);
            if (statsResult.rows.length === 0 || userResult.rows.length === 0) {
                await client.query('COMMIT');
                return unlockedAchievements;
            }
            const stats = statsResult.rows[0];
            const rating = userResult.rows[0].rating;
            // Define achievement conditions
            const achievementChecks = [
                { name: 'First Victory', condition: stats.games_won >= 1 },
                { name: 'Century', condition: stats.games_played >= 100 },
                { name: 'Rising Star', condition: rating >= 1400 },
                { name: 'Expert', condition: rating >= 1600 },
                { name: 'Master', condition: rating >= 2000 },
                { name: 'Win Streak', condition: stats.best_win_streak >= 5 },
            ];
            // Check and unlock achievements
            for (const check of achievementChecks) {
                if (check.condition) {
                    const result = await client.query(`INSERT INTO user_achievements (user_id, achievement_id)
             SELECT $1, id FROM achievements WHERE name = $2
             ON CONFLICT (user_id, achievement_id) DO NOTHING
             RETURNING achievement_id`, [userId, check.name]);
                    if (result.rows.length > 0) {
                        unlockedAchievements.push(check.name);
                    }
                }
            }
            await client.query('COMMIT');
            return unlockedAchievements;
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error syncing user achievements:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Sync achievements for all users in the database
     */
    async syncAllUserAchievements() {
        try {
            // Get all users
            const usersResult = await database_1.default.query('SELECT id FROM users');
            const results = [];
            for (const user of usersResult.rows) {
                const achievements = await this.syncUserAchievements(user.id);
                if (achievements.length > 0) {
                    results.push({
                        userId: user.id,
                        achievements,
                    });
                }
            }
            return results;
        }
        catch (error) {
            console.error('Error syncing all achievements:', error);
            throw error;
        }
    }
    /**
     * Get all available achievements
     */
    async getAllAchievements() {
        const result = await database_1.default.query('SELECT * FROM achievements ORDER BY category, id');
        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            requirement: row.requirement,
        }));
    }
    /**
     * Get achievements for a specific user with unlock status
     */
    async getUserAchievements(userId) {
        const result = await database_1.default.query(`SELECT 
        a.*,
        ua.unlocked_at,
        CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.category, a.id`, [userId]);
        return result.rows.map((row) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            icon: row.icon,
            category: row.category,
            requirement: row.requirement,
            unlocked: row.unlocked,
            unlockedAt: row.unlocked_at,
        }));
    }
}
exports.achievementService = new AchievementService();
