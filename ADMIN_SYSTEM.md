# Admin System Documentation

## Overview
The Chess Game application now includes a comprehensive admin system with role-based access control, user management, game moderation, and activity logging.

## User Roles
- **User** (default): Regular players
- **Moderator**: Can view stats, manage users (ban/unban), view games
- **Admin**: Full access including role changes, user deletion, game deletion

## Database Schema

### Users Table
- Added `role` column (VARCHAR(20), default 'user')
- Values: 'user', 'moderator', 'admin'

### Admin Logs Table
Tracks all administrative actions:
- `id`: Primary key
- `admin_id`: User who performed the action
- `action`: Type of action (ban_user, update_role, delete_user, etc.)
- `target_user_id`: User affected by the action
- `target_game_id`: Game affected by the action
- `details`: JSON field with additional information
- `created_at`: Timestamp

### Banned Users Table
- `id`: Primary key
- `user_id`: Banned user
- `banned_by`: Admin who issued the ban
- `reason`: Ban reason
- `ban_duration`: Days (null = permanent)
- `banned_at`: Timestamp
- `expires_at`: When ban expires (null = permanent)

## Backend API Endpoints

All admin endpoints require authentication and proper role:

### GET /api/admin/stats
**Role Required**: Moderator or Admin
Returns dashboard statistics:
- Total users
- New users (last 7 days)
- Total games
- Games today
- Banned users count
- Total commentaries

### GET /api/admin/users
**Role Required**: Moderator or Admin
**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `search` (optional): Search by username/email

Returns paginated user list with total games and ban status.

### PUT /api/admin/users/:userId/role
**Role Required**: Admin only
**Body**: `{ role: 'user' | 'moderator' | 'admin' }`

Changes a user's role. Action is logged.

### POST /api/admin/users/:userId/ban
**Role Required**: Moderator or Admin
**Body**: 
```json
{
  "reason": "string",
  "duration": number | null
}
```

Bans a user. Duration in days (null = permanent).

### DELETE /api/admin/users/:userId/ban
**Role Required**: Moderator or Admin

Unbans a user.

### DELETE /api/admin/users/:userId
**Role Required**: Admin only

Permanently deletes a user and all their data (cascade delete).

### GET /api/admin/games
**Role Required**: Moderator or Admin
**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)

Returns paginated list of all games.

### DELETE /api/admin/games/:gameId
**Role Required**: Admin only

Deletes a game. Action is logged.

### GET /api/admin/logs
**Role Required**: Admin only
**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 50)

Returns paginated admin action logs.

## Frontend Components

### AdminDashboard (/admin)
Main admin interface with three tabs:

#### Overview Tab
Displays statistics cards:
- Total users (with weekly growth)
- Total games (with today's count)
- Banned users count
- Total commentaries

#### Users Tab
User management interface:
- Search users by username/email
- View user details (rating, games played, status)
- Change user roles (Admin only)
- Ban/Unban users
- Delete users (Admin only)
- Pagination

#### Games Tab
Game management interface:
- View all games
- See players, results, time controls
- Pagination

### Admin Button in Game Lobby
Users with admin or moderator roles see a "👑 Admin" button in the game lobby to access the admin dashboard.

## Setup Instructions

### 1. Apply Database Migration
```bash
cd backend
psql chess_db -f src/database/migrations/003_add_admin_roles.sql
```

### 2. Promote Your First Admin
```bash
psql chess_db -f src/database/migrations/make_admin.sql
```

Or manually:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

### 3. Verify Setup
1. Login with your promoted admin account
2. You should see the "👑 Admin" button in the game lobby
3. Click it to access the admin dashboard

## Security Features

### Authentication
- All admin endpoints require valid JWT token
- Token verified via `authMiddleware`
- User role fetched from database for each request

### Authorization
- Two middleware levels:
  - `adminMiddleware`: Admin role only
  - `moderatorMiddleware`: Moderator or Admin
- 403 Forbidden returned for insufficient permissions

### Audit Trail
- All administrative actions logged to `admin_logs` table
- Includes: admin ID, action type, target user/game, details, timestamp
- Available for review via admin logs endpoint

### Ban System
- Temporary or permanent bans
- Ban reason required
- Optional expiration date
- Prevents banned users from accessing the system

## Usage Examples

### Banning a User
1. Navigate to Admin Dashboard → Users tab
2. Find the user
3. Click "Ban" button
4. Enter ban reason: "Cheating detected"
5. Enter duration (days) or leave empty for permanent
6. Confirm

### Promoting a Moderator
1. Navigate to Admin Dashboard → Users tab
2. Find the user
3. Change role dropdown from "User" to "Moderator"
4. Action is automatically logged

### Viewing Admin Logs (Coming Soon)
Admin logs endpoint is available but UI is not yet implemented. You can query directly:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/admin/logs
```

## File Locations

### Backend
- Migration: `backend/src/database/migrations/003_add_admin_roles.sql`
- Middleware: `backend/src/middleware/adminMiddleware.ts`
- Controller: `backend/src/controllers/adminController.ts`
- Routes: `backend/src/routes/admin.ts`
- Auth updates: `backend/src/controllers/authController.ts`

### Frontend
- Dashboard: `frontend/src/components/AdminDashboard.tsx`
- Routing: `frontend/src/main.tsx`
- Auth store: `frontend/src/store/authStore.ts` (updated with role)
- Game lobby: `frontend/src/components/GameLobby.tsx` (admin button)

## Current Admin
- **Username**: testuser
- **Email**: test@chess.com
- **Role**: admin
- **User ID**: 1

## Future Enhancements
- [ ] Admin logs viewer in frontend
- [ ] Email notifications for bans
- [ ] Ban appeal system
- [ ] Bulk actions (ban multiple users)
- [ ] Advanced search filters
- [ ] Export user/game data
- [ ] Real-time admin notifications
- [ ] IP-based bans
- [ ] Report system integration
