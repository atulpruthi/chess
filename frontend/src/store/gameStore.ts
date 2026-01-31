import { create } from 'zustand';
import { Chess } from 'chess.js';

export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

interface GameState {
  chess: Chess;
  fen: string;
  moveHistory: string[];
  capturedPieces: { white: string[]; black: string[] };
  currentTurn: 'w' | 'b';
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  gameOver: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  promotionSquare: string | null;
}

interface GameActions {
  makeMove: (from: string, to: string, promotion?: string) => boolean;
  resetGame: () => void;
  undoMove: () => void;
  setPromotionSquare: (square: string | null) => void;
  promoteAndMove: (from: string, to: string, piece: PieceSymbol) => boolean;
}

const initialChess = new Chess();

const updateCapturedPieces = (moveHistory: any[], chess: Chess) => {
  const captured = { white: [] as string[], black: [] as string[] };
  const tempChess = new Chess();

  moveHistory.forEach((move: any) => {
    if (move.captured) {
      const color = move.color === 'w' ? 'black' : 'white';
      captured[color].push(move.captured);
    }
    tempChess.move(move);
  });

  return captured;
};

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  // Initial state
  chess: initialChess,
  fen: initialChess.fen(),
  moveHistory: [],
  capturedPieces: { white: [], black: [] },
  currentTurn: 'w',
  isCheck: false,
  isCheckmate: false,
  isStalemate: false,
  isDraw: false,
  gameOver: false,
  winner: null,
  promotionSquare: null,

  // Actions
  makeMove: (from: string, to: string, promotion?: string) => {
    const { chess } = get();
    
    try {
      const move = chess.move({
        from,
        to,
        promotion: promotion as PieceSymbol | undefined,
      });

      if (move) {
        const history = chess.history({ verbose: true });
        const capturedPieces = updateCapturedPieces(history, chess);

        set({
          fen: chess.fen(),
          moveHistory: chess.history(),
          capturedPieces,
          currentTurn: chess.turn(),
          isCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          isStalemate: chess.isStalemate(),
          isDraw: chess.isDraw(),
          gameOver: chess.isGameOver(),
          winner: chess.isCheckmate()
            ? chess.turn() === 'w'
              ? 'black'
              : 'white'
            : chess.isDraw()
            ? 'draw'
            : null,
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error('Invalid move:', error);
      return false;
    }
  },

  resetGame: () => {
    const newChess = new Chess();
    set({
      chess: newChess,
      fen: newChess.fen(),
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      currentTurn: 'w',
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      gameOver: false,
      winner: null,
      promotionSquare: null,
    });
  },

  undoMove: () => {
    const { chess } = get();
    chess.undo();
    const history = chess.history({ verbose: true });
    const capturedPieces = updateCapturedPieces(history, chess);

    set({
      fen: chess.fen(),
      moveHistory: chess.history(),
      capturedPieces,
      currentTurn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
      gameOver: chess.isGameOver(),
      winner: null,
    });
  },

  setPromotionSquare: (square: string | null) => {
    set({ promotionSquare: square });
  },

  promoteAndMove: (from: string, to: string, piece: PieceSymbol) => {
    const result = get().makeMove(from, to, piece);
    if (result) {
      set({ promotionSquare: null });
    }
    return result;
  },
}));
