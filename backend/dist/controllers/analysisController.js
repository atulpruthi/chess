"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserBookmarks = exports.bookmarkPosition = exports.likeCommentary = exports.getGameCommentaries = exports.addCommentary = exports.getCriticalPositions = exports.getGameAnalysis = exports.analyzeGame = void 0;
const GameAnalysisService_1 = __importDefault(require("../services/GameAnalysisService"));
const database_1 = __importDefault(require("../config/database"));
const analyzeGame = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        const depth = parseInt(req.body.depth) || 20;
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        // Check if analysis already exists
        const existing = await GameAnalysisService_1.default.getGameAnalysis(gameId);
        if (existing && existing.analysisCompleted) {
            return res.json({
                message: 'Analysis already exists',
                analysis: existing,
            });
        }
        // Start analysis (this can take a while)
        const analysis = await GameAnalysisService_1.default.analyzeGame(gameId, depth);
        res.json({
            message: 'Game analysis completed',
            analysis,
        });
    }
    catch (error) {
        console.error('Error analyzing game:', error);
        res.status(500).json({ error: 'Failed to analyze game' });
    }
};
exports.analyzeGame = analyzeGame;
const getGameAnalysis = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const analysis = await GameAnalysisService_1.default.getGameAnalysis(gameId);
        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found' });
        }
        res.json(analysis);
    }
    catch (error) {
        console.error('Error fetching analysis:', error);
        res.status(500).json({ error: 'Failed to fetch analysis' });
    }
};
exports.getGameAnalysis = getGameAnalysis;
const getCriticalPositions = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const positions = await GameAnalysisService_1.default.getCriticalPositions(gameId);
        res.json(positions);
    }
    catch (error) {
        console.error('Error fetching critical positions:', error);
        res.status(500).json({ error: 'Failed to fetch critical positions' });
    }
};
exports.getCriticalPositions = getCriticalPositions;
const addCommentary = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        const userId = req.userId;
        const { moveNumber, content, variations, commentaryType } = req.body;
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }
        const result = await database_1.default.query(`INSERT INTO commentary (game_id, author_id, commentary_type, move_number, content, variations)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [gameId, userId, commentaryType || 'user', moveNumber || null, content, variations || null]);
        res.status(201).json({
            message: 'Commentary added successfully',
            commentary: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error adding commentary:', error);
        res.status(500).json({ error: 'Failed to add commentary' });
    }
};
exports.addCommentary = addCommentary;
const getGameCommentaries = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const result = await database_1.default.query(`SELECT c.*, u.username, u.avatar_url,
        (SELECT COUNT(*) FROM commentary_likes WHERE commentary_id = c.id) as like_count
       FROM commentary c
       JOIN users u ON c.author_id = u.id
       WHERE c.game_id = $1
       ORDER BY c.move_number NULLS FIRST, c.created_at`, [gameId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching commentaries:', error);
        res.status(500).json({ error: 'Failed to fetch commentaries' });
    }
};
exports.getGameCommentaries = getGameCommentaries;
const likeCommentary = async (req, res) => {
    try {
        const commentaryId = parseInt(String(req.params.commentaryId));
        const userId = req.userId;
        if (isNaN(commentaryId)) {
            return res.status(400).json({ error: 'Invalid commentary ID' });
        }
        // Toggle like
        const existing = await database_1.default.query('SELECT * FROM commentary_likes WHERE user_id = $1 AND commentary_id = $2', [userId, commentaryId]);
        if (existing.rows.length > 0) {
            // Unlike
            await database_1.default.query('DELETE FROM commentary_likes WHERE user_id = $1 AND commentary_id = $2', [userId, commentaryId]);
            res.json({ message: 'Commentary unliked' });
        }
        else {
            // Like
            await database_1.default.query('INSERT INTO commentary_likes (user_id, commentary_id) VALUES ($1, $2)', [userId, commentaryId]);
            // Update like count
            await database_1.default.query('UPDATE commentary SET likes = likes + 1 WHERE id = $1', [commentaryId]);
            res.json({ message: 'Commentary liked' });
        }
    }
    catch (error) {
        console.error('Error liking commentary:', error);
        res.status(500).json({ error: 'Failed to like commentary' });
    }
};
exports.likeCommentary = likeCommentary;
const bookmarkPosition = async (req, res) => {
    try {
        const gameId = parseInt(String(req.params.gameId));
        const userId = req.userId;
        const { moveNumber, fen, note, tags } = req.body;
        if (isNaN(gameId)) {
            return res.status(400).json({ error: 'Invalid game ID' });
        }
        const result = await database_1.default.query(`INSERT INTO position_bookmarks (user_id, game_id, move_number, fen, note, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`, [userId, gameId, moveNumber, fen, note || null, tags || null]);
        res.status(201).json({
            message: 'Position bookmarked successfully',
            bookmark: result.rows[0],
        });
    }
    catch (error) {
        console.error('Error bookmarking position:', error);
        res.status(500).json({ error: 'Failed to bookmark position' });
    }
};
exports.bookmarkPosition = bookmarkPosition;
const getUserBookmarks = async (req, res) => {
    try {
        const userId = req.userId;
        const result = await database_1.default.query(`SELECT pb.*, g.white_player_id, g.black_player_id,
        w.username as white_username, b.username as black_username
       FROM position_bookmarks pb
       JOIN games g ON pb.game_id = g.id
       LEFT JOIN users w ON g.white_player_id = w.id
       LEFT JOIN users b ON g.black_player_id = b.id
       WHERE pb.user_id = $1
       ORDER BY pb.created_at DESC`, [userId]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching bookmarks:', error);
        res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
};
exports.getUserBookmarks = getUserBookmarks;
