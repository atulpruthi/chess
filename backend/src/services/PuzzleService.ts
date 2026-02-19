import pool from '../config/database';
import { Chess } from 'chess.js';

interface Puzzle {
  id: number;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  popularity: number;
  nbPlays: number;
  nbSolved: number;
  solutionRate: number;
  openingTags: string[];
  gameUrl?: string;
}

interface PuzzleAttempt {
  puzzleId: number;
  solved: boolean;
  attempts: number;
  timeSpent: number;
  ratingChange?: number;
}

interface UserPuzzleStats {
  puzzleRating: number;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeSpent: number;
  accuracy: number;
}

class PuzzleService {
  /**
   * Get a random puzzle for the user based on their rating
   */
  async getRandomPuzzle(userId: number, difficulty?: 'easy' | 'medium' | 'hard'): Promise<Puzzle | null> {
    try {
      // Get user's puzzle rating
      const userStats = await this.getUserStats(userId);
      const userRating = userStats.puzzleRating;

      // Determine rating range based on difficulty
      let minRating, maxRating;
      if (difficulty === 'easy') {
        minRating = Math.max(800, userRating - 300);
        maxRating = userRating - 100;
      } else if (difficulty === 'hard') {
        minRating = userRating + 100;
        maxRating = Math.min(2800, userRating + 300);
      } else {
        // medium or default
        minRating = userRating - 150;
        maxRating = userRating + 150;
      }

      // Get puzzles not yet attempted by this user
      const result = await pool.query(
        `SELECT p.* FROM puzzles p
         WHERE p.rating BETWEEN $1 AND $2
         AND p.id NOT IN (
           SELECT puzzle_id FROM puzzle_attempts 
           WHERE user_id = $3 AND solved = true
         )
         ORDER BY RANDOM()
         LIMIT 1`,
        [minRating, maxRating, userId]
      );

      if (result.rows.length === 0) {
        // If all puzzles solved, get any puzzle in range
        const anyResult = await pool.query(
          `SELECT * FROM puzzles 
           WHERE rating BETWEEN $1 AND $2
           ORDER BY RANDOM()
           LIMIT 1`,
          [minRating, maxRating]
        );
        
        if (anyResult.rows.length === 0) return null;
        return this.mapPuzzle(anyResult.rows[0]);
      }

      return this.mapPuzzle(result.rows[0]);
    } catch (error) {
      console.error('Error getting random puzzle:', error);
      return null;
    }
  }

  /**
   * Get daily puzzle
   */
  async getDailyPuzzle(): Promise<Puzzle | null> {
    try {
      const result = await pool.query(
        `SELECT p.* FROM puzzles p
         JOIN daily_puzzles dp ON p.id = dp.puzzle_id
         WHERE dp.date = CURRENT_DATE
         LIMIT 1`
      );

      if (result.rows.length === 0) {
        // Generate new daily puzzle
        await this.generateDailyPuzzle();
        return this.getDailyPuzzle();
      }

      return this.mapPuzzle(result.rows[0]);
    } catch (error) {
      console.error('Error getting daily puzzle:', error);
      return null;
    }
  }

