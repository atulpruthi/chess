-- Sync existing completed games to user_statistics
-- This migration updates user stats based on completed games in the games table

-- First, ensure all users have a statistics entry
INSERT INTO user_statistics (user_id, games_played, games_won, games_lost, games_drawn, 
                              bot_games, multiplayer_games, highest_rating, lowest_rating)
SELECT 
    id AS user_id,
    0 AS games_played,
    0 AS games_won,
    0 AS games_lost,
    0 AS games_drawn,
    0 AS bot_games,
    0 AS multiplayer_games,
    rating AS highest_rating,
    rating AS lowest_rating
FROM users
WHERE id NOT IN (SELECT user_id FROM user_statistics)
ON CONFLICT (user_id) DO NOTHING;

-- Update stats for white players in completed games
WITH white_stats AS (
    SELECT 
        white_player_id AS user_id,
        COUNT(*) AS games,
        COUNT(*) FILTER (WHERE result = 'white') AS wins,
        COUNT(*) FILTER (WHERE result = 'black') AS losses,
        COUNT(*) FILTER (WHERE result = 'draw') AS draws,
        COUNT(*) FILTER (WHERE black_player_id IS NULL) AS bot_games,
        COUNT(*) FILTER (WHERE black_player_id IS NOT NULL) AS multiplayer_games
    FROM games
    WHERE white_player_id IS NOT NULL 
    AND status = 'completed'
    AND result IS NOT NULL
    GROUP BY white_player_id
)
UPDATE user_statistics us
SET 
    games_played = COALESCE(us.games_played, 0) + ws.games,
    games_won = COALESCE(us.games_won, 0) + ws.wins,
    games_lost = COALESCE(us.games_lost, 0) + ws.losses,
    games_drawn = COALESCE(us.games_drawn, 0) + ws.draws,
    bot_games = COALESCE(us.bot_games, 0) + ws.bot_games,
    multiplayer_games = COALESCE(us.multiplayer_games, 0) + ws.multiplayer_games,
    updated_at = NOW()
FROM white_stats ws
WHERE us.user_id = ws.user_id;

-- Update stats for black players in completed games (multiplayer only)
WITH black_stats AS (
    SELECT 
        black_player_id AS user_id,
        COUNT(*) AS games,
        COUNT(*) FILTER (WHERE result = 'black') AS wins,
        COUNT(*) FILTER (WHERE result = 'white') AS losses,
        COUNT(*) FILTER (WHERE result = 'draw') AS draws,
        COUNT(*) AS multiplayer_games
    FROM games
    WHERE black_player_id IS NOT NULL 
    AND status = 'completed'
    AND result IS NOT NULL
    GROUP BY black_player_id
)
UPDATE user_statistics us
SET 
    games_played = COALESCE(us.games_played, 0) + bs.games,
    games_won = COALESCE(us.games_won, 0) + bs.wins,
    games_lost = COALESCE(us.games_lost, 0) + bs.losses,
    games_drawn = COALESCE(us.games_drawn, 0) + bs.draws,
    multiplayer_games = COALESCE(us.multiplayer_games, 0) + bs.multiplayer_games,
    updated_at = NOW()
FROM black_stats bs
WHERE us.user_id = bs.user_id;

-- Calculate and update win streaks (simplified version)
WITH streak_calc AS (
    SELECT 
        user_id,
        MAX(streak) AS best_streak
    FROM (
        SELECT 
            white_player_id AS user_id,
            result,
            COUNT(*) FILTER (WHERE result = 'white') OVER (
                PARTITION BY white_player_id 
                ORDER BY created_at 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) -
            COUNT(*) FILTER (WHERE result != 'white') OVER (
                PARTITION BY white_player_id 
                ORDER BY created_at 
                ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS streak
        FROM games
        WHERE white_player_id IS NOT NULL 
        AND status = 'completed'
        AND result IS NOT NULL
    ) subq
    GROUP BY user_id
)
UPDATE user_statistics us
SET 
    best_win_streak = GREATEST(COALESCE(us.best_win_streak, 0), sc.best_streak),
    updated_at = NOW()
FROM streak_calc sc
WHERE us.user_id = sc.user_id;

-- Set last_game_at to the most recent completed game
WITH last_games AS (
    SELECT 
        user_id,
        MAX(created_at) AS last_game
    FROM (
        SELECT white_player_id AS user_id, created_at FROM games WHERE white_player_id IS NOT NULL AND status = 'completed'
        UNION ALL
        SELECT black_player_id AS user_id, created_at FROM games WHERE black_player_id IS NOT NULL AND status = 'completed'
    ) all_games
    GROUP BY user_id
)
UPDATE user_statistics us
SET 
    last_game_at = lg.last_game,
    updated_at = NOW()
FROM last_games lg
WHERE us.user_id = lg.user_id;
