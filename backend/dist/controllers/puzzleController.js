"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPuzzleSolution = exports.getPuzzleThemes = exports.getPuzzlesByTheme = exports.getUserPuzzleStats = exports.submitPuzzleAttempt = exports.getPuzzleById = exports.getDailyPuzzle = exports.getRandomPuzzle = void 0;
const PuzzleService_1 = require("../services/PuzzleService");
/**
 * Get a random puzzle for the authenticated user
 * GET /api/puzzles/random?difficulty=medium
 */
const getRandomPuzzle = async (req, res) => {
    try {
        const userId = req.userId;
        const difficulty = req.query.difficulty;
        const puzzle = await PuzzleService_1.puzzleService.getRandomPuzzle(userId, difficulty);
        if (!puzzle) {
            return res.status(404).json({ error: 'No puzzles available' });
        }
        res.json(puzzle);
    }
    catch (error) {
        console.error('Error getting random puzzle:', error);
        res.status(500).json({ error: 'Failed to get puzzle' });
    }
};
exports.getRandomPuzzle = getRandomPuzzle;
/**
 * Get the daily puzzle
 * GET /api/puzzles/daily
 */
const getDailyPuzzle = async (req, res) => {
    try {
        const puzzle = await PuzzleService_1.puzzleService.getDailyPuzzle();
        if (!puzzle) {
            return res.status(404).json({ error: 'Daily puzzle not available' });
        }
        res.json(puzzle);
    }
    catch (error) {
        console.error('Error getting daily puzzle:', error);
        res.status(500).json({ error: 'Failed to get daily puzzle' });
    }
};
exports.getDailyPuzzle = getDailyPuzzle;
/**
 * Get a specific puzzle by ID
 * GET /api/puzzles/:puzzleId
 */
const getPuzzleById = async (req, res) => {
    try {
        const puzzleId = parseInt(req.params.puzzleId);
        if (isNaN(puzzleId)) {
            return res.status(400).json({ error: 'Invalid puzzle ID' });
        }
        const puzzle = await PuzzleService_1.puzzleService.getPuzzleById(puzzleId);
        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }
        res.json(puzzle);
    }
    catch (error) {
        console.error('Error getting puzzle:', error);
        res.status(500).json({ error: 'Failed to get puzzle' });
    }
};
exports.getPuzzleById = getPuzzleById;
/**
 * Submit a puzzle attempt
 * POST /api/puzzles/:puzzleId/attempt
 * Body: { solved: boolean, attempts: number, timeSpent: number, userMoves: string[] }
 */
const submitPuzzleAttempt = async (req, res) => {
    try {
        const userId = req.userId;
        const puzzleId = parseInt(req.params.puzzleId);
        const { solved, attempts, timeSpent, userMoves } = req.body;
        if (isNaN(puzzleId)) {
            return res.status(400).json({ error: 'Invalid puzzle ID' });
        }
        if (typeof solved !== 'boolean' || typeof attempts !== 'number' || typeof timeSpent !== 'number') {
            return res.status(400).json({ error: 'Invalid request data' });
        }
        // Verify solution if user claims they solved it
        if (solved && userMoves) {
            const puzzle = await PuzzleService_1.puzzleService.getPuzzleById(puzzleId);
            if (!puzzle) {
                return res.status(404).json({ error: 'Puzzle not found' });
            }
            const isCorrect = PuzzleService_1.puzzleService.verifySolution(puzzle.fen, userMoves, puzzle.moves);
            if (!isCorrect) {
                return res.status(400).json({ error: 'Solution incorrect' });
            }
        }
        const result = await PuzzleService_1.puzzleService.submitAttempt(userId, puzzleId, {
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
    }
    catch (error) {
        console.error('Error submitting puzzle attempt:', error);
        res.status(500).json({ error: 'Failed to submit attempt' });
    }
};
exports.submitPuzzleAttempt = submitPuzzleAttempt;
/**
 * Get user puzzle statistics
 * GET /api/puzzles/stats
 */
const getUserPuzzleStats = async (req, res) => {
    try {
        const userId = req.userId;
        const stats = await PuzzleService_1.puzzleService.getUserStats(userId);
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting puzzle stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
};
exports.getUserPuzzleStats = getUserPuzzleStats;
/**
 * Get puzzles by theme
 * GET /api/puzzles/theme/:themeName?limit=10&offset=0
 */
const getPuzzlesByTheme = async (req, res) => {
    try {
        const themeName = req.params.themeName;
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;
        const puzzles = await PuzzleService_1.puzzleService.getPuzzlesByTheme(themeName, limit, offset);
        res.json({
            theme: themeName,
            puzzles,
            count: puzzles.length
        });
    }
    catch (error) {
        console.error('Error getting puzzles by theme:', error);
        res.status(500).json({ error: 'Failed to get puzzles' });
    }
};
exports.getPuzzlesByTheme = getPuzzlesByTheme;
/**
 * Get all puzzle themes
 * GET /api/puzzles/themes
 */
const getPuzzleThemes = async (req, res) => {
    try {
        const themes = await PuzzleService_1.puzzleService.getThemes();
        res.json(themes);
    }
    catch (error) {
        console.error('Error getting puzzle themes:', error);
        res.status(500).json({ error: 'Failed to get themes' });
    }
};
exports.getPuzzleThemes = getPuzzleThemes;
/**
 * Verify puzzle solution (for frontend validation)
 * POST /api/puzzles/:puzzleId/verify
 * Body: { userMoves: string[] }
 */
const verifyPuzzleSolution = async (req, res) => {
    try {
        const puzzleId = parseInt(req.params.puzzleId);
        const { userMoves } = req.body;
        if (isNaN(puzzleId)) {
            return res.status(400).json({ error: 'Invalid puzzle ID' });
        }
        if (!Array.isArray(userMoves)) {
            return res.status(400).json({ error: 'User moves must be an array' });
        }
        const puzzle = await PuzzleService_1.puzzleService.getPuzzleById(puzzleId);
        if (!puzzle) {
            return res.status(404).json({ error: 'Puzzle not found' });
        }
        const isCorrect = PuzzleService_1.puzzleService.verifySolution(puzzle.fen, userMoves, puzzle.moves);
        res.json({
            correct: isCorrect,
            solution: puzzle.moves
        });
    }
    catch (error) {
        console.error('Error verifying solution:', error);
        res.status(500).json({ error: 'Failed to verify solution' });
    }
};
exports.verifyPuzzleSolution = verifyPuzzleSolution;
