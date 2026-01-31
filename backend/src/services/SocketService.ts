import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { gameTimerService, TIME_CONTROLS } from './GameTimerService';
import { eloService } from './EloService';
import { query } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface UserSocket extends Socket {
  userId?: string;
  username?: string;
}

interface GameRoom {
  id: string;
  whitePlayer: { userId: string; username: string; socketId: string; rating?: number };
  blackPlayer: { userId: string; username: string; socketId: string; rating?: number };
  fen: string;
  pgn: string;
  moveHistory: string[];
  status: 'waiting' | 'active' | 'completed';
  gameMode?: string;
  timeControl?: string;
  whiteTime?: number;
  blackTime?: number;
  isRated?: boolean;
  createdAt: Date;
}

interface MatchmakingPlayer {
  userId: string;
  username: string;
  socketId: string;
  rating: number;
  timeControl: string;
  timestamp: number;
}

class SocketService {
  private io: SocketIOServer;
  private activeUsers: Map<string, { socketId: string; username: string; rating: number }> = new Map();
  private gameRooms: Map<string, GameRoom> = new Map();
  private waitingPlayers: Map<string, { userId: string; username: string; socketId: string }> = new Map();
  private matchmakingQueue: Map<string, MatchmakingPlayer> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use((socket: UserSocket, next) => {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', async (socket: UserSocket) => {
      console.log(`User connected: ${socket.username} (${socket.userId})`);

      // Add user to active users with rating
      if (socket.userId && socket.username) {
        // Fetch user rating from database
        let rating = 1200; // Default rating
        try {
          const result = await query('SELECT rating FROM users WHERE id = $1', [socket.userId]);
          if (result.rows.length > 0) {
            rating = result.rows[0].rating;
          }
        } catch (error) {
          console.error('Error fetching user rating:', error);
        }

        this.activeUsers.set(socket.userId, {
          socketId: socket.id,
          username: socket.username,
          rating,
        });

        // Broadcast updated user list
        this.broadcastOnlineUsers();
      }

      // Get room list
      socket.on('getRoomList', () => {
        this.sendRoomList(socket);
      });

      // Get online users
      socket.on('getOnlineUsers', () => {
        this.sendOnlineUsers(socket);
      });

      // Create room
      socket.on('createRoom', (data: { gameMode: string; isRated?: boolean; timeControl?: string }) => {
        this.handleCreateRoom(socket, data);
      });

      // Join room
      socket.on('joinRoom', (roomId: string) => {
        this.handleJoinRoom(socket, roomId);
      });

      // Leave room
      socket.on('leaveRoom', () => {
        this.handleLeaveRoom(socket);
      });

      // Find match (matchmaking)
      socket.on('findMatch', (data: { timeControl: string; isRated: boolean }) => {
        this.handleFindMatchV2(socket, data);
      });

      // Cancel matchmaking
      socket.on('cancelMatchmaking', () => {
        this.handleCancelMatchmaking(socket);
      });

      // Make move
      socket.on('makeMove', (data: { move: string }) => {
        this.handleMakeMove(socket, data);
      });

      // Send chat message
      socket.on('sendChatMessage', (message: string) => {
        this.handleChatMessage(socket, message);
      });

      // Offer draw
      socket.on('offerDraw', () => {
        this.handleDrawOffer(socket);
      });

      // Respond to draw
      socket.on('respondToDraw', (accept: boolean) => {
        this.handleDrawResponse(socket, accept);
      });

      // Resign
      socket.on('resign', () => {
        this.handleResign(socket);
      });

      // Join matchmaking queue (old events for compatibility)
      socket.on('find_match', () => {
        this.handleFindMatch(socket);
      });

      // Cancel matchmaking
      socket.on('cancel_match', () => {
        this.handleCancelMatch(socket);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private sendRoomList(socket: UserSocket) {
    const availableRooms = Array.from(this.gameRooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => ({
        id: room.id,
        gameMode: room.gameMode || 'blitz',
        players: [
          { id: room.whitePlayer.userId, username: room.whitePlayer.username, color: 'white' as const }
        ],
        status: room.status,
      }));

    socket.emit('roomList', availableRooms);
  }

  private sendOnlineUsers(socket: UserSocket) {
    const users = Array.from(this.activeUsers.entries()).map(([userId, user]) => ({
      id: userId,
      username: user.username,
    }));

    socket.emit('onlineUsers', users);
  }

  private broadcastOnlineUsers() {
    const users = Array.from(this.activeUsers.entries()).map(([userId, user]) => ({
      id: userId,
      username: user.username,
    }));

    this.io.emit('onlineUsers', users);
  }

  private handleCreateRoom(socket: UserSocket, data: { gameMode: string; isRated?: boolean; timeControl?: string }) {
    if (!socket.userId || !socket.username) return;

    const user = this.activeUsers.get(socket.userId);
    const rating = user?.rating || 1200;
    const timeControl = data.timeControl || 'blitz';

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameRoom: GameRoom = {
      id: roomId,
      whitePlayer: {
        userId: socket.userId,
        username: socket.username,
        socketId: socket.id,
        rating,
      },
      blackPlayer: { userId: '', username: '', socketId: '', rating: 0 },
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',
      moveHistory: [],
      status: 'waiting',
      gameMode: data.gameMode,
      timeControl,
      isRated: data.isRated || false,
      createdAt: new Date(),
    };

    this.gameRooms.set(roomId, gameRoom);
    socket.join(roomId);

    // Initialize timer
    const timerState = gameTimerService.initializeTimer(roomId, timeControl);
    gameRoom.whiteTime = timerState.whiteTime;
    gameRoom.blackTime = timerState.blackTime;

    socket.emit('roomJoined', {
      id: roomId,
      players: [
        { id: gameRoom.whitePlayer.userId, username: gameRoom.whitePlayer.username, color: 'white' as const, rating: gameRoom.whitePlayer.rating }
      ],
      gameState: gameRoom.fen,
      currentTurn: 'white' as const,
      status: 'waiting',
      gameMode: data.gameMode,
      timeControl,
      isRated: gameRoom.isRated,
      whiteTime: gameRoom.whiteTime,
      blackTime: gameRoom.blackTime,
      moves: [],
      createdAt: gameRoom.createdAt,
    });

    // Broadcast updated room list
    this.broadcastRoomList();
  }

  private handleJoinRoom(socket: UserSocket, roomId: string) {
    if (!socket.userId || !socket.username) return;

    const game = this.gameRooms.get(roomId);
    if (!game) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (game.status !== 'waiting') {
      socket.emit('error', 'Room is full or game already started');
      return;
    }

    // Add as black player
    game.blackPlayer = {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
    };
    game.status = 'active';

    socket.join(roomId);

    // Notify both players
    const roomData = {
      id: roomId,
      players: [
        { id: game.whitePlayer.userId, username: game.whitePlayer.username, color: 'white' as const },
        { id: game.blackPlayer.userId, username: game.blackPlayer.username, color: 'black' as const }
      ],
      gameState: game.fen,
      currentTurn: 'white' as const,
      status: 'active',
      gameMode: game.gameMode || 'blitz',
      moves: game.moveHistory,
      createdAt: game.createdAt,
    };

    this.io.to(roomId).emit('roomJoined', roomData);

    // Broadcast updated room list
    this.broadcastRoomList();
  }

  private handleLeaveRoom(socket: UserSocket) {
    if (!socket.userId) return;

    this.gameRooms.forEach((game, roomId) => {
      if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
        socket.leave(roomId);
        socket.to(roomId).emit('playerDisconnected', { player: socket.username });
        this.gameRooms.delete(roomId);
        this.broadcastRoomList();
      }
    });
  }

  private handleMakeMove(socket: UserSocket, data: { move: string }) {
    if (!socket.userId) return;

    // Find the game room the socket is in
    let gameRoom: GameRoom | undefined;
    let roomId: string | undefined;

    this.gameRooms.forEach((game, id) => {
      if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
        gameRoom = game;
        roomId = id;
      }
    });

    if (!gameRoom || !roomId) return;

    // Update timer
    const timeControl = gameRoom.timeControl || 'blitz';
    const timerState = gameTimerService.switchTurn(roomId, timeControl);
    
    if (timerState) {
      gameRoom.whiteTime = timerState.whiteTime;
      gameRoom.blackTime = timerState.blackTime;

      // Check if time expired
      const timeCheck = gameTimerService.isTimeExpired(roomId);
      if (timeCheck.expired) {
        gameRoom.status = 'completed';
        const winner = timeCheck.loser === 'white' ? 'black' : 'white';
        this.io.to(roomId).emit('gameOver', { 
          winner, 
          reason: 'Time expired',
          whiteTime: timerState.whiteTime,
          blackTime: timerState.blackTime,
        });
        gameTimerService.stopTimer(roomId);
        this.gameRooms.delete(roomId);
        return;
      }
    }

    // Add move to history
    gameRoom.moveHistory.push(data.move);

    // Broadcast move to opponent with updated times
    socket.to(roomId).emit('moveMade', {
      move: data.move,
      fen: gameRoom.fen,
      whiteTime: gameRoom.whiteTime,
      blackTime: gameRoom.blackTime,
    });

    // Broadcast to both players for sync
    this.io.to(roomId).emit('timerUpdate', {
      whiteTime: gameRoom.whiteTime,
      blackTime: gameRoom.blackTime,
      currentTurn: timerState?.currentTurn,
    });
  }

  private handleChatMessage(socket: UserSocket, message: string) {
    if (!socket.username) return;

    // Find the game room the socket is in
    this.gameRooms.forEach((game, roomId) => {
      if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
        this.io.to(roomId).emit('chatMessage', {
          username: socket.username,
          message,
          timestamp: new Date(),
        });
      }
    });
  }

  private handleDrawOffer(socket: UserSocket) {
    if (!socket.userId) return;

    // Find the game room and determine color
    this.gameRooms.forEach((game, roomId) => {
      if (game.whitePlayer.userId === socket.userId) {
        socket.to(roomId).emit('drawOffered', { from: 'white' });
      } else if (game.blackPlayer.userId === socket.userId) {
        socket.to(roomId).emit('drawOffered', { from: 'black' });
      }
    });
  }

  private handleDrawResponse(socket: UserSocket, accept: boolean) {
    if (!socket.userId) return;

    this.gameRooms.forEach((game, roomId) => {
      if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
        if (accept) {
          game.status = 'completed';
          this.io.to(roomId).emit('gameOver', { winner: 'draw', reason: 'Draw by agreement' });
          this.gameRooms.delete(roomId);
        } else {
          socket.to(roomId).emit('drawResponse', { accepted: false });
        }
      }
    });
  }

