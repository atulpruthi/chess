import { Request, Response } from 'express';
import { Chess } from 'chess.js';
import { getStockfishInstance, DifficultyLevel } from '../services/StockfishService';
import pool from '../config/database';

export const createBotGame = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { difficulty, playerColor } = req.body as {
      difficulty: DifficultyLevel;
      playerColor: 'white' | 'black';
    };

    if (!['easy', 'medium', 'hard', 'expert'].includes(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty level' });
    }

    if (!['white', 'black'].includes(playerColor)) {
      return res.status(400).json({ error: 'Invalid player color' });
    }

    // Create new game in database
    const chess = new Chess();
    const initialFen = chess.fen();

    const result = await pool.query(
      `INSERT INTO games (white_player_id, black_player_id, game_type, status, current_fen, pgn) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, white_player_id, black_player_id, game_type, status, current_fen, created_at`,
      [
        playerColor === 'white' ? userId : null,
        playerColor === 'black' ? userId : null,
        'bot',
        'active',
        initialFen,
        '',
      ]
    );

    const game = result.rows[0];

    // If player is black, make bot's first move
    let botMove = null;
    if (playerColor === 'black') {
      const stockfish = getStockfishInstance();
      const move = await stockfish.getBestMove(initialFen, difficulty);
      
      chess.move(move);
      
      await pool.query(
        'UPDATE games SET current_fen = $1, pgn = $2 WHERE id = $3',
        [chess.fen(), chess.pgn(), game.id]
      );

      await pool.query(
        'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
        [game.id, 1, move, chess.fen()]
      );

      botMove = move;
    }

    res.status(201).json({
      message: 'Bot game created successfully',
      game: {
        id: game.id,
        difficulty,
        playerColor,
        fen: botMove ? chess.fen() : initialFen,
        status: 'active',
        botMove,
      },
    });
  } catch (error) {
    console.error('Create bot game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const makeBotMove = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { move, difficulty } = req.body as {
      move: string;
      difficulty: DifficultyLevel;
    };

    // Validate game exists and is active
    const gameResult = await pool.query(
      'SELECT * FROM games WHERE id = $1 AND game_type = $2 AND status = $3',
      [gameId, 'bot', 'active']
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    const game = gameResult.rows[0];
    const chess = new Chess(game.current_fen);

    // Validate and make player's move
    try {
      const result = chess.move(move);
      if (!result) {
        return res.status(400).json({ error: 'Invalid move' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid move format' });
    }

    // Check if game is over after player's move
    if (chess.isGameOver()) {
      let result = 'draw';
      if (chess.isCheckmate()) {
        result = chess.turn() === 'w' ? 'black' : 'white';
      }

      await pool.query(
        'UPDATE games SET current_fen = $1, pgn = $2, status = $3, result = $4 WHERE id = $5',
        [chess.fen(), chess.pgn(), 'completed', result, gameId]
      );

      return res.json({
        message: 'Game over',
        fen: chess.fen(),
        gameOver: true,
        result,
      });
    }

    // Save player's move
    const moveNumber = Math.floor(chess.moveNumber());
    await pool.query(
      'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
      [gameId, moveNumber, move, chess.fen()]
    );

    // Get bot's move
    const stockfish = getStockfishInstance();
    const botMove = await stockfish.getBestMove(chess.fen(), difficulty);

    // Make bot's move
    chess.move(botMove);

    // Check if game is over after bot's move
    let gameOver = false;
    let result = null;
    
    if (chess.isGameOver()) {
      gameOver = true;
      result = 'draw';
      if (chess.isCheckmate()) {
        result = chess.turn() === 'w' ? 'black' : 'white';
      }
    }

    // Update game state
    await pool.query(
      'UPDATE games SET current_fen = $1, pgn = $2, status = $3, result = $4 WHERE id = $5',
      [chess.fen(), chess.pgn(), gameOver ? 'completed' : 'active', result, gameId]
    );

    // Save bot's move
    await pool.query(
      'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
      [gameId, moveNumber, botMove, chess.fen()]
    );

    res.json({
      message: 'Move processed successfully',
      fen: chess.fen(),
      botMove,
      gameOver,
      result,
    });
  } catch (error) {
    console.error('Make bot move error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBotGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as any).userId;

    const result = await pool.query(
      `SELECT g.*, 
        u1.username as white_username,
        u2.username as black_username
       FROM games g
       LEFT JOIN users u1 ON g.white_player_id = u1.id
       LEFT JOIN users u2 ON g.black_player_id = u2.id
       WHERE g.id = $1 AND g.game_type = $2
         AND (g.white_player_id = $3 OR g.black_player_id = $3)`,
      [gameId, 'bot', userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];

    // Get move history
    const movesResult = await pool.query(
      'SELECT * FROM moves WHERE game_id = $1 ORDER BY move_number ASC',
      [gameId]
    );

    res.json({
      game: {
        id: game.id,
        fen: game.current_fen,
        pgn: game.pgn,
        status: game.status,
        result: game.result,
        playerColor: game.white_player_id === userId ? 'white' : 'black',
        createdAt: game.created_at,
      },
      moves: movesResult.rows,
    });
  } catch (error) {
    console.error('Get bot game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
