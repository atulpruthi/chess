-- Migration: Add Tactical Puzzle System
-- Phase 9.3: Practice and Puzzles

-- Puzzles table
CREATE TABLE IF NOT EXISTS puzzles (
  id SERIAL PRIMARY KEY,
  fen VARCHAR(100) NOT NULL,
  moves TEXT[] NOT NULL, -- Array of correct moves in UCI format
  rating INTEGER NOT NULL, -- Puzzle difficulty rating (800-2800)
  themes TEXT[] NOT NULL, -- e.g., ['fork', 'pin', 'mate-in-2']
  popularity INTEGER DEFAULT 0,
  nb_plays INTEGER DEFAULT 0,
  nb_solved INTEGER DEFAULT 0,
  solution_rate NUMERIC(5,2) DEFAULT 0, -- Percentage (0-100)
  opening_tags TEXT[],
  game_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User puzzle attempts table
CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  puzzle_id INTEGER REFERENCES puzzles(id) ON DELETE CASCADE,
  solved BOOLEAN NOT NULL,
  attempts INTEGER DEFAULT 1,
  time_spent INTEGER, -- seconds
  rating_before INTEGER,
  rating_after INTEGER,
  rating_change INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, puzzle_id, created_at)
);

-- User puzzle stats table
CREATE TABLE IF NOT EXISTS user_puzzle_stats (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  puzzle_rating INTEGER DEFAULT 1200,
  puzzles_attempted INTEGER DEFAULT 0,
  puzzles_solved INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0, -- seconds
  last_puzzle_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily puzzle tracking
CREATE TABLE IF NOT EXISTS daily_puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_id INTEGER REFERENCES puzzles(id),
  date DATE NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Puzzle themes/categories reference
CREATE TABLE IF NOT EXISTS puzzle_themes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  difficulty_min INTEGER,
  difficulty_max INTEGER
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);
CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_user ON puzzle_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_puzzle ON puzzle_attempts(puzzle_id);
CREATE INDEX IF NOT EXISTS idx_daily_puzzles_date ON daily_puzzles(date);

-- Insert common puzzle themes
INSERT INTO puzzle_themes (name, display_name, description, icon, difficulty_min, difficulty_max) VALUES
('mate-in-1', 'Checkmate in 1', 'Deliver checkmate in one move', '♔', 800, 1400),
('mate-in-2', 'Checkmate in 2', 'Force checkmate in two moves', '♕', 1200, 1800),
('mate-in-3', 'Checkmate in 3', 'Force checkmate in three moves', '♖', 1600, 2400),
('fork', 'Fork', 'Attack two pieces at once', '⚔️', 800, 2000),
('pin', 'Pin', 'Attack a piece that cannot move', '📌', 900, 2100),
('skewer', 'Skewer', 'Attack through a valuable piece', '🗡️', 1000, 2200),
('discovered-attack', 'Discovered Attack', 'Reveal an attack by moving a piece', '💥', 1100, 2300),
('double-check', 'Double Check', 'Give check with two pieces', '✨', 1300, 2400),
('sacrifice', 'Sacrifice', 'Give up material for advantage', '🎁', 1200, 2600),
('endgame', 'Endgame', 'Win in the endgame', '🏁', 1000, 2800),
('opening', 'Opening', 'Tactical opportunities in opening', '🚀', 800, 1800),
('middlegame', 'Middlegame', 'Complex middlegame tactics', '⚡', 1200, 2600),
('deflection', 'Deflection', 'Lure a piece away from defense', '🎯', 1100, 2300),
('trapped-piece', 'Trapped Piece', 'Capture a piece with no escape', '🕸️', 900, 2100),
('remove-defender', 'Remove Defender', 'Eliminate the protecting piece', '🛡️', 1000, 2200)
ON CONFLICT (name) DO NOTHING;

-- Insert sample puzzles (you can add more from Lichess puzzle database or create custom ones)
INSERT INTO puzzles (fen, moves, rating, themes, opening_tags) VALUES
-- Basic mate in 1
('r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4', 
 ARRAY['e8d7'], 1000, ARRAY['mate-in-1', 'opening'], ARRAY['scholars-mate']),
 
-- Fork
('rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 0 5',
 ARRAY['f3e5'], 1200, ARRAY['fork', 'opening'], ARRAY['queens-gambit']),

-- Pin
('r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 3',
 ARRAY['c6a5'], 1100, ARRAY['pin', 'opening'], ARRAY['italian-game']),

-- Back rank mate
('6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
 ARRAY['a1a8'], 1300, ARRAY['mate-in-1', 'endgame'], ARRAY['endgame']),

-- Skewer
('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
 ARRAY['a1a8', 'a8a1'], 1400, ARRAY['skewer'], ARRAY['endgame'])
ON CONFLICT DO NOTHING;

-- Set today's daily puzzle (will be updated by cron job)
INSERT INTO daily_puzzles (puzzle_id, date) 
SELECT id, CURRENT_DATE FROM puzzles ORDER BY RANDOM() LIMIT 1
ON CONFLICT (date) DO NOTHING;
