wexit
# Phase 6 Testing Guide

## Quick Test Scenarios

### 1. Test ELO Rating Updates

**Scenario**: Complete a rated game and verify ratings are saved

1. Start backend server: `cd backend && npm run dev`
2. Start frontend server: `cd frontend && npm run dev`
3. Create two user accounts (or use existing)
4. Have both users join matchmaking for a rated game:
   - User 1: Click "Find Match" → Select "Blitz" + "Rated"
   - User 2: Click "Find Match" → Select "Blitz" + "Rated"
5. Complete the game (resign/checkmate/draw)
6. Check console logs for rating updates
7. Verify in database:
   ```sql
   SELECT * FROM games ORDER BY id DESC LIMIT 1;
   SELECT id, username, rating FROM users WHERE id IN (1, 2);
   ```

**Expected Results**:
- Game saved to `games` table with rating columns populated
- Both players' ratings updated in `users` table
- Rating changes match ELO calculation
- Console shows: `Game X saved. White: 1200 -> 1216 (+16), Black: 1200 -> 1184 (-16)`

---

### 2. Test Match History API

**Scenario**: Retrieve match history via API

```bash
# Get match history for user ID 1
curl http://localhost:5001/api/games/user/1/history?page=1&limit=10

# Filter by time control
curl http://localhost:5001/api/games/user/1/history?page=1&limit=10&timeControl=blitz

# Get recent games
curl http://localhost:5001/api/games/user/1/recent?limit=5
```

**Expected Response**:
```json
{
  "games": [
    {
      "id": 123,
      "whitePlayer": { "id": 1, "username": "player1", "ratingBefore": 1200, "ratingAfter": 1216, "ratingChange": 16 },
      "blackPlayer": { "id": 2, "username": "player2", "ratingBefore": 1200, "ratingAfter": 1184, "ratingChange": -16 },
      "result": "white",
      "timeControl": "blitz",
      "isRated": true,
      "totalMoves": 42,
      "completedAt": "2026-02-09T...",
      "isWin": true,
      "isDraw": false,
      "playerColor": "white"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalGames": 1,
    "hasMore": false
  }
}
```

---

### 3. Test Match History UI

**Scenario**: View match history in the frontend

1. Login as a user who has played games
2. Navigate to Dashboard → Game History
3. Verify:
   - ✅ Games display with opponent names
   - ✅ Win/Loss/Draw badges show correctly
   - ✅ Rating changes display (green for +, red for -)
   - ✅ Time control icons show
   - ✅ "Rated" badge appears for rated games
   - ✅ Pagination works (Previous/Next buttons)
   - ✅ Time control filters work (All, Bullet, Blitz, etc.)
   - ✅ Clicking a game navigates to replay/analysis

---

### 4. Test User Statistics Update

**Scenario**: Verify stats update after each game

**Before playing**:
```sql
SELECT * FROM user_statistics WHERE user_id = 1;
```

**Play a game** (any result)

**After playing**:
```sql
SELECT * FROM user_statistics WHERE user_id = 1;
```

**Verify Updated Fields**:
- `games_played` incremented
- `games_won` / `games_lost` / `games_drawn` incremented correctly
- `multiplayer_games` incremented
- `blitz_games` / `rapid_games` / `bullet_games` incremented (based on time control)
- `current_win_streak` updated (incremented on win, reset on loss)
- `best_win_streak` updated if current streak is new record
- `highest_rating` updated if new rating is higher
- `last_game_at` updated to current timestamp

---

### 5. Test Achievement Unlocking

**Scenario**: Unlock achievements by completing games

**Test First Victory Achievement**:
1. Create a new user (no games played)
2. Win a game
3. Check:
   ```sql
   SELECT ua.*, a.name 
   FROM user_achievements ua 
   JOIN achievements a ON ua.achievement_id = a.id 
   WHERE ua.user_id = [NEW_USER_ID];
   ```
4. Should show "First Victory" unlocked

