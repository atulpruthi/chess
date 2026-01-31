"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const GameTimerService_1 = require("./GameTimerService");
const database_1 = require("../config/database");
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
class SocketService {
    constructor(server) {
        this.activeUsers = new Map();
        this.gameRooms = new Map();
        this.waitingPlayers = new Map();
        this.matchmakingQueue = new Map();
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true,
            },
        });
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
                socket.userId = decoded.userId;
                socket.username = decoded.username;
                next();
            }
            catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }
    setupEventHandlers() {
        this.io.on('connection', async (socket) => {
            console.log(`User connected: ${socket.username} (${socket.userId})`);
            // Add user to active users with rating
            if (socket.userId && socket.username) {
                // Fetch user rating from database
                let rating = 1200; // Default rating
                try {
                    const result = await (0, database_1.query)('SELECT rating FROM users WHERE id = $1', [socket.userId]);
                    if (result.rows.length > 0) {
                        rating = result.rows[0].rating;
                    }
                }
                catch (error) {
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
            socket.on('createRoom', (data) => {
                this.handleCreateRoom(socket, data);
            });
            // Join room
            socket.on('joinRoom', (roomId) => {
                this.handleJoinRoom(socket, roomId);
            });
            // Leave room
            socket.on('leaveRoom', () => {
                this.handleLeaveRoom(socket);
            });
            // Find match (matchmaking)
            socket.on('findMatch', (data) => {
                this.handleFindMatchV2(socket, data);
            });
            // Cancel matchmaking
            socket.on('cancelMatchmaking', () => {
                this.handleCancelMatchmaking(socket);
            });
            // Make move
            socket.on('makeMove', (data) => {
                this.handleMakeMove(socket, data);
            });
            // Send chat message
            socket.on('sendChatMessage', (message) => {
                this.handleChatMessage(socket, message);
            });
            // Offer draw
            socket.on('offerDraw', () => {
                this.handleDrawOffer(socket);
            });
            // Respond to draw
            socket.on('respondToDraw', (accept) => {
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
    sendRoomList(socket) {
        const availableRooms = Array.from(this.gameRooms.values())
            .filter(room => room.status === 'waiting')
            .map(room => ({
            id: room.id,
            gameMode: room.gameMode || 'blitz',
            players: [
                { id: room.whitePlayer.userId, username: room.whitePlayer.username, color: 'white' }
            ],
            status: room.status,
        }));
        socket.emit('roomList', availableRooms);
    }
    sendOnlineUsers(socket) {
        const users = Array.from(this.activeUsers.entries()).map(([userId, user]) => ({
            id: userId,
            username: user.username,
        }));
        socket.emit('onlineUsers', users);
    }
    broadcastOnlineUsers() {
        const users = Array.from(this.activeUsers.entries()).map(([userId, user]) => ({
            id: userId,
            username: user.username,
        }));
        this.io.emit('onlineUsers', users);
    }
    handleCreateRoom(socket, data) {
        if (!socket.userId || !socket.username)
            return;
        const user = this.activeUsers.get(socket.userId);
        const rating = user?.rating || 1200;
        const timeControl = data.timeControl || 'blitz';
        const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const gameRoom = {
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
        const timerState = GameTimerService_1.gameTimerService.initializeTimer(roomId, timeControl);
        gameRoom.whiteTime = timerState.whiteTime;
        gameRoom.blackTime = timerState.blackTime;
        socket.emit('roomJoined', {
            id: roomId,
            players: [
                { id: gameRoom.whitePlayer.userId, username: gameRoom.whitePlayer.username, color: 'white', rating: gameRoom.whitePlayer.rating }
            ],
            gameState: gameRoom.fen,
            currentTurn: 'white',
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
    handleJoinRoom(socket, roomId) {
        if (!socket.userId || !socket.username)
            return;
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
                { id: game.whitePlayer.userId, username: game.whitePlayer.username, color: 'white' },
                { id: game.blackPlayer.userId, username: game.blackPlayer.username, color: 'black' }
            ],
            gameState: game.fen,
            currentTurn: 'white',
            status: 'active',
            gameMode: game.gameMode || 'blitz',
            moves: game.moveHistory,
            createdAt: game.createdAt,
        };
        this.io.to(roomId).emit('roomJoined', roomData);
        // Broadcast updated room list
        this.broadcastRoomList();
    }
    handleLeaveRoom(socket) {
        if (!socket.userId)
            return;
        this.gameRooms.forEach((game, roomId) => {
            if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
                socket.leave(roomId);
                socket.to(roomId).emit('playerDisconnected', { player: socket.username });
                this.gameRooms.delete(roomId);
                this.broadcastRoomList();
            }
        });
    }
    handleMakeMove(socket, data) {
        if (!socket.userId)
            return;
        // Find the game room the socket is in
        let gameRoom;
        let roomId;
        this.gameRooms.forEach((game, id) => {
            if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
                gameRoom = game;
                roomId = id;
            }
        });
        if (!gameRoom || !roomId)
            return;
        // Update timer
        const timeControl = gameRoom.timeControl || 'blitz';
        const timerState = GameTimerService_1.gameTimerService.switchTurn(roomId, timeControl);
        if (timerState) {
            gameRoom.whiteTime = timerState.whiteTime;
            gameRoom.blackTime = timerState.blackTime;
            // Check if time expired
            const timeCheck = GameTimerService_1.gameTimerService.isTimeExpired(roomId);
            if (timeCheck.expired) {
                gameRoom.status = 'completed';
                const winner = timeCheck.loser === 'white' ? 'black' : 'white';
                this.io.to(roomId).emit('gameOver', {
                    winner,
                    reason: 'Time expired',
                    whiteTime: timerState.whiteTime,
                    blackTime: timerState.blackTime,
                });
                GameTimerService_1.gameTimerService.stopTimer(roomId);
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
    handleChatMessage(socket, message) {
        if (!socket.username)
            return;
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
    handleDrawOffer(socket) {
        if (!socket.userId)
            return;
        // Find the game room and determine color
        this.gameRooms.forEach((game, roomId) => {
            if (game.whitePlayer.userId === socket.userId) {
                socket.to(roomId).emit('drawOffered', { from: 'white' });
            }
            else if (game.blackPlayer.userId === socket.userId) {
                socket.to(roomId).emit('drawOffered', { from: 'black' });
            }
        });
    }
    handleDrawResponse(socket, accept) {
        if (!socket.userId)
            return;
        this.gameRooms.forEach((game, roomId) => {
            if (game.whitePlayer.userId === socket.userId || game.blackPlayer.userId === socket.userId) {
                if (accept) {
                    game.status = 'completed';
                    this.io.to(roomId).emit('gameOver', { winner: 'draw', reason: 'Draw by agreement' });
                    this.gameRooms.delete(roomId);
                }
                else {
                    socket.to(roomId).emit('drawResponse', { accepted: false });
                }
            }
        });
    }
    handleResign(socket) {
        if (!socket.userId)
            return;
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
    broadcastRoomList() {
        const availableRooms = Array.from(this.gameRooms.values())
            .filter(room => room.status === 'waiting')
            .map(room => ({
            id: room.id,
            gameMode: room.gameMode || 'blitz',
            timeControl: room.timeControl || 'blitz',
            isRated: room.isRated || false,
            players: [
                { id: room.whitePlayer.userId, username: room.whitePlayer.username, color: 'white', rating: room.whitePlayer.rating }
            ],
            status: room.status,
        }));
        this.io.emit('roomList', availableRooms);
    }
    // New matchmaking system with rating-based matching
    handleFindMatchV2(socket, data) {
        if (!socket.userId || !socket.username)
            return;
        const user = this.activeUsers.get(socket.userId);
        if (!user)
            return;
        // Check if already in matchmaking queue
        if (this.matchmakingQueue.has(socket.userId)) {
            socket.emit('error', 'Already in matchmaking queue');
            return;
        }
        // Add to matchmaking queue
        const player = {
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
    attemptMatchmaking(userId, timeControl, isRated) {
        const player = this.matchmakingQueue.get(userId);
        if (!player)
            return;
        // Find suitable opponent (within ±200 rating points)
        const RATING_RANGE = 200;
        let bestMatch = null;
        let smallestRatingDiff = Infinity;
        for (const [opponentId, opponent] of this.matchmakingQueue.entries()) {
            if (opponentId === userId)
                continue;
            if (opponent.timeControl !== timeControl)
                continue;
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
    createMatchmakingGame(player1, player2, timeControl, isRated) {
        // Remove from queue
        this.matchmakingQueue.delete(player1.userId);
        this.matchmakingQueue.delete(player2.userId);
        // Randomly assign colors
        const isPlayer1White = Math.random() < 0.5;
        const whitePlayer = isPlayer1White ? player1 : player2;
        const blackPlayer = isPlayer1White ? player2 : player1;
        // Create game room
        const roomId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const gameRoom = {
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
        const timerState = GameTimerService_1.gameTimerService.initializeTimer(roomId, timeControl);
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
                    { id: whitePlayer.userId, username: whitePlayer.username, color: 'white', rating: whitePlayer.rating },
                    { id: blackPlayer.userId, username: blackPlayer.username, color: 'black', rating: blackPlayer.rating }
                ],
                gameState: gameRoom.fen,
                currentTurn: 'white',
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
                GameTimerService_1.gameTimerService.startTimer(roomId);
            }, 3000); // 3 second delay before starting
        }
    }
    handleCancelMatchmaking(socket) {
        if (!socket.userId)
            return;
        if (this.matchmakingQueue.has(socket.userId)) {
            this.matchmakingQueue.delete(socket.userId);
            socket.emit('matchmakingStatus', { status: 'cancelled' });
        }
    }
    handleFindMatch(socket) {
        if (!socket.userId || !socket.username)
            return;
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
    matchPlayers() {
        const players = Array.from(this.waitingPlayers.values());
        if (players.length < 2)
            return;
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
        const gameRoom = {
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
    handleCancelMatch(socket) {
        if (!socket.userId)
            return;
        this.waitingPlayers.delete(socket.userId);
        socket.emit('matchmaking_status', { status: 'cancelled' });
    }
    handleDisconnect(socket) {
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
    getIO() {
        return this.io;
    }
    getActiveUsers() {
        return this.activeUsers.size;
    }
    getActiveGames() {
        return this.gameRooms.size;
    }
}
exports.default = SocketService;
