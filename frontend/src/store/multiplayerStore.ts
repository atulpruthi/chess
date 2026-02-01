import { create } from 'zustand';
import { Chess } from 'chess.js';

interface Player {
  id: string;
  username: string;
  rating?: number;
  color: 'white' | 'black';
}

interface GameRoom {
  id: string;
  players: Player[];
  gameState: string; // FEN string
  currentTurn: 'white' | 'black';
  status: 'waiting' | 'active' | 'completed';
  winner?: 'white' | 'black' | 'draw';
  gameMode: string;
  isRated?: boolean;
  timeControl?: {
    initial: number; // seconds
    increment: number; // seconds
  };
  whiteTime?: number;
  blackTime?: number;
  moves: string[]; // move history in algebraic notation
  drawOffer?: {
    from: 'white' | 'black';
    status: 'pending' | 'accepted' | 'declined';
  };
  createdAt: Date;
}

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: Date;
}

interface MultiplayerState {
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  chatMessages: ChatMessage[];
  isSearching: boolean;
  error: string | null;

  // Actions
  setCurrentRoom: (room: GameRoom | null) => void;
  updateGameState: (fen: string) => void;
  addMove: (move: string) => void;
  setAvailableRooms: (rooms: GameRoom[]) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  setSearching: (searching: boolean) => void;
  setError: (error: string | null) => void;
  updatePlayerTime: (color: 'white' | 'black', time: number) => void;
  setDrawOffer: (offer: GameRoom['drawOffer']) => void;
  setGameStatus: (status: GameRoom['status'], winner?: GameRoom['winner']) => void;
  reset: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set) => ({
  currentRoom: null,
  availableRooms: [],
  chatMessages: [],
  isSearching: false,
  error: null,

  setCurrentRoom: (room) => set({ currentRoom: room, error: null }),

  updateGameState: (fen) => set((state) => {
    if (!state.currentRoom) return state;
    return {
      currentRoom: {
        ...state.currentRoom,
        gameState: fen,
        currentTurn: new Chess(fen).turn() === 'w' ? 'white' : 'black',
      },
    };
  }),

  addMove: (move) => set((state) => {
    if (!state.currentRoom) return state;
    return {
      currentRoom: {
        ...state.currentRoom,
        moves: [...state.currentRoom.moves, move],
      },
    };
  }),

  setAvailableRooms: (rooms) => set({ availableRooms: rooms }),

  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message],
  })),

  clearChatMessages: () => set({ chatMessages: [] }),

  setSearching: (searching) => set({ isSearching: searching, error: null }),

  setError: (error) => set({ error, isSearching: false }),

  updatePlayerTime: (color, time) => set((state) => {
    if (!state.currentRoom) return state;
    return {
      currentRoom: {
        ...state.currentRoom,
        [color === 'white' ? 'whiteTime' : 'blackTime']: time,
      },
    };
  }),

  setDrawOffer: (offer) => set((state) => {
    if (!state.currentRoom) return state;
    return {
      currentRoom: {
        ...state.currentRoom,
        drawOffer: offer,
      },
    };
  }),

  setGameStatus: (status, winner) => set((state) => {
    if (!state.currentRoom) return state;
    return {
      currentRoom: {
        ...state.currentRoom,
        status,
        winner,
      },
    };
  }),

  reset: () => set({
    currentRoom: null,
    chatMessages: [],
    isSearching: false,
    error: null,
  }),
}));
