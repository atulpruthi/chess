"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncAllAchievements = exports.getAllAchievements = exports.syncMyAchievements = exports.getBookmarkedGames = exports.bookmarkGame = exports.getUserAchievements = exports.getUserRank = exports.getLeaderboard = exports.getGameHistory = exports.getUserStats = void 0;
const UserStatsService_1 = __importDefault(require("../services/UserStatsService"));
const AchievementService_1 = require("../services/AchievementService");
const getUserStats = async (req, res) => {
    try {
        const userId = parseInt(String(req.params.userId));
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const stats = await UserStatsService_1.default.getUserStats(userId);
        if (!stats) {
            return res.status(404).json({ error: 'User statistics not found' });
        }
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
};
exports.getUserStats = getUserStats;
const getGameHistory = async (req, res) => {
    try {
        const userId = parseInt(String(req.params.userId));
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const history = await UserStatsService_1.default.getGameHistory(userId, limit, offset);
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching game history:', error);
        res.status(500).json({ error: 'Failed to fetch game history' });
    }
};
exports.getGameHistory = getGameHistory;
const getLeaderboard = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const timeControl = req.query.timeControl;
        const leaderboard = await UserStatsService_1.default.getLeaderboard(limit, timeControl);
        res.json(leaderboard);
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};
exports.getLeaderboard = getLeaderboard;
const getUserRank = async (req, res) => {
    try {
        const userId = parseInt(String(req.params.userId));
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const rank = await UserStatsService_1.default.getUserRank(userId);
        res.json({ rank });
    }
    catch (error) {
        console.error('Error fetching user rank:', error);
        res.status(500).json({ error: 'Failed to fetch user rank' });
    }
};
exports.getUserRank = getUserRank;
const getUserAchievements = async (req, res) => {
    try {
        const userId = parseInt(String(req.params.userId));
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const achievements = await UserStatsService_1.default.getUserAchievements(userId);
        res.json(achievements);
    }
    catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};
exports.getUserAchievements = getUserAchievements;
const bookmarkGame = async (req, res) => {
    try {
        const userId = req.user?.id;
        const gameId = parseInt(String(req.params.gameId));
        const { note } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        await UserStatsService_1.default.bookmarkGame(userId, gameId, note);
        res.json({ message: 'Game bookmarked successfully' });
    }
    catch (error) {
        console.error('Error bookmarking game:', error);
        res.status(500).json({ error: 'Failed to bookmark game' });
    }
};
exports.bookmarkGame = bookmarkGame;
const getBookmarkedGames = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const bookmarks = await UserStatsService_1.default.getBookmarkedGames(userId);
        res.json(bookmarks);
    }
    catch (error) {
        console.error('Error fetching bookmarked games:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarked games' });
    }
};
exports.getBookmarkedGames = getBookmarkedGames;
/**
 * Sync achievements for the authenticated user
 */
const syncMyAchievements = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const unlocked = await AchievementService_1.achievementService.syncUserAchievements(userId);
        res.json({
            message: 'Achievements synced successfully',
            newlyUnlocked: unlocked,
            count: unlocked.length
        });
    }
    catch (error) {
        console.error('Error syncing achievements:', error);
        res.status(500).json({ error: 'Failed to sync achievements' });
    }
};
exports.syncMyAchievements = syncMyAchievements;
/**
 * Get all available achievements with user's unlock status
 */
const getAllAchievements = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const achievements = await AchievementService_1.achievementService.getUserAchievements(userId);
        res.json(achievements);
    }
    catch (error) {
        console.error('Error fetching all achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
};
exports.getAllAchievements = getAllAchievements;
/**
 * Admin endpoint: Sync achievements for all users
 */
const syncAllAchievements = async (req, res) => {
    try {
        const results = await AchievementService_1.achievementService.syncAllUserAchievements();
        const totalUnlocked = results.reduce((sum, r) => sum + r.achievements.length, 0);
        res.json({
            message: 'All achievements synced successfully',
            usersProcessed: results.length,
            totalAchievementsUnlocked: totalUnlocked,
            details: results
        });
    }
    catch (error) {
        console.error('Error syncing all achievements:', error);
        res.status(500).json({ error: 'Failed to sync all achievements' });
    }
};
exports.syncAllAchievements = syncAllAchievements;
