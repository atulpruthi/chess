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
        pgn: botMove ? chess.pgn() : '',
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
    
    // Load game from PGN to preserve move history
    const chess = new Chess();
    if (game.pgn) {
      try {
        chess.loadPgn(game.pgn);
      } catch (e) {
        // If PGN fails to load, fall back to FEN
        chess.load(game.current_fen);
      }
    } else if (game.current_fen) {
      chess.load(game.current_fen);
    }

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
        'UPDATE games SET current_fen = $1, pgn = $2, status = $3, result = $4, total_moves = $5, completed_at = NOW() WHERE id = $6',
        [chess.fen(), chess.pgn(), 'completed', result, chess.moveNumber(), gameId]
      );

      return res.json({
        message: 'Game over',
        fen: chess.fen(),
        pgn: chess.pgn(),
        gameOver: true,
        result,
      });
    }

    // Save player's move
    const playerMoveNumber = Math.floor(chess.moveNumber());
    await pool.query(
      'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
      [gameId, playerMoveNumber, move, chess.fen()]
    );

    // Get bot's move
    console.log(`Getting bot move for difficulty: ${difficulty}, FEN: ${chess.fen()}`);
    const stockfish = getStockfishInstance();
    
    let botMove: string;
    try {
      botMove = await stockfish.getBestMove(chess.fen(), difficulty);
      console.log(`Bot move received: ${botMove}`);
    } catch (error) {
      console.error('Failed to get bot move from Stockfish:', error);
      // Fallback to random legal move
      const moves = chess.moves();
      if (moves.length === 0) {
        return res.status(400).json({ error: 'No legal moves available' });
      }
      botMove = moves[Math.floor(Math.random() * moves.length)];
      console.log(`Using fallback random move: ${botMove}`);
    }

    // Make bot's move
    try {
      chess.move(botMove);
    } catch (error) {
      console.error(`Failed to make bot move ${botMove}:`, error);
      return res.status(500).json({ error: 'Failed to make bot move' });
    }

    // Calculate move number for bot's move after making the move
    const botMoveNumber = Math.floor(chess.moveNumber());

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
      'UPDATE games SET current_fen = $1, pgn = $2, status = $3, result = $4, total_moves = $5, completed_at = $6 WHERE id = $7',
      [chess.fen(), chess.pgn(), gameOver ? 'completed' : 'active', result, chess.moveNumber(), gameOver ? new Date() : null, gameId]
    );

    // Save bot's move
    await pool.query(
      'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
      [gameId, botMoveNumber, botMove, chess.fen()]
    );

    res.json({
      message: 'Move processed successfully',
      fen: chess.fen(),
      pgn: chess.pgn(),
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

export const endBotGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = (req as any).userId;
    const { action } = req.body as { action: 'resign' | 'draw' };

    // Validate game exists and is active
    const gameResult = await pool.query(
      'SELECT * FROM games WHERE id = $1 AND game_type = $2 AND status = $3 AND (white_player_id = $4 OR black_player_id = $4)',
      [gameId, 'bot', 'active', userId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    const game = gameResult.rows[0];
    const playerColor = game.white_player_id === userId ? 'white' : 'black';

    let result: string;
    if (action === 'resign') {
      result = playerColor === 'white' ? 'black' : 'white';
    } else if (action === 'draw') {
      result = 'draw';
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Load current game state to get move count
    const chess = new Chess();
    if (game.pgn) {
      try {
        chess.loadPgn(game.pgn);
      } catch (e) {
        chess.load(game.current_fen);
      }
    } else if (game.current_fen) {
      chess.load(game.current_fen);
    }

    // Update game status
    await pool.query(
      'UPDATE games SET status = $1, result = $2, completed_at = NOW(), total_moves = $3 WHERE id = $4',
      ['completed', result, chess.moveNumber(), gameId]
    );

    res.json({
      message: 'Game ended successfully',
      result,
      gameOver: true,
    });
  } catch (error) {
    console.error('End bot game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

