-- Seed user achievements for testing (User ID: 2)
-- This adds some achievements to demonstrate the achievements system

-- First, create user 2 if it doesn't exist (password is "Test123!")
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = 2) THEN
    INSERT INTO users (username, email, password_hash, rating, created_at)
    VALUES (
      'achiever', 
      'achiever@test.com', 
      '$2b$10$rHXQAz5wZJZYp5FMKqYZ4ePGKvJQp5vZwKqYZ4ePGKvJQp5vZwKqY',
      1450,
      NOW()
    );
  END IF;
END $$;

-- Ensure the user exists and has some statistics
INSERT INTO user_statistics (user_id, games_played, games_won, highest_rating, best_win_streak)
VALUES (2, 5, 3, 1450, 3)
ON CONFLICT (user_id) DO UPDATE SET
  games_played = EXCLUDED.games_played,
  games_won = EXCLUDED.games_won,
  highest_rating = EXCLUDED.highest_rating,
  best_win_streak = EXCLUDED.best_win_streak;

-- Update user rating to match statistics
UPDATE users SET rating = 1450 WHERE id = 2;

-- Insert achievements for user 2
INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 2, id, NOW() - INTERVAL '5 days' 
FROM achievements WHERE name = 'First Victory'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 2, id, NOW() - INTERVAL '3 days'
FROM achievements WHERE name = 'Rising Star'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, unlocked_at)
SELECT 2, id, NOW() - INTERVAL '1 day'
FROM achievements WHERE name = 'Win Streak'
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Add a comment for reference
COMMENT ON TABLE user_achievements IS 'Junction table linking users to their unlocked achievements';
