import express, { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import botRoutes from './routes/bot';
import statsRoutes from './routes/stats';
import gameRoutes from './routes/games';
import analysisRoutes from './routes/analysis';
import SocketService from './services/SocketService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const socketService = new SocketService(httpServer);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/analysis', analysisRoutes);

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