  private handleResign(socket: UserSocket) {
    if (!socket.userId) return;

    this.gameRooms.forEach((game, roomId) => {
      if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
        game.status = 'completed';
        const winner = game.whitePlayer.userId === socket.userId ? 'black' : 'white';
        this.io.to(roomId).emit('gameOver', { winner, reason: 'Resignation' });
        this.gameRooms.delete(roomId);
        this.broadcastRoomList();
      }
    });
  }

  private broadcastRoomList() {
    const availableRooms = Array.from(this.gameRooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => ({
        id: room.id,
        gameMode: room.gameMode || 'blitz',
        timeControl: room.timeControl || 'blitz',
        isRated: room.isRated || false,
        players: [
          { id: room.whitePlayer.userId, username: room.whitePlayer.username, color: 'white' as const, rating: room.whitePlayer.rating }
        ],
        status: room.status,
      }));

    this.io.emit('roomList', availableRooms);
  }

  // New matchmaking system with rating-based matching
  private handleFindMatchV2(socket: UserSocket, data: { timeControl: string; isRated: boolean }) {
    if (!socket.userId || !socket.username) return;

    const user = this.activeUsers.get(socket.userId);
    if (!user) return;

    // Check if already in matchmaking queue
    if (this.matchmakingQueue.has(socket.userId)) {
      socket.emit('error', 'Already in matchmaking queue');
      return;
    }

    // Add to matchmaking queue
    const player: MatchmakingPlayer = {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
      rating: user.rating,
      timeControl: data.timeControl || 'blitz',
      timestamp: Date.now(),
    };

    this.matchmakingQueue.set(socket.userId, player);
    socket.emit('matchmakingStatus', { status: 'searching', rating: user.rating });

    // Try to find a match
    this.attemptMatchmaking(socket.userId, data.timeControl, data.isRated);
  }

  private attemptMatchmaking(userId: string, timeControl: string, isRated: boolean) {
    const player = this.matchmakingQueue.get(userId);
    if (!player) return;

    // Find suitable opponent (within ±200 rating points)
    const RATING_RANGE = 200;
    let bestMatch: MatchmakingPlayer | null = null;
    let smallestRatingDiff = Infinity;

    for (const [opponentId, opponent] of this.matchmakingQueue.entries()) {
      if (opponentId === userId) continue;
      if (opponent.timeControl !== timeControl) continue;

      const ratingDiff = Math.abs(player.rating - opponent.rating);
      if (ratingDiff <= RATING_RANGE && ratingDiff < smallestRatingDiff) {
        bestMatch = opponent;
        smallestRatingDiff = ratingDiff;
      }
    }

    if (bestMatch) {
      this.createMatchmakingGame(player, bestMatch, timeControl, isRated);
    }
  }

  private createMatchmakingGame(player1: MatchmakingPlayer, player2: MatchmakingPlayer, timeControl: string, isRated: boolean) {
    // Remove from queue
    this.matchmakingQueue.delete(player1.userId);
    this.matchmakingQueue.delete(player2.userId);

    // Randomly assign colors
    const isPlayer1White = Math.random() < 0.5;
    const whitePlayer = isPlayer1White ? player1 : player2;
    const blackPlayer = isPlayer1White ? player2 : player1;

    // Create game room
    const roomId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameRoom: GameRoom = {
      id: roomId,
      whitePlayer: {
        userId: whitePlayer.userId,
        username: whitePlayer.username,
        socketId: whitePlayer.socketId,
        rating: whitePlayer.rating,
      },
      blackPlayer: {
        userId: blackPlayer.userId,
        username: blackPlayer.username,
        socketId: blackPlayer.socketId,
        rating: blackPlayer.rating,
      },
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',
      moveHistory: [],
      status: 'active',
      gameMode: 'ranked',
      timeControl,
      isRated,
      createdAt: new Date(),
    };

    // Initialize timer
    const timerState = gameTimerService.initializeTimer(roomId, timeControl);
    gameRoom.whiteTime = timerState.whiteTime;
    gameRoom.blackTime = timerState.blackTime;

    this.gameRooms.set(roomId, gameRoom);

    // Get sockets
    const whiteSocket = this.io.sockets.sockets.get(whitePlayer.socketId);
    const blackSocket = this.io.sockets.sockets.get(blackPlayer.socketId);

    if (whiteSocket && blackSocket) {
      whiteSocket.join(roomId);
      blackSocket.join(roomId);

      const roomData = {
        id: roomId,
        players: [
          { id: whitePlayer.userId, username: whitePlayer.username, color: 'white' as const, rating: whitePlayer.rating },
          { id: blackPlayer.userId, username: blackPlayer.username, color: 'black' as const, rating: blackPlayer.rating }
        ],
        gameState: gameRoom.fen,
        currentTurn: 'white' as const,
        status: 'active',
        gameMode: 'ranked',
        timeControl,
        isRated,
        whiteTime: gameRoom.whiteTime,
        blackTime: gameRoom.blackTime,
        moves: [],
        createdAt: gameRoom.createdAt,
      };

      whiteSocket.emit('matchFound', roomData);
      blackSocket.emit('matchFound', roomData);

      // Start the timer
      setTimeout(() => {
        gameTimerService.startTimer(roomId);
      }, 3000); // 3 second delay before starting
    }
  }

  private handleCancelMatchmaking(socket: UserSocket) {
    if (!socket.userId) return;
    
    if (this.matchmakingQueue.has(socket.userId)) {
      this.matchmakingQueue.delete(socket.userId);
      socket.emit('matchmakingStatus', { status: 'cancelled' });
    }
  }

  private handleFindMatch(socket: UserSocket) {
    if (!socket.userId || !socket.username) return;

    // Check if already in queue
    if (this.waitingPlayers.has(socket.userId)) {
      return;
    }

    // Add to waiting queue
    this.waitingPlayers.set(socket.userId, {
      userId: socket.userId,
      username: socket.username,
      socketId: socket.id,
    });

    socket.emit('matchmaking_status', { status: 'searching' });

    // Try to match with another player
    if (this.waitingPlayers.size >= 2) {
      this.matchPlayers();
    }
  }

  private matchPlayers() {
    const players = Array.from(this.waitingPlayers.values());
    if (players.length < 2) return;

    const [player1, player2] = players;

    // Remove from waiting queue
    this.waitingPlayers.delete(player1.userId);
    this.waitingPlayers.delete(player2.userId);

    // Randomly assign colors
    const isPlayer1White = Math.random() < 0.5;
    const whitePlayer = isPlayer1White ? player1 : player2;
    const blackPlayer = isPlayer1White ? player2 : player1;

    // Create game room
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameRoom: GameRoom = {
      id: gameId,
      whitePlayer,
      blackPlayer,
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      pgn: '',
      moveHistory: [],
      status: 'active',
      createdAt: new Date(),
    };

    this.gameRooms.set(gameId, gameRoom);

    // Notify both players
    const whiteSocket = this.io.sockets.sockets.get(whitePlayer.socketId);
    const blackSocket = this.io.sockets.sockets.get(blackPlayer.socketId);

    if (whiteSocket && blackSocket) {
      whiteSocket.join(gameId);
      blackSocket.join(gameId);

      whiteSocket.emit('match_found', {
        gameId,
        color: 'white',
        opponent: { username: blackPlayer.username },
        fen: gameRoom.fen,
      });

      blackSocket.emit('match_found', {
        gameId,
        color: 'black',
        opponent: { username: whitePlayer.username },
        fen: gameRoom.fen,
      });
    }
  }

  private handleCancelMatch(socket: UserSocket) {
    if (!socket.userId) return;
    this.waitingPlayers.delete(socket.userId);
    socket.emit('matchmaking_status', { status: 'cancelled' });
  }

  private handleDisconnect(socket: UserSocket) {
    console.log(`User disconnected: ${socket.username} (${socket.userId})`);

    if (socket.userId) {
      // Remove from active users
      this.activeUsers.delete(socket.userId);

      // Remove from waiting queue
      this.waitingPlayers.delete(socket.userId);

      // Handle active games
      this.gameRooms.forEach((game, roomId) => {
        if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
          socket.to(roomId).emit('playerDisconnected', { player: socket.username });
          // Clean up the room
          this.gameRooms.delete(roomId);
          this.broadcastRoomList();
        }
      });

      // Broadcast updated user list
      this.broadcastOnlineUsers();
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public getActiveUsers(): number {
    return this.activeUsers.size;
  }

  public getActiveGames(): number {
    return this.gameRooms.size;
  }
}

export default SocketService;
