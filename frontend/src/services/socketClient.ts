import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    const { token } = useAuthStore.getState();

    if (!token) {
      console.error('No auth token available for socket connection');
      return;
    }

    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Matchmaking
  findMatch() {
    this.socket?.emit('find_match');
  }

  cancelMatch() {
    this.socket?.emit('cancel_match');
  }

  onMatchmakingStatus(callback: (data: { status: string }) => void) {
    this.socket?.on('matchmaking_status', callback);
  }

  onMatchFound(callback: (data: any) => void) {
    this.socket?.on('match_found', callback);
  }

  // Game actions
  joinGame(gameId: string) {
    this.socket?.emit('join_game', gameId);
  }

  makeMove(gameId: string, move: string, fen: string, pgn: string) {
    this.socket?.emit('make_move', { gameId, move, fen, pgn });
  }

  onOpponentMove(callback: (data: { move: string; fen: string; pgn: string }) => void) {
    this.socket?.on('opponent_move', callback);
  }

  resign(gameId: string) {
    this.socket?.emit('resign', gameId);
  }

  offerDraw(gameId: string) {
    this.socket?.emit('draw_offer', gameId);
  }

  acceptDraw(gameId: string) {
    this.socket?.emit('draw_accept', gameId);
  }

  onDrawOffered(callback: () => void) {
    this.socket?.on('draw_offered', callback);
  }

  onGameOver(callback: (data: { result: string; reason: string }) => void) {
    this.socket?.on('game_over', callback);
  }

  // Chat
  sendChatMessage(gameId: string, message: string) {
    this.socket?.emit('chat_message', { gameId, message });
  }

  onChatMessage(callback: (data: { username: string; message: string; timestamp: Date }) => void) {
    this.socket?.on('chat_message', callback);
  }

  // Connection status
  onOnlineUsers(callback: (count: number) => void) {
    this.socket?.on('online_users', callback);
  }

  onOpponentDisconnected(callback: () => void) {
    this.socket?.on('opponent_disconnected', callback);
  }

  // Remove listeners
  off(event: string) {
    this.socket?.off(event);
  }

  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

// Singleton instance
const socketClient = new SocketClient();

export default socketClient;
