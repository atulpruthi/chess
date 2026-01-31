-- Migration: Add game analysis and commentary tables
-- Phase 8: Game Review & Analysis System

-- Game analysis table
CREATE TABLE IF NOT EXISTS game_analysis (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE UNIQUE,
  engine VARCHAR(50) DEFAULT 'Stockfish 16',
  depth INTEGER DEFAULT 20,
  opening_name VARCHAR(100),
  opening_eco VARCHAR(10),
  accuracy_white DECIMAL(5,2),
  accuracy_black DECIMAL(5,2),
  analysis_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Move analysis table
CREATE TABLE IF NOT EXISTS move_analysis (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER REFERENCES game_analysis(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  player_color VARCHAR(10) NOT NULL, -- 'white' or 'black'
  move_san VARCHAR(20) NOT NULL,
  move_uci VARCHAR(10) NOT NULL,
  fen_before TEXT NOT NULL,
  fen_after TEXT NOT NULL,
  evaluation INTEGER, -- centipawns (from white's perspective)
  mate_in INTEGER, -- null if not mate, positive if white mates, negative if black mates
  best_move_san VARCHAR(20),
  best_move_uci VARCHAR(10),
  best_evaluation INTEGER,
  centipawn_loss INTEGER,
  classification VARCHAR(20), -- 'brilliant', 'great', 'good', 'inaccuracy', 'mistake', 'blunder', 'book'
  is_book_move BOOLEAN DEFAULT false,
  is_forced BOOLEAN DEFAULT false,
  alternatives JSONB, -- array of alternative moves with evaluations
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commentary table
CREATE TABLE IF NOT EXISTS commentary (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  commentary_type VARCHAR(20) NOT NULL, -- 'user', 'ai', 'coach'
  move_number INTEGER, -- null for general game commentary
  content TEXT NOT NULL,
  variations TEXT[], -- PGN format variations
  likes INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Commentary likes table
CREATE TABLE IF NOT EXISTS commentary_likes (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  commentary_id INTEGER REFERENCES commentary(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, commentary_id)
);

-- Opening book table
CREATE TABLE IF NOT EXISTS opening_book (
  id SERIAL PRIMARY KEY,
  eco_code VARCHAR(10) UNIQUE NOT NULL,
  opening_name VARCHAR(200) NOT NULL,
  variation VARCHAR(200),
  moves TEXT NOT NULL, -- PGN moves
  fen TEXT NOT NULL,
  popularity INTEGER DEFAULT 0,
  white_win_rate DECIMAL(5,2),
  black_win_rate DECIMAL(5,2),
  draw_rate DECIMAL(5,2)
);

-- Position bookmarks table (extended from game_bookmarks)
CREATE TABLE IF NOT EXISTS position_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  fen TEXT NOT NULL,
  note TEXT,
  tags TEXT[], -- ['tactic', 'endgame', 'study']
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mistake tracker for spaced repetition
CREATE TABLE IF NOT EXISTS mistake_tracker (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER NOT NULL,
  mistake_type VARCHAR(20), -- 'blunder', 'mistake', 'inaccuracy'
  position_fen TEXT NOT NULL,
  correct_move VARCHAR(20),
  user_move VARCHAR(20),
  times_reviewed INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMP,
  next_review_at TIMESTAMP,
  mastery_level INTEGER DEFAULT 0, -- 0-5, for spaced repetition
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_game_analysis_game_id ON game_analysis(game_id);
CREATE INDEX IF NOT EXISTS idx_move_analysis_analysis_id ON move_analysis(analysis_id);
CREATE INDEX IF NOT EXISTS idx_move_analysis_classification ON move_analysis(classification);
CREATE INDEX IF NOT EXISTS idx_commentary_game_id ON commentary(game_id);
CREATE INDEX IF NOT EXISTS idx_commentary_author_id ON commentary(author_id);
CREATE INDEX IF NOT EXISTS idx_commentary_type ON commentary(commentary_type);
CREATE INDEX IF NOT EXISTS idx_position_bookmarks_user_id ON position_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_tracker_user_id ON mistake_tracker(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_tracker_next_review ON mistake_tracker(next_review_at);

-- Insert common openings (sample data)
INSERT INTO opening_book (eco_code, opening_name, moves, fen, white_win_rate, black_win_rate, draw_rate) VALUES
  ('C00', 'French Defense', '1. e4 e6', 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq -', 37.5, 38.2, 24.3),
  ('C20', 'King''s Pawn Opening', '1. e4 e5', 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6', 40.2, 35.8, 24.0),
  ('C50', 'Italian Game', '1. e4 e5 2. Nf3 Nc6 3. Bc4', 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq -', 42.5, 33.2, 24.3),
  ('D00', 'Queen''s Pawn Opening', '1. d4 d5', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq d6', 38.5, 36.2, 25.3),
  ('E00', 'Catalan Opening', '1. d4 Nf6 2. c4 e6 3. g3', 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq -', 41.0, 34.5, 24.5)
ON CONFLICT (eco_code) DO NOTHING;
