"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const bot_1 = __importDefault(require("./routes/bot"));
const stats_1 = __importDefault(require("./routes/stats"));
const games_1 = __importDefault(require("./routes/games"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const admin_1 = __importDefault(require("./routes/admin"));
const puzzles_1 = __importDefault(require("./routes/puzzles"));
const SocketService_1 = __importDefault(require("./services/SocketService"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const PORT = process.env.PORT || 5000;
// Initialize Socket.io
const socketService = new SocketService_1.default(httpServer);
// Trust proxy - required for correct IP extraction behind reverse proxy
app.set('trust proxy', 1);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
}));
// Rate limiting - global
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// CORS configuration
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Serve uploaded files
app.use('/uploads', (_req, res, next) => {
    // Allow frontend (different origin/port) to load images.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
}, express_1.default.static(path_1.default.join(process.cwd(), 'uploads')));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/bot', bot_1.default);
app.use('/api/stats', stats_1.default);
app.use('/api/games', games_1.default);
app.use('/api/analysis', analysis_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/puzzles', puzzles_1.default);
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
