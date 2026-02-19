import { Request, Response } from 'express';
import { puzzleService } from '../services/PuzzleService';

/**
 * Get a random puzzle for the authenticated user
 * GET /api/puzzles/random?difficulty=medium
 */
export const getRandomPuzzle = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const difficulty = req.query.difficulty as 'easy' | 'medium' | 'hard' | undefined;

    const puzzle = await puzzleService.getRandomPuzzle(userId, difficulty);

    if (!puzzle) {
      return res.status(404).json({ error: 'No puzzles available' });
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Error getting random puzzle:', error);
    res.status(500).json({ error: 'Failed to get puzzle' });
  }
};

/**
 * Get the daily puzzle
 * GET /api/puzzles/daily
 */
export const getDailyPuzzle = async (req: Request, res: Response) => {
  try {
    const puzzle = await puzzleService.getDailyPuzzle();

    if (!puzzle) {
      return res.status(404).json({ error: 'Daily puzzle not available' });
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Error getting daily puzzle:', error);
    res.status(500).json({ error: 'Failed to get daily puzzle' });
  }
};

/**
 * Get a specific puzzle by ID
 * GET /api/puzzles/:puzzleId
 */
export const getPuzzleById = async (req: Request, res: Response) => {
  try {
    const puzzleId = parseInt(req.params.puzzleId as string);

    if (isNaN(puzzleId)) {
      return res.status(400).json({ error: 'Invalid puzzle ID' });
    }

    const puzzle = await puzzleService.getPuzzleById(puzzleId);

    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    res.json(puzzle);
  } catch (error) {
    console.error('Error getting puzzle:', error);
    res.status(500).json({ error: 'Failed to get puzzle' });
  }
};

/**
 * Submit a puzzle attempt
 * POST /api/puzzles/:puzzleId/attempt
 * Body: { solved: boolean, attempts: number, timeSpent: number, userMoves: string[] }
 */
export const submitPuzzleAttempt = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const puzzleId = parseInt(req.params.puzzleId as string);
    const { solved, attempts, timeSpent, userMoves } = req.body;

    if (isNaN(puzzleId)) {
      return res.status(400).json({ error: 'Invalid puzzle ID' });
    }

    if (typeof solved !== 'boolean' || typeof attempts !== 'number' || typeof timeSpent !== 'number') {
      return res.status(400).json({ error: 'Invalid request data' });
    }

    // Verify solution if user claims they solved it
    if (solved && userMoves) {
      const puzzle = await puzzleService.getPuzzleById(puzzleId);
      if (!puzzle) {
        return res.status(404).json({ error: 'Puzzle not found' });
      }

      const isCorrect = puzzleService.verifySolution(puzzle.fen, userMoves, puzzle.moves);
      if (!isCorrect) {
        return res.status(400).json({ error: 'Solution incorrect' });
      }
    }

    const result = await puzzleService.submitAttempt(userId, puzzleId, {
      puzzleId,
      solved,
      attempts,
      timeSpent
    });

    res.json({
      message: solved ? 'Puzzle solved!' : 'Attempt recorded',
      ratingChange: result.ratingChange,
      newRating: result.newRating
    });
  } catch (error) {
    console.error('Error submitting puzzle attempt:', error);
    res.status(500).json({ error: 'Failed to submit attempt' });
  }
};

/**
 * Get user puzzle statistics
 * GET /api/puzzles/stats
 */
export const getUserPuzzleStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const stats = await puzzleService.getUserStats(userId);

    res.json(stats);
  } catch (error) {
    console.error('Error getting puzzle stats:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
};

/**
 * Get puzzles by theme
 * GET /api/puzzles/theme/:themeName?limit=10&offset=0
 */
export const getPuzzlesByTheme = async (req: Request, res: Response) => {
  try {
    const themeName = req.params.themeName as string;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    const puzzles = await puzzleService.getPuzzlesByTheme(themeName, limit, offset);

    res.json({
      theme: themeName,
      puzzles,
      count: puzzles.length
    });
  } catch (error) {
    console.error('Error getting puzzles by theme:', error);
    res.status(500).json({ error: 'Failed to get puzzles' });
  }
};

/**
 * Get all puzzle themes
 * GET /api/puzzles/themes
 */
export const getPuzzleThemes = async (req: Request, res: Response) => {
  try {
    const themes = await puzzleService.getThemes();

    res.json(themes);
  } catch (error) {
    console.error('Error getting puzzle themes:', error);
    res.status(500).json({ error: 'Failed to get themes' });
  }
};

/**
 * Verify puzzle solution (for frontend validation)
 * POST /api/puzzles/:puzzleId/verify
 * Body: { userMoves: string[] }
 */
export const verifyPuzzleSolution = async (req: Request, res: Response) => {
  try {
    const puzzleId = parseInt(req.params.puzzleId as string);
    const { userMoves } = req.body;

    if (isNaN(puzzleId)) {
      return res.status(400).json({ error: 'Invalid puzzle ID' });
    }

    if (!Array.isArray(userMoves)) {
      return res.status(400).json({ error: 'User moves must be an array' });
    }

    const puzzle = await puzzleService.getPuzzleById(puzzleId);
    if (!puzzle) {
      return res.status(404).json({ error: 'Puzzle not found' });
    }

    const isCorrect = puzzleService.verifySolution(puzzle.fen, userMoves, puzzle.moves);

    res.json({
      correct: isCorrect,
      solution: puzzle.moves
    });
  } catch (error) {
    console.error('Error verifying solution:', error);
    res.status(500).json({ error: 'Failed to verify solution' });
  }
};
