-- Initialize Chess Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rating INTEGER DEFAULT 1200,
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  white_player_id INTEGER REFERENCES users(id),
  black_player_id INTEGER REFERENCES users(id),
  game_type VARCHAR(20) NOT NULL, -- 'bot', 'multiplayer', 'friend'
  time_control VARCHAR(20), -- 'blitz', 'rapid', 'classical'
  initial_fen TEXT,
  current_fen TEXT NOT NULL,
  pgn TEXT,
  result VARCHAR(20), -- 'white', 'black', 'draw', 'ongoing'
  status VARCHAR(20) DEFAULT 'ongoing', -- 'ongoing', 'completed', 'abandoned'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  move_notation VARCHAR(10) NOT NULL,
  fen VARCHAR(100) NOT NULL,
  time_taken INTEGER, -- seconds
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);

-- Insert sample user for testing (password: 'test123')
INSERT INTO users (username, email, password_hash) 
VALUES ('testuser', 'test@chess.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456789') 
ON CONFLICT (username) DO NOTHING;
