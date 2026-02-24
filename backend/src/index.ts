import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import authRoutes from './routes/auth';
import botRoutes from './routes/bot';
import statsRoutes from './routes/stats';
import gameRoutes from './routes/games';
import analysisRoutes from './routes/analysis';
import adminRoutes from './routes/admin';
import puzzleRoutes from './routes/puzzles';
import SocketService from './services/SocketService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const socketService = new SocketService(httpServer);

// Trust proxy - required for correct IP extraction behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production',
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting - global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1'
});

app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use(
  '/uploads',
  (_req, res, next) => {
    // Allow frontend (different origin/port) to load images.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(process.cwd(), 'uploads'))
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/puzzles', puzzleRoutes);

// Basic health check route
app.get('/api/health', (req: Request, res: Response) => {
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

export default app;
