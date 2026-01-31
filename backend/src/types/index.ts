export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  rating: number;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Game {
  id: number;
  whitePlayerId: number;
  blackPlayerId: number;
  gameType: 'bot' | 'multiplayer' | 'friend';
  timeControl?: 'blitz' | 'rapid' | 'classical';
  initialFen?: string;
  currentFen: string;
  pgn?: string;
  result?: 'white' | 'black' | 'draw' | 'ongoing';
  status: 'ongoing' | 'completed' | 'abandoned';
  createdAt: Date;
  completedAt?: Date;
}

export interface Move {
  id: number;
  gameId: number;
  moveNumber: number;
  moveNotation: string;
  fen: string;
  timeTaken?: number;
  createdAt: Date;
}
