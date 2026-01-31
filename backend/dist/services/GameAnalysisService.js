"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chess_js_1 = require("chess.js");
const database_1 = __importDefault(require("../config/database"));
const StockfishService_1 = require("./StockfishService");
class GameAnalysisService {
    /**
     * Analyze a complete game
     */
    async analyzeGame(gameId, depth = 20) {
        const client = await database_1.default.connect();
        const stockfish = (0, StockfishService_1.getStockfishInstance)();
        try {
            await client.query('BEGIN');
            // Get game data
            const gameResult = await client.query('SELECT pgn, white_player_id, black_player_id FROM games WHERE id = $1', [gameId]);
            if (gameResult.rows.length === 0) {
                throw new Error('Game not found');
            }
            const { pgn } = gameResult.rows[0];
            // Create or get analysis record
            let analysisResult = await client.query('SELECT id FROM game_analysis WHERE game_id = $1', [gameId]);
            let analysisId;
            if (analysisResult.rows.length === 0) {
                const insertResult = await client.query('INSERT INTO game_analysis (game_id, depth) VALUES ($1, $2) RETURNING id', [gameId, depth]);
                analysisId = insertResult.rows[0].id;
            }
            else {
                analysisId = analysisResult.rows[0].id;
                // Clear existing move analysis
                await client.query('DELETE FROM move_analysis WHERE analysis_id = $1', [analysisId]);
            }
            // Parse game and analyze each position
            const chess = new chess_js_1.Chess();
            chess.loadPgn(pgn);
            const moves = chess.history({ verbose: true });
            const moveEvaluations = [];
            // Analyze each move
            for (let i = 0; i < moves.length; i++) {
                const move = moves[i];
                // Reset to position before this move
                const tempChess = new chess_js_1.Chess();
                tempChess.loadPgn(pgn);
                const history = tempChess.history();
                // Undo moves to get to position before current move
                const movesToUndo = history.length - i;
                for (let j = 0; j < movesToUndo; j++) {
                    tempChess.undo();
                }
                const fenBefore = tempChess.fen();
                // Make the move
                tempChess.move(move.san);
                const fenAfter = tempChess.fen();
                // Get evaluation before move (best possible)
                const evalBefore = await stockfish.evaluatePosition(fenBefore, depth);
                // Get evaluation after move (actual position)
                const evalAfter = await stockfish.evaluatePosition(fenAfter, depth);
                // Calculate centipawn loss
                const centipawnLoss = this.calculateCentipawnLoss(evalBefore.evaluation, evalAfter.evaluation, move.color);
                // Classify move
                const classification = this.classifyMove(centipawnLoss, evalBefore.mateIn, evalAfter.mateIn);
                const moveEval = {
                    moveNumber: Math.floor(i / 2) + 1,
                    playerColor: move.color === 'w' ? 'white' : 'black',
                    moveSan: move.san,
                    moveUci: `${move.from}${move.to}${move.promotion || ''}`,
                    fenBefore,
                    fenAfter,
                    evaluation: evalAfter.evaluation,
                    mateIn: evalAfter.mateIn,
                    bestMoveSan: evalBefore.bestMove ? this.uciToSan(fenBefore, evalBefore.bestMove) : null,
                    bestMoveUci: evalBefore.bestMove,
                    bestEvaluation: evalBefore.evaluation,
                    centipawnLoss,
                    classification,
                    isBookMove: i < 10, // Simple heuristic, first 10 moves considered book
                    isForced: evalBefore.isForced || false,
                };
                moveEvaluations.push(moveEval);
                // Save move analysis to database
                await client.query(`INSERT INTO move_analysis (
            analysis_id, move_number, player_color, move_san, move_uci,
            fen_before, fen_after, evaluation, mate_in, best_move_san, best_move_uci,
            best_evaluation, centipawn_loss, classification, is_book_move, is_forced
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [
                    analysisId, moveEval.moveNumber, moveEval.playerColor, moveEval.moveSan, moveEval.moveUci,
                    moveEval.fenBefore, moveEval.fenAfter, moveEval.evaluation, moveEval.mateIn,
                    moveEval.bestMoveSan, moveEval.bestMoveUci, moveEval.bestEvaluation,
                    moveEval.centipawnLoss, moveEval.classification, moveEval.isBookMove, moveEval.isForced
                ]);
            }
            // Calculate accuracies
            const accuracyWhite = this.calculateAccuracy(moveEvaluations.filter(m => m.playerColor === 'white'));
            const accuracyBlack = this.calculateAccuracy(moveEvaluations.filter(m => m.playerColor === 'black'));
            // Detect opening
            const opening = await this.detectOpening(chess);
            // Update analysis record
            await client.query(`UPDATE game_analysis SET
          opening_name = $1,
          opening_eco = $2,
          accuracy_white = $3,
          accuracy_black = $4,
          analysis_completed = true,
          updated_at = NOW()
        WHERE id = $5`, [opening.name, opening.eco, accuracyWhite, accuracyBlack, analysisId]);
            await client.query('COMMIT');
            return {
                analysisId,
                openingName: opening.name,
                openingEco: opening.eco,
                accuracyWhite,
                accuracyBlack,
                moves: moveEvaluations,
            };
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
     * Get existing game analysis
     */
    async getGameAnalysis(gameId) {
        const analysisResult = await database_1.default.query(`SELECT * FROM game_analysis WHERE game_id = $1`, [gameId]);
        if (analysisResult.rows.length === 0) {
            return null;
        }
        const analysis = analysisResult.rows[0];
        const movesResult = await database_1.default.query(`SELECT * FROM move_analysis WHERE analysis_id = $1 ORDER BY move_number, player_color`, [analysis.id]);
        return {
            id: analysis.id,
            gameId: analysis.game_id,
            engine: analysis.engine,
            depth: analysis.depth,
            openingName: analysis.opening_name,
            openingEco: analysis.opening_eco,
            accuracyWhite: analysis.accuracy_white,
            accuracyBlack: analysis.accuracy_black,
            analysisCompleted: analysis.analysis_completed,
            moves: movesResult.rows.map(row => ({
                moveNumber: row.move_number,
                playerColor: row.player_color,
                moveSan: row.move_san,
                moveUci: row.move_uci,
                evaluation: row.evaluation,
                mateIn: row.mate_in,
                bestMoveSan: row.best_move_san,
                bestMoveUci: row.best_move_uci,
                bestEvaluation: row.best_evaluation,
                centipawnLoss: row.centipawn_loss,
                classification: row.classification,
                isBookMove: row.is_book_move,
                isForced: row.is_forced,
            })),
            createdAt: analysis.created_at,
        };
    }
    /**
     * Calculate centipawn loss
     */
    calculateCentipawnLoss(evalBefore, evalAfter, playerColor) {
        // Normalize evaluations from perspective of player to move
        const beforeNorm = playerColor === 'w' ? evalBefore : -evalBefore;
        const afterNorm = playerColor === 'w' ? -evalAfter : evalAfter;
        const loss = beforeNorm - afterNorm;
        return Math.max(0, loss);
    }
    /**
     * Classify move based on centipawn loss
     */
    classifyMove(centipawnLoss, mateInBefore, mateInAfter) {
        // Missed mate or turned winning into losing
        if (mateInBefore && !mateInAfter) {
            return 'blunder';
        }
        // Found mate
        if (!mateInBefore && mateInAfter) {
            return 'brilliant';
        }
        // Classify by centipawn loss
        if (centipawnLoss <= 10) {
            return 'good';
        }
        else if (centipawnLoss <= 25) {
            return 'good';
        }
        else if (centipawnLoss <= 50) {
            return 'inaccuracy';
        }
        else if (centipawnLoss <= 100) {
            return 'mistake';
        }
        else {
            return 'blunder';
        }
    }
    /**
     * Calculate player accuracy (0-100)
     */
    calculateAccuracy(moves) {
        if (moves.length === 0)
            return 100;
        let totalAccuracy = 0;
        let moveCount = 0;
        for (const move of moves) {
            if (move.isBookMove)
                continue; // Skip book moves
            const loss = move.centipawnLoss;
            // Accuracy formula: 103.1668 * e^(-0.04354 * loss) - 3.1669
            const accuracy = Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * loss) - 3.1669));
            totalAccuracy += accuracy;
            moveCount++;
        }
        return moveCount > 0 ? Math.round((totalAccuracy / moveCount) * 100) / 100 : 100;
    }
    /**
     * Detect opening from position
     */
    async detectOpening(chess) {
        // Get first 10 moves
        const history = chess.history();
        if (history.length === 0) {
            return { name: 'Starting Position', eco: 'A00' };
        }
        // Try to match against opening book
        const tempChess = new chess_js_1.Chess();
        let lastMatch = { name: 'Unknown Opening', eco: 'A00' };
        for (let i = 0; i < Math.min(history.length, 20); i++) {
            tempChess.move(history[i]);
            const fen = tempChess.fen().split(' ').slice(0, 3).join(' '); // Just piece positions
            const result = await database_1.default.query('SELECT opening_name, eco_code FROM opening_book WHERE fen LIKE $1 || \'%\' LIMIT 1', [fen]);
            if (result.rows.length > 0) {
                lastMatch = {
                    name: result.rows[0].opening_name,
                    eco: result.rows[0].eco_code,
                };
            }
        }
        return lastMatch;
    }
    /**
     * Convert UCI move to SAN
     */
    uciToSan(fen, uci) {
        if (!uci)
            return null;
        try {
            const chess = new chess_js_1.Chess(fen);
            const move = chess.move({
                from: uci.substring(0, 2),
                to: uci.substring(2, 4),
                promotion: uci.length > 4 ? uci[4] : undefined,
            });
            return move ? move.san : null;
        }
        catch {
            return null;
        }
    }
    /**
     * Get critical positions (blunders, brilliant moves)
     */
    async getCriticalPositions(gameId) {
        const result = await database_1.default.query(`SELECT ma.*, ga.game_id
       FROM move_analysis ma
       JOIN game_analysis ga ON ma.analysis_id = ga.id
       WHERE ga.game_id = $1
       AND (ma.classification IN ('blunder', 'brilliant', 'mistake'))
       ORDER BY ma.move_number`, [gameId]);
        return result.rows;
    }
}
exports.default = new GameAnalysisService();
