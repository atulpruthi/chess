# Chess Website

A full-featured chess website with bot gameplay, real-time multiplayer, game analysis, AI commentary, and automated video generation.

## 🚀 Features

- **Chess Gameplay**: Fully functional offline and online chess game
- **Bot AI**: Play against Stockfish engine with multiple difficulty levels
- **Multiplayer**: Real-time player vs player games with WebSocket
- **Game Analysis**: Computer analysis with move classification (brilliant, good, blunder, etc.)
- **AI Commentary**: Automated game commentary using AI
- **Video Generation**: Generate videos from games with multiple resolutions and social media presets
- **User Profiles**: Track rating, statistics, and game history
- **Matchmaking**: ELO-based matchmaking system

## 📁 Project Structure

```
Chess/
├── frontend/          # React + TypeScript + Vite
├── backend/           # Node.js + Express + TypeScript
├── .husky/            # Git hooks
├── .gitignore
├── package.json       # Root package for shared scripts
└── DEVELOPMENT_PHASES.md
```

## 🛠️ Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- chess.js (game logic)
- react-chessboard (UI)
- Socket.io Client
- Zustand (state management)
- Axios

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL
- Socket.io
- Redis
- Stockfish (chess engine)
- OpenAI/Claude API (commentary)

### Development Tools
- ESLint
- Prettier
- Husky (Git hooks)
- lint-staged

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis (for video processing queue)
- Stockfish chess engine

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Chess
```

2. **Install dependencies**
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. **Setup environment variables**

Frontend (.env in frontend/):
```
VITE_API_URL=http://localhost:5000
```

Backend (.env in backend/):
```
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/chess_db
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

4. **Setup database**
```bash
# Create PostgreSQL database
createdb chess_db

# Run schema
psql chess_db < backend/src/database/schema.sql
```

5. **Start development servers**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

The frontend will be available at `http://localhost:5173`  
The backend API will be available at `http://localhost:5000`

## 📝 Development Phases

See [DEVELOPMENT_PHASES.md](DEVELOPMENT_PHASES.md) for detailed project roadmap and timeline.

**Current Phase**: Phase 1 - Foundation & Setup ✅

## 🤝 Contributing

This is a development project. Follow the coding standards enforced by ESLint and Prettier.

## 📄 License

ISC
