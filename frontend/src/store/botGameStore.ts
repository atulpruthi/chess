import { create } from 'zustand';
import { Chess } from 'chess.js';
import api from '../services/api';

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
      const chess = new Chess(game.fen);

      set({
        gameId: game.id,
        chess,
        fen: game.fen,
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
    const { chess, gameId, difficulty } = get();
    
    try {
      // Make move locally first for immediate feedback
      const result = chess.move(move);
      
      if (!result) {
        return;
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

      // Send move to server and get bot's response
      const response = await api.post(`/api/bot/${gameId}/move`, {
        move: result.san,
        difficulty,
      });

      const { fen, botMove, gameOver, result: gameResult } = response.data;

      // Update with server response
      const newChess = new Chess(fen);
      
      set({
        chess: newChess,
        fen,
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
    const { chess } = get();
    
    // Undo twice (player's move and bot's move)
    chess.undo();
    chess.undo();
    
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
}));
