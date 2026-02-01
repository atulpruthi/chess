import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    console.log('🔌 Attempting to connect to:', SOCKET_URL);
    console.log('🔑 Auth token:', token ? 'Present' : 'Missing');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'], // Allow polling as fallback
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('⚠️ Socket error:', error);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Game room methods
  createRoom(gameMode: string): void {
    this.socket?.emit('createRoom', gameMode);
  }

  joinRoom(roomId: string): void {
    this.socket?.emit('joinRoom', roomId);
  }

  leaveRoom(): void {
    this.socket?.emit('leaveRoom');
  }

  makeMove(move: string): void {
    this.socket?.emit('makeMove', { move });
  }

  sendChatMessage(message: string): void {
    this.socket?.emit('sendChatMessage', message);
  }

  offerDraw(): void {
    this.socket?.emit('offerDraw');
  }

  respondToDraw(accept: boolean): void {
    this.socket?.emit('respondToDraw', accept);
  }

  resign(): void {
    this.socket?.emit('resign');
  }
}

export const socketService = new SocketService();
