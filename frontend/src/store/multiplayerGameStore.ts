import { create } from 'zustand';
import { Chess } from 'chess.js';
import socketClient from '../services/socketClient';

interface MultiplayerGameState {
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
  playerColor: 'white' | 'black' | null;
  opponent: { username: string } | null;
  isSearching: boolean;
  isConnected: boolean;
  chatMessages: Array<{ username: string; message: string; timestamp: Date }>;
  drawOffered: boolean;
  opponentDisconnected: boolean;
  
  // Actions
  startSearching: () => void;
  cancelSearch: () => void;
  makeMove: (move: { from: string; to: string; promotion?: string }) => void;
  handleOpponentMove: (data: { move: string; fen: string; pgn: string }) => void;
  resign: () => void;
  offerDraw: () => void;
  acceptDraw: () => void;
  sendMessage: (message: string) => void;
  resetGame: () => void;
  setPromotionSquare: (from: string | null, to: string | null) => void;
  promoteAndMove: (from: string, to: string, piece: string) => void;
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

export const useMultiplayerGameStore = create<MultiplayerGameState>((set, get) => ({
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
  playerColor: null,
  opponent: null,
  isSearching: false,
  isConnected: false,
  chatMessages: [],
  drawOffered: false,
  opponentDisconnected: false,

  startSearching: () => {
    // Connect socket if not connected
    if (!socketClient.isConnected()) {
      socketClient.connect();
    }

    set({ isSearching: true });
    socketClient.findMatch();

    // Listen for match found
    socketClient.onMatchFound((data) => {
      const chess = new Chess(data.fen);
      
      set({
        gameId: data.gameId,
        playerColor: data.color,
        opponent: data.opponent,
        chess,
        fen: data.fen,
        moveHistory: chess.history(),
        isSearching: false,
        gameOver: false,
        result: null,
        chatMessages: [],
        drawOffered: false,
        opponentDisconnected: false,
      });

      // Setup game listeners
      socketClient.onOpponentMove((moveData) => {
        get().handleOpponentMove(moveData);
      });

      socketClient.onDrawOffered(() => {
        set({ drawOffered: true });
      });

      socketClient.onGameOver((data) => {
        set({ gameOver: true, result: data.result });
      });

      socketClient.onOpponentDisconnected(() => {
        set({ opponentDisconnected: true });
      });

      socketClient.onChatMessage((msg) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, msg],
        }));
      });
    });
  },

  cancelSearch: () => {
    set({ isSearching: false });
    socketClient.cancelMatch();
  },

  makeMove: (move: { from: string; to: string; promotion?: string }) => {
    const { chess, gameId, playerColor, turn } = get();

    // Check if it's player's turn
    if ((playerColor === 'white' && turn !== 'w') || (playerColor === 'black' && turn !== 'b')) {
      return;
    }

    try {
      const result = chess.move(move);
      if (!result) return;

      const newFen = chess.fen();
      const newPgn = chess.pgn();

      set({
        fen: newFen,
        moveHistory: chess.history(),
        capturedPieces: updateCapturedPieces(chess),
        turn: chess.turn(),
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isStalemate: chess.isStalemate(),
        isDraw: chess.isDraw(),
      });

      // Check for game over
      if (chess.isGameOver()) {
        let result = 'draw';
        if (chess.isCheckmate()) {
          result = chess.turn() === 'w' ? 'black' : 'white';
        }
        set({ gameOver: true, result });
      }

      // Send move to server
      if (gameId) {
        socketClient.makeMove(gameId, result.san, newFen, newPgn);
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
  },

  handleOpponentMove: (data: { move: string; fen: string; pgn: string }) => {
    const chess = new Chess(data.fen);

    set({
      chess,
      fen: data.fen,
      moveHistory: chess.history(),
      capturedPieces: updateCapturedPieces(chess),
      turn: chess.turn(),
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isStalemate: chess.isStalemate(),
      isDraw: chess.isDraw(),
    });

    // Check for game over
    if (chess.isGameOver()) {
      let result = 'draw';
      if (chess.isCheckmate()) {
        result = chess.turn() === 'w' ? 'black' : 'white';
      }
      set({ gameOver: true, result });
    }
  },

  resign: () => {
    const { gameId } = get();
    if (gameId) {
      socketClient.resign(gameId);
    }
  },

  offerDraw: () => {
    const { gameId } = get();
    if (gameId) {
      socketClient.offerDraw(gameId);
    }
  },

  acceptDraw: () => {
    const { gameId } = get();
    if (gameId) {
      socketClient.acceptDraw(gameId);
      set({ drawOffered: false });
    }
  },

  sendMessage: (message: string) => {
    const { gameId } = get();
    if (gameId && message.trim()) {
      socketClient.sendChatMessage(gameId, message);
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
      playerColor: null,
      opponent: null,
      isSearching: false,
      chatMessages: [],
      drawOffered: false,
      opponentDisconnected: false,
    });

    // Remove listeners
    socketClient.removeAllListeners();
  },

  setPromotionSquare: (from: string | null, to: string | null) => {
    set({ promotionSquare: { from, to } } as any);
  },

  promoteAndMove: (from: string, to: string, piece: string) => {
    get().makeMove({ from, to, promotion: piece });
    set({ promotionSquare: null } as any);
  },
}));