  /**
   * Get puzzle by ID
   */
  async getPuzzleById(puzzleId: number): Promise<Puzzle | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM puzzles WHERE id = $1',
        [puzzleId]
      );

      if (result.rows.length === 0) return null;
      return this.mapPuzzle(result.rows[0]);
    } catch (error) {
      console.error('Error getting puzzle by ID:', error);
      return null;
    }
  }

  /**
   * Submit puzzle attempt
   */
  async submitAttempt(userId: number, puzzleId: number, attemptData: PuzzleAttempt): Promise<{ 
    success: boolean; 
    ratingChange: number;
    newRating: number;
  }> {
    try {
      const { solved, attempts, timeSpent } = attemptData;

      // Get puzzle and user stats
      const puzzle = await this.getPuzzleById(puzzleId);
      if (!puzzle) throw new Error('Puzzle not found');

      const userStats = await this.getUserStats(userId);
      const oldRating = userStats.puzzleRating;

      // Calculate rating change using a simplified Elo system
      const K = 32; // K-factor
      const expectedScore = 1 / (1 + Math.pow(10, (puzzle.rating - oldRating) / 400));
      const actualScore = solved ? 1 : 0;
      const ratingChange = Math.round(K * (actualScore - expectedScore));
      const newRating = Math.max(800, oldRating + ratingChange);

      // Record attempt
      await pool.query(
        `INSERT INTO puzzle_attempts 
         (user_id, puzzle_id, solved, attempts, time_spent, rating_before, rating_after, rating_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [userId, puzzleId, solved, attempts, timeSpent, oldRating, newRating, ratingChange]
      );

      // Update puzzle stats
      await pool.query(
        `UPDATE puzzles 
         SET nb_plays = nb_plays + 1,
             nb_solved = nb_solved + $1,
             solution_rate = ROUND((nb_solved::numeric + $1) / (nb_plays::numeric + 1) * 100, 2)
         WHERE id = $2`,
        [solved ? 1 : 0, puzzleId]
      );

      // Update user puzzle stats
      const newStreak = solved ? userStats.currentStreak + 1 : 0;
      const bestStreak = Math.max(userStats.bestStreak, newStreak);

      await pool.query(
        `INSERT INTO user_puzzle_stats (user_id, puzzle_rating, puzzles_attempted, puzzles_solved, current_streak, best_streak, total_time_spent, last_puzzle_at)
         VALUES ($1, $2, 1, $3, $4, $5, $6, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           puzzle_rating = $2,
           puzzles_attempted = user_puzzle_stats.puzzles_attempted + 1,
           puzzles_solved = user_puzzle_stats.puzzles_solved + $3,
           current_streak = $4,
           best_streak = $5,
           total_time_spent = user_puzzle_stats.total_time_spent + $6,
           last_puzzle_at = NOW(),
           updated_at = NOW()`,
        [userId, newRating, solved ? 1 : 0, newStreak, bestStreak, timeSpent]
      );

      return {
        success: true,
        ratingChange,
        newRating
      };
    } catch (error) {
      console.error('Error submitting puzzle attempt:', error);
      throw error;
    }
  }

  /**
   * Get user puzzle statistics
   */
  async getUserStats(userId: number): Promise<UserPuzzleStats> {
    try {
      const result = await pool.query(
        'SELECT * FROM user_puzzle_stats WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        // Return default stats for new users
        return {
          puzzleRating: 1200,
          puzzlesAttempted: 0,
          puzzlesSolved: 0,
          currentStreak: 0,
          bestStreak: 0,
          totalTimeSpent: 0,
          accuracy: 0
        };
      }

      const stats = result.rows[0];
      const accuracy = stats.puzzles_attempted > 0 
        ? Math.round((stats.puzzles_solved / stats.puzzles_attempted) * 100) 
        : 0;

      return {
        puzzleRating: stats.puzzle_rating,
        puzzlesAttempted: stats.puzzles_attempted,
        puzzlesSolved: stats.puzzles_solved,
        currentStreak: stats.current_streak,
        bestStreak: stats.best_streak,
        totalTimeSpent: stats.total_time_spent,
        accuracy
      };
    } catch (error) {
      console.error('Error getting user puzzle stats:', error);
      throw error;
    }
  }

  /**
   * Get puzzles by theme
   */
  async getPuzzlesByTheme(theme: string, limit: number = 10, offset: number = 0): Promise<Puzzle[]> {
    try {
      const result = await pool.query(
        `SELECT * FROM puzzles 
         WHERE $1 = ANY(themes)
         ORDER BY rating
         LIMIT $2 OFFSET $3`,
        [theme, limit, offset]
      );

      return result.rows.map(row => this.mapPuzzle(row));
    } catch (error) {
      console.error('Error getting puzzles by theme:', error);
      return [];
    }
  }

  /**
   * Get all puzzle themes
   */
  async getThemes(): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM puzzle_themes ORDER BY difficulty_min'
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting puzzle themes:', error);
      return [];
    }
  }

  /**
   * Verify puzzle solution
   */
  verifySolution(fen: string, userMoves: string[], correctMoves: string[]): boolean {
    try {
      const game = new Chess(fen);
      
      // Check if user made the correct first move
      if (userMoves.length === 0 || userMoves[0] !== correctMoves[0]) {
        return false;
      }

      // Play through all moves
      for (let i = 0; i < correctMoves.length; i++) {
        // User move
        if (i < userMoves.length) {
          if (userMoves[i] !== correctMoves[i]) {
            return false;
          }
          game.move(userMoves[i]);
        }

        // Opponent move (if exists)
        if (i + 1 < correctMoves.length) {
          game.move(correctMoves[i + 1]);
          i++; // Skip opponent move in next iteration
        }
      }

      return true;
    } catch (error) {
      console.error('Error verifying solution:', error);
      return false;
    }
  }

  /**
   * Generate daily puzzle
   */
  private async generateDailyPuzzle(): Promise<void> {
    try {
      // Select a puzzle with medium-high rating and good solution rate
      const result = await pool.query(
        `SELECT id FROM puzzles 
         WHERE rating BETWEEN 1400 AND 1800
         AND solution_rate >= 50
         ORDER BY RANDOM()
         LIMIT 1`
      );

      if (result.rows.length > 0) {
        await pool.query(
          'INSERT INTO daily_puzzles (puzzle_id, date) VALUES ($1, CURRENT_DATE) ON CONFLICT (date) DO NOTHING',
          [result.rows[0].id]
        );
      }
    } catch (error) {
      console.error('Error generating daily puzzle:', error);
    }
  }

  /**
   * Map database row to Puzzle object
   */
  private mapPuzzle(row: any): Puzzle {
    return {
      id: row.id,
      fen: row.fen,
      moves: row.moves,
      rating: row.rating,
      themes: row.themes,
      popularity: row.popularity,
      nbPlays: row.nb_plays,
      nbSolved: row.nb_solved,
      solutionRate: parseFloat(row.solution_rate) || 0,
      openingTags: row.opening_tags || [],
      gameUrl: row.game_url
    };
  }
}

export const puzzleService = new PuzzleService();
export default PuzzleService;
