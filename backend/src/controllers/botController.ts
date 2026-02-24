import { Request, Response } from 'express';
import { Chess } from 'chess.js';
import { getStockfishInstance, DifficultyLevel } from '../services/StockfishService';
import pool from '../config/database';

// In-memory storage for guest games
interface GuestGame {
  id: string;
  chess: Chess;
  difficulty: DifficultyLevel;
  playerColor: 'white' | 'black';
  status: 'active' | 'completed';
  result: string | null;
  createdAt: Date;
}

const guestGames = new Map<string, GuestGame>();

const applyBotMove = (chess: Chess, botMove: string) => {
  const uciMatch = botMove.match(/^([a-h][1-8])([a-h][1-8])([qrbn])?$/i);
  if (uciMatch) {
    const [, from, to, promotion] = uciMatch;
    return chess.move({
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      promotion: promotion ? promotion.toLowerCase() : undefined
    });
  }

  return chess.move(botMove);
};

export const getBotHint = async (req: Request, res: Response) => {
  try {
    const { gameId: gameIdParam } = req.params;
    const gameId = Array.isArray(gameIdParam) ? gameIdParam[0] : gameIdParam;
    const userId = (req as any).userId;
    const isGuest = (req as any).isGuest;

    if (!gameId || gameId === 'null' || gameId === 'undefined') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const stockfish = getStockfishInstance();

    // Handle guest games
    if (gameId.startsWith('guest_') || isGuest) {
      const guestGame = guestGames.get(gameId);
      if (!guestGame) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const bestMove = await stockfish.getBestMove(guestGame.chess.fen(), guestGame.difficulty);
      const tempChess = new Chess(guestGame.chess.fen());
      const applied = applyBotMove(tempChess, bestMove);
      if (!applied) {
        return res.status(500).json({ error: 'Failed to generate hint' });
      }

      return res.json({
        moveUci: bestMove,
        moveSan: applied.san,
      });
    }

    const gameIdNumber = Number(gameId);
    if (!Number.isInteger(gameIdNumber)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const gameResult = await pool.query(
      'SELECT * FROM games WHERE id = $1 AND game_type = $2 AND status = $3 AND (white_player_id = $4 OR black_player_id = $4)',
      [gameIdNumber, 'bot', 'active', userId]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    const game = gameResult.rows[0];
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

    const bestMove = await stockfish.getBestMove(chess.fen(), 'medium');
    const tempChess = new Chess(chess.fen());
    const applied = applyBotMove(tempChess, bestMove);
    if (!applied) {
      return res.status(500).json({ error: 'Failed to generate hint' });
    }

    return res.json({
      moveUci: bestMove,
      moveSan: applied.san,
    });
  } catch (error) {
    console.error('Get bot hint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBotGame = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const isGuest = (req as any).isGuest;
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

    const chess = new Chess();
    const initialFen = chess.fen();

    // Handle guest users
    if (isGuest || !userId) {
      const gameId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let botMove = null;
      if (playerColor === 'black') {
        const stockfish = getStockfishInstance();
        const move = await stockfish.getBestMove(initialFen, difficulty);
        chess.move(move);
        botMove = move;
      }

      guestGames.set(gameId, {
        id: gameId,
        chess,
        difficulty,
        playerColor,
        status: 'active',
        result: null,
        createdAt: new Date(),
      });

      return res.status(201).json({
        message: 'Bot game created successfully (guest mode)',
        game: {
          id: gameId,
          difficulty,
          playerColor,
          fen: chess.fen(),
          pgn: chess.pgn(),
          status: 'active',
          botMove,
          isGuest: true,
        },
      });
    }

    // Handle authenticated users - save to database
    const userResult = await pool.query(
      'SELECT rating FROM users WHERE id = $1',
      [userId]
    );
    const userRating = userResult.rows[0]?.rating || 1200;

    const result = await pool.query(
      `INSERT INTO games (
        white_player_id, 
        black_player_id, 
        game_type, 
        status, 
        current_fen, 
        pgn,
        white_rating_before,
        black_rating_before
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id, white_player_id, black_player_id, game_type, status, current_fen, created_at`,
      [
        playerColor === 'white' ? userId : null,
        playerColor === 'black' ? userId : null,
        'bot',
        'active',
        initialFen,
        '',
        playerColor === 'white' ? userRating : null,
        playerColor === 'black' ? userRating : null,
      ]
    );

    const game = result.rows[0];

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
        isGuest: false,
      },
    });
  } catch (error) {
    console.error('Create bot game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const makeBotMove = async (req: Request, res: Response) => {
  try {
    const { gameId: gameIdParam } = req.params;
    const gameId = Array.isArray(gameIdParam) ? gameIdParam[0] : gameIdParam;
    const userId = (req as any).userId;
    const isGuest = (req as any).isGuest;
    const { move, difficulty } = req.body as {
      move: string;
      difficulty: DifficultyLevel;
    };

    if (!gameId || gameId === 'null' || gameId === 'undefined') {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    // Handle guest games
    if (gameId.startsWith('guest_')) {
      const guestGame = guestGames.get(gameId);
      if (!guestGame) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (guestGame.status !== 'active') {
        return res.status(400).json({ error: 'Game is not active' });
      }

      const chess = guestGame.chess;

      // Make player's move
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

        guestGame.status = 'completed';
        guestGame.result = result;

        return res.json({
          message: 'Game over',
          fen: chess.fen(),
          pgn: chess.pgn(),
          gameOver: true,
          result,
        });
      }

      // Get bot's move
      const stockfish = getStockfishInstance();
      let botMove: string;
      
      try {
        botMove = await stockfish.getBestMove(chess.fen(), guestGame.difficulty);
      } catch (error) {
        console.error('Failed to get bot move:', error);
        const moves = chess.moves();
        if (moves.length === 0) {
          return res.status(400).json({ error: 'No legal moves available' });
        }
        botMove = moves[Math.floor(Math.random() * moves.length)];
      }

      // Make bot's move
      try {
        const appliedMove = applyBotMove(chess, botMove);
        if (!appliedMove) {
          throw new Error('Invalid move');
        }
      } catch (error) {
        console.error(`Failed to make bot move ${botMove}:`, error);
        return res.status(500).json({ error: 'Failed to make bot move' });
      }

      // Check if game is over after bot's move
      let gameOver = false;
      let result = null;
      
      if (chess.isGameOver()) {
        gameOver = true;
        result = 'draw';
        if (chess.isCheckmate()) {
          result = chess.turn() === 'w' ? 'black' : 'white';
        }
        guestGame.status = 'completed';
        guestGame.result = result;
      }

      return res.json({
        message: 'Move processed successfully (guest mode)',
        fen: chess.fen(),
        pgn: chess.pgn(),
        botMove,
        gameOver,
        result,
      });
    }

    // Handle authenticated user games - database storage
    const gameIdNumber = Number(gameId);
    if (!Number.isInteger(gameIdNumber)) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    const gameResult = await pool.query(
      'SELECT * FROM games WHERE id = $1 AND game_type = $2 AND status = $3',
      [gameIdNumber, 'bot', 'active']
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or not active' });
    }

    const game = gameResult.rows[0];
    
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

    // Make player's move
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
      [gameIdNumber, playerMoveNumber, move, chess.fen()]
    );

    // Get bot's move
    const stockfish = getStockfishInstance();
    
    let botMove: string;
    try {
      botMove = await stockfish.getBestMove(chess.fen(), difficulty);
    } catch (error) {
      console.error('Failed to get bot move from Stockfish:', error);
      const moves = chess.moves();
      if (moves.length === 0) {
        return res.status(400).json({ error: 'No legal moves available' });
      }
      botMove = moves[Math.floor(Math.random() * moves.length)];
    }

    // Make bot's move
    try {
      const appliedMove = applyBotMove(chess, botMove);
      if (!appliedMove) {
        throw new Error('Invalid move');
      }
    } catch (error) {
      console.error(`Failed to make bot move ${botMove}:`, error);
      return res.status(500).json({ error: 'Failed to make bot move' });
    }

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
      [chess.fen(), chess.pgn(), gameOver ? 'completed' : 'active', result, chess.moveNumber(), gameOver ? new Date() : null, gameIdNumber]
    );

    // Save bot's move
    await pool.query(
      'INSERT INTO moves (game_id, move_number, move_notation, fen) VALUES ($1, $2, $3, $4)',
      [gameIdNumber, botMoveNumber, botMove, chess.fen()]
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
    const { gameId: gameIdParam } = req.params;
    const gameId = Array.isArray(gameIdParam) ? gameIdParam[0] : gameIdParam;
    const userId = (req as any).userId;

    // Handle guest games
    if (gameId.startsWith('guest_')) {
      const guestGame = guestGames.get(gameId);
      if (!guestGame) {
        return res.status(404).json({ error: 'Game not found' });
      }

      return res.json({
        game: {
          id: guestGame.id,
          fen: guestGame.chess.fen(),
          pgn: guestGame.chess.pgn(),
          status: guestGame.status,
          result: guestGame.result,
          playerColor: guestGame.playerColor,
          createdAt: guestGame.createdAt,
          isGuest: true,
        },
        moves: [],
      });
    }

    // Handle authenticated user games
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
        isGuest: false,
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
    const { gameId: gameIdParam } = req.params;
    const gameId = Array.isArray(gameIdParam) ? gameIdParam[0] : gameIdParam;
    const userId = (req as any).userId;
    const { action } = req.body as { action: 'resign' | 'draw' };

    // Handle guest games
    if (gameId.startsWith('guest_')) {
      const guestGame = guestGames.get(gameId);
      if (!guestGame) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (guestGame.status !== 'active') {
        return res.status(400).json({ error: 'Game is not active' });
      }

      let result: string;
      if (action === 'resign') {
        result = guestGame.playerColor === 'white' ? 'black' : 'white';
      } else if (action === 'draw') {
        result = 'draw';
      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }

      guestGame.status = 'completed';
      guestGame.result = result;

      return res.json({
        message: 'Game ended successfully (guest mode)',
        result,
        gameOver: true,
      });
    }

    // Handle authenticated user games
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