**Test Century Achievement**:
1. For a user with 99 games played
2. Complete one more game
3. "Century" achievement should unlock

**Test Rating Achievements**:
- "Rising Star" (1400 rating)
- "Expert" (1600 rating)
- "Master" (2000 rating)

---

### 6. Test Rating Update Socket Event

**Scenario**: Receive rating updates in real-time

1. Open browser console
2. Play a rated game
3. When game ends, check console for:
   ```
   Rating updated: 1200 → 1216 (+16)
   ```

**Code to verify** (in `MultiplayerGame.tsx`):
```typescript
socket.on('ratingUpdate', (data) => {
  console.log(`Rating updated: ${data.oldRating} → ${data.newRating} (${data.change})`);
});
```

---

### 7. Test Different Game Endings

**Test each ending type saves correctly**:

a) **Resignation**:
   - One player resigns
   - Game saves with `result = winner color`
   - Reason: "Resignation"

b) **Draw by Agreement**:
   - Offer draw → Accept
   - Game saves with `result = 'draw'`
   - Reason: "Draw by agreement"

c) **Timeout**:
   - Let timer run out
   - Game saves with winner as opponent
   - Reason: "Time expired"

d) **Checkmate/Stalemate**:
   - Complete game naturally
   - Game saves with correct result
   - Reason: "Checkmate" or "Stalemate"

---

### 8. Database Verification Queries

**Check saved games**:
```sql
-- Recent games with ratings
SELECT 
  g.id,
  g.result,
  g.time_control,
  g.is_rated,
  w.username as white_player,
  g.white_rating_before,
  g.white_rating_after,
  g.white_rating_change,
  b.username as black_player,
  g.black_rating_before,
  g.black_rating_after,
  g.black_rating_change,
  g.completed_at
FROM games g
JOIN users w ON g.white_player_id = w.id
JOIN users b ON g.black_player_id = b.id
WHERE g.status = 'completed'
ORDER BY g.completed_at DESC
LIMIT 10;
```

**Check user ratings**:
```sql
SELECT id, username, rating, updated_at 
FROM users 
ORDER BY rating DESC 
LIMIT 10;
```

**Check user stats**:
```sql
SELECT 
  u.username,
  s.games_played,
  s.games_won,
  s.games_lost,
  s.games_drawn,
  s.current_win_streak,
  s.best_win_streak,
  s.highest_rating,
  s.multiplayer_games,
  s.blitz_games,
  s.rapid_games
FROM user_statistics s
JOIN users u ON s.user_id = u.id
WHERE s.games_played > 0
ORDER BY s.games_played DESC;
```

---

## Common Issues & Solutions

### Issue: Games not saving
**Solution**: 
- Check if `isRated` is `true` in the game room
- Verify backend logs for errors
- Check database connection

### Issue: Ratings not updating
**Solution**:
- Verify `saveGameResult()` is being called
- Check if both players have valid user IDs
- Ensure transaction commits successfully

### Issue: Match history empty
**Solution**:
- Play at least one game to completion
- Check API endpoint with curl
- Verify user ID is correct

### Issue: Frontend not showing rating changes
**Solution**:
- Check browser console for `ratingUpdate` event
- Verify socket connection is active
- Check GameHistory component is fetching correct API

---

## Performance Tests

### Load Test: Multiple Concurrent Games
1. Simulate 10 games ending simultaneously
2. Verify all save to database without conflicts
3. Check transaction isolation

### Pagination Test
1. Create 100+ games for a user
2. Test pagination with different limits (10, 20, 50)
3. Verify correct page counts and hasMore flag

---

## Success Criteria

✅ All tests pass without errors  
✅ Ratings update correctly according to ELO formula  
✅ Match history shows all completed games  
✅ Statistics update after every game  
✅ Achievements unlock at correct thresholds  
✅ No database deadlocks or race conditions  
✅ Frontend displays all data correctly  

---

**Testing Date**: _________  
**Tester**: _________  
**Result**: ⬜ PASS | ⬜ FAIL  
**Notes**: _________________________________
