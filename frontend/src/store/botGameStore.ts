import { create } from 'zustand';
import { Chess } from 'chess.js';
import api from '../services/api';
import { soundService } from '../services/soundService';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

interface BotGameState {
  gameId: string | null;
  chess: Chess;
  fen: string;
  moveHistory: string[];
  capturedPieces: {
    white: string[];
    black: string[];
  };
  turn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  gameOver: boolean;
  result: string | null;
  playerColor: 'white' | 'black';
  difficulty: DifficultyLevel;
  isThinking: boolean;
  
  // Actions
  createGame: (difficulty: DifficultyLevel, playerColor: 'white' | 'black') => Promise<void>;
  makeMove: (move: { from: string; to: string; promotion?: string }) => Promise<void>;
  resetGame: () => void;
  undoMove: () => void;
  setPromotionSquare: (from: string | null, to: string | null) => void;
  promoteAndMove: (from: string, to: string, piece: string) => Promise<void>;
  resign: () => void;
  offerDraw: () => void;
  resetThinkingState: () => void;
}

const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const updateCapturedPieces = (chess: Chess) => {
  const captured = { white: [] as string[], black: [] as string[] };
  const history = chess.history({ verbose: true });
  
  history.forEach((move: any) => {
    if (move.captured) {
      const piece = move.captured;
      if (move.color === 'w') {
        captured.black.push(piece);
      } else {
        captured.white.push(piece);
      }
    }
  });
  
  return captured;
};

