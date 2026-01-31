"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const bot_1 = __importDefault(require("./routes/bot"));
const stats_1 = __importDefault(require("./routes/stats"));
const games_1 = __importDefault(require("./routes/games"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const SocketService_1 = __importDefault(require("./services/SocketService"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// Initialize Socket.io
const socketService = new SocketService_1.default(httpServer);
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/bot', bot_1.default);
app.use('/api/stats', stats_1.default);
app.use('/api/games', games_1.default);
app.use('/api/analysis', analysis_1.default);
// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Chess API is running',
        onlineUsers: socketService.getActiveUsers(),
        activeGames: socketService.getActiveGames(),
    });
});
// Start server
httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready`);
});
exports.default = app;
