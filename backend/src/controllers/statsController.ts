import { Request, Response } from 'express';
import UserStatsService from '../services/UserStatsService';
import { achievementService } from '../services/AchievementService';

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const stats = await UserStatsService.getUserStats(userId);
    
    if (!stats) {
      return res.status(404).json({ error: 'User statistics not found' });
    }

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

export const getGameHistory = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const history = await UserStatsService.getGameHistory(userId, limit, offset);
    res.json(history);
  } catch (error) {
    console.error('Error fetching game history:', error);
    res.status(500).json({ error: 'Failed to fetch game history' });
  }
};

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const timeControl = req.query.timeControl as string;

    const leaderboard = await UserStatsService.getLeaderboard(limit, timeControl);
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

export const getUserRank = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const rank = await UserStatsService.getUserRank(userId);
    res.json({ rank });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
};

export const getUserAchievements = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(String(req.params.userId));

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const achievements = await UserStatsService.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
};

export const bookmarkGame = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const gameId = parseInt(String(req.params.gameId));
    const { note } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (isNaN(gameId)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    await UserStatsService.bookmarkGame(userId, gameId, note);
    res.json({ message: 'Game bookmarked successfully' });
  } catch (error) {
    console.error('Error bookmarking game:', error);
    res.status(500).json({ error: 'Failed to bookmark game' });
  }
};

export const getBookmarkedGames = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const bookmarks = await UserStatsService.getBookmarkedGames(userId);
    res.json(bookmarks);
  } catch (error) {
    console.error('Error fetching bookmarked games:', error);
    res.status(500).json({ error: 'Failed to fetch bookmarked games' });
  }
};

/**
 * Sync achievements for the authenticated user
 */
export const syncMyAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const unlocked = await achievementService.syncUserAchievements(userId);
    res.json({ 
      message: 'Achievements synced successfully',
      newlyUnlocked: unlocked,
      count: unlocked.length
    });
  } catch (error) {
    console.error('Error syncing achievements:', error);
    res.status(500).json({ error: 'Failed to sync achievements' });
  }
};

/**
 * Get all available achievements with user's unlock status
 */
export const getAllAchievements = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const achievements = await achievementService.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching all achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
};

/**
 * Admin endpoint: Sync achievements for all users
 */
export const syncAllAchievements = async (req: Request, res: Response) => {
  try {
    const results = await achievementService.syncAllUserAchievements();
    
    const totalUnlocked = results.reduce((sum, r) => sum + r.achievements.length, 0);
    
    res.json({ 
      message: 'All achievements synced successfully',
      usersProcessed: results.length,
      totalAchievementsUnlocked: totalUnlocked,
      details: results
    });
  } catch (error) {
    console.error('Error syncing all achievements:', error);
    res.status(500).json({ error: 'Failed to sync all achievements' });
  }
};