export const useBotGameStore = create<BotGameState>((set, get) => ({
  gameId: null,
  chess: new Chess(),
  fen: initialFen,
  moveHistory: [],
  capturedPieces: { white: [], black: [] },
  turn: 'w',
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isDraw: false,
  gameOver: false,
  result: null,
  playerColor: 'white',
  difficulty: 'medium',
  isThinking: false,

  createGame: async (difficulty: DifficultyLevel, playerColor: 'white' | 'black') => {
    try {
      const response = await api.post('/api/bot/create', {
        difficulty,
        playerColor,
      });

      const { game } = response.data;
      const chess = new Chess();
      
      // Load PGN if available (e.g., when bot makes first move)
      if (game.pgn) {
        chess.loadPgn(game.pgn);
      } else if (game.fen && game.fen !== initialFen) {
        chess.load(game.fen);
      }

      set({
        gameId: game.id,
        chess,
        fen: chess.fen(),
        moveHistory: chess.history(),
        capturedPieces: updateCapturedPieces(chess),
        turn: chess.turn(),
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        gameOver: false,
        result: null,
        playerColor,
        difficulty,
        isThinking: false,
      });
    } catch (error) {
      console.error('Failed to create bot game:', error);
      throw error;
    }
  },

  makeMove: async (move: { from: string; to: string; promotion?: string }) => {
    const { chess, gameId, difficulty, isThinking } = get();
    
    // Prevent multiple concurrent moves
    if (isThinking) {
      console.warn('Already processing a move');
      return;
    }
    
    try {
      // Validate that the move is legal before attempting
      const moves = chess.moves({ square: move.from as any, verbose: true });
      const isValidMove = moves.some((m: any) => m.to === move.to);
      
      if (!isValidMove) {
        console.warn('Invalid move attempted:', move);
        return;
      }

      // Make move locally first for immediate feedback
      const result = chess.move(move);
      
      if (!result) {
        console.warn('Move failed:', move);
        return;
      }

      // Play sound based on move type
      if ('captured' in result && result.captured) {
        soundService.playCapture();
      } else if (result.san.includes('O-O')) {
        soundService.playCastle();
      } else {
        soundService.playMove();
      }

      // Check for check/checkmate after move
      if (chess.isCheckmate()) {
        soundService.playCheckmate();
      } else if (chess.isCheck()) {
        soundService.playCheck();
      }

      // Update local state
      set({
        fen: chess.fen(),
        moveHistory: chess.history(),
        capturedPieces: updateCapturedPieces(chess),
        turn: chess.turn(),
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
        isThinking: true,
      });

      // Send move to server and get bot's response with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Bot move timeout')), 30000) // 30 second timeout
      );
      
      const responsePromise = api.post(`/api/bot/${gameId}/move`, {
        move: result.san,
        difficulty,
      });

      const response = await Promise.race([responsePromise, timeoutPromise]) as any;

      const { pgn, gameOver, result: gameResult } = response.data;

      // Update with server response - use PGN to maintain full move history
      const newChess = new Chess();
      if (pgn) {
        newChess.loadPgn(pgn);
      }

      // Play bot's move sound
      const lastMove = newChess.history({ verbose: true }).pop();
      if (lastMove) {
        if ('captured' in lastMove && lastMove.captured) {
          soundService.playCapture();
        } else if (lastMove.san.includes('O-O')) {
          soundService.playCastle();
        } else {
          soundService.playMove();
        }

        // Check for check/checkmate after bot move
        if (newChess.isCheckmate()) {
          soundService.playCheckmate();
        } else if (newChess.isCheck()) {
          soundService.playCheck();
        }
      }
      
      set({
        chess: newChess,
        fen: newChess.fen(),
        moveHistory: newChess.history(),
        capturedPieces: updateCapturedPieces(newChess),
        turn: newChess.turn(),
        isCheck: newChess.isCheck(),
        isCheckmate: newChess.isCheckmate(),
        isStalemate: newChess.isStalemate(),
        isDraw: newChess.isDraw(),
        gameOver,
        result: gameResult,
        isThinking: false,
      });
    } catch (error) {
      console.error('Failed to make move:', error);
      set({ isThinking: false });
      
      // Undo the local move if server request fails
      chess.undo();
      set({
        chess,
        fen: chess.fen(),
        moveHistory: chess.history(),
        turn: chess.turn(),
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
      });
    }
  },

  resetGame: () => {
    const newChess = new Chess();
    set({
      gameId: null,
      chess: newChess,
      fen: initialFen,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      turn: 'w',
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      gameOver: false,
      result: null,
      isThinking: false,
    });
  },

  undoMove: () => {
    const { chess, moveHistory, isThinking } = get();
    
    // Can't undo if thinking or if there aren't at least 2 moves (player + bot)
    if (isThinking) {
      console.warn('Cannot undo while bot is thinking');
      return;
    }
    
    if (moveHistory.length < 2) {
      console.warn('Not enough moves to undo');
      return;
    }
    
    // Undo twice (player's move and bot's move)
    const move1 = chess.undo();
    const move2 = chess.undo();
    
    if (!move1 || !move2) {
      // If undo failed, restore the state
      if (move1) chess.move(move1);
      console.error('Failed to undo moves');
      return;
    }
    
    set({
      chess,
      fen: chess.fen(),
      moveHistory: chess.history(),
      capturedPieces: updateCapturedPieces(chess),
      turn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      isThinking: false,
      gameOver: false,
      result: null,
    });
  },

  setPromotionSquare: (from: string | null, to: string | null) => {
    // Used for promotion dialog
    set({ promotionSquare: { from, to } } as any);
  },

  promoteAndMove: async (from: string, to: string, piece: string) => {
    await get().makeMove({ from, to, promotion: piece });
    set({ promotionSquare: null } as any);
  },

  resign: () => {
    const { playerColor, gameId } = get();
    if (!gameId) return;

    const result = playerColor === 'white' ? 'black' : 'white';
    
    // Call backend to save the resignation
    api.post(`/api/bot/${gameId}/end`, { action: 'resign' })
      .catch(error => console.error('Failed to save resignation:', error));
    
    set({
      gameOver: true,
      result,
    });
  },

  offerDraw: () => {
    const { gameId } = get();
    if (!gameId) return;

    // Call backend to save the draw
    api.post(`/api/bot/${gameId}/end`, { action: 'draw' })
      .catch(error => console.error('Failed to save draw:', error));
    
    // In bot game, draw is automatically accepted
    set({
      gameOver: true,
      isDraw: true,
      result: 'draw',
    });
  },

  resetThinkingState: () => {
    // Emergency function to reset thinking state if bot gets stuck
    set({ isThinking: false });
  },
}));
