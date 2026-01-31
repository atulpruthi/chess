-- Migration: Add game history tracking with ELO ratings
-- Phase 7: User Features & Dashboard

-- Add rating tracking columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS white_rating_before INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS white_rating_after INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_rating_before INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_rating_after INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS white_rating_change INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_rating_change INTEGER;

-- Add game duration tracking
ALTER TABLE games ADD COLUMN IF NOT EXISTS white_time_remaining INTEGER; -- milliseconds
ALTER TABLE games ADD COLUMN IF NOT EXISTS black_time_remaining INTEGER; -- milliseconds
ALTER TABLE games ADD COLUMN IF NOT EXISTS total_moves INTEGER DEFAULT 0;

-- User statistics table (cached for performance)
CREATE TABLE IF NOT EXISTS user_statistics (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  
  -- By game type
  bot_games INTEGER DEFAULT 0,
  multiplayer_games INTEGER DEFAULT 0,
  
  -- By time control
  bullet_games INTEGER DEFAULT 0,
  blitz_games INTEGER DEFAULT 0,
  rapid_games INTEGER DEFAULT 0,
  classical_games INTEGER DEFAULT 0,
  
  -- Performance metrics
  highest_rating INTEGER DEFAULT 1200,
  lowest_rating INTEGER DEFAULT 1200,
  best_win_streak INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  
  -- Activity
  last_game_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User activity tracking
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'game_completed', 'rating_milestone', 'achievement'
  activity_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements system
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  category VARCHAR(50), -- 'games', 'rating', 'streak', 'special'
  requirement JSONB, -- e.g., {"games_won": 100, "time_control": "blitz"}
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, achievement_id)
);

-- Game bookmarks for replay
CREATE TABLE IF NOT EXISTS game_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, game_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_is_rated ON games(is_rated);
CREATE INDEX IF NOT EXISTS idx_games_completed_at ON games(completed_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_game_bookmarks_user_id ON game_bookmarks(user_id);

-- Initialize statistics for existing users
INSERT INTO user_statistics (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Insert initial achievements
INSERT INTO achievements (name, description, icon, category, requirement) VALUES
  ('First Victory', 'Win your first game', '🏆', 'games', '{"games_won": 1}'),
  ('Century', 'Play 100 games', '💯', 'games', '{"games_played": 100}'),
  ('Rising Star', 'Reach 1400 rating', '⭐', 'rating', '{"rating": 1400}'),
  ('Expert', 'Reach 1600 rating', '🎯', 'rating', '{"rating": 1600}'),
  ('Master', 'Reach 2000 rating', '👑', 'rating', '{"rating": 2000}'),
  ('Win Streak', 'Win 5 games in a row', '🔥', 'streak', '{"win_streak": 5}'),
  ('Speed Demon', 'Win 50 bullet games', '⚡', 'games', '{"bullet_wins": 50}'),
  ('Tactician', 'Win 50 blitz games', '⚔️', 'games', '{"blitz_wins": 50}')
ON CONFLICT (name) DO NOTHING;
