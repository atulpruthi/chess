import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

interface DashboardStats {
  total_users: number;
  new_users_week: number;
  total_games: number;
  games_today: number;
  banned_users: number;
  total_commentaries: number;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  rating: number;
  created_at: string;
  total_games: number;
  is_banned: boolean;
}

interface Game {
  id: number;
  white_player: string;
  black_player: string;
  result: string;
  time_control: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'games'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      navigate('/lobby');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'games') {
      loadGames();
    }
  }, [activeTab, page, searchTerm]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/users?page=${page}&search=${searchTerm}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadGames = async () => {
    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/games?page=${page}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGames(data.games);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (!confirm(`Change user role to ${newRole}?`)) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/users/${userId}/role`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ role: newRole })
        }
      );

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const handleBanUser = async (userId: number) => {
    const reason = prompt('Enter ban reason:');
    if (!reason) return;

    const durationStr = prompt('Ban duration in days (leave empty for permanent):');
    const duration = durationStr ? parseInt(durationStr) : null;

    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/users/${userId}/ban`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ reason, duration })
        }
      );

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error banning user:', error);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!confirm('Unban this user?')) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/users/${userId}/ban`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error unbanning user:', error);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure? This action cannot be undone!')) return;

    try {
      const response = await fetch(
        `http://localhost:5001/api/admin/users/${userId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (response.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  if (loading) {
    return (
      <div className="lobby-shell flex items-center justify-center p-6">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <button
            type="button"
            className="sidebar-user"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
            aria-label={isAuthenticated ? "Open dashboard" : "Login"}
            style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
          >
            <div>
              <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
              <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
            </div>
          </button>
        </div>

        <div className="lobby-layout">
          <aside className="lobby-sidebar">
            <div className="lobby-sidebar-nav">
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconMagnifier className="nav-icon" />
                <span>Find Match</span>
              </button>
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconPlus className="nav-icon" />
                <span>Create Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconGlobe className="nav-icon" />
                <span>Online Multiplayer</span>
              </button>
              <button onClick={() => navigate('/local?mode=local', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconChessboard className="nav-icon" />
                <span>Local Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconRobot className="nav-icon" />
                <span>Play vs Bot</span>
              </button>
              <button onClick={() => navigate('/puzzles')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">🧩</span>
                <span>Tactical Puzzles</span>
              </button>
              <button onClick={() => navigate('/tutorial')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📚</span>
                <span>Tutorial</span>
              </button>
              <button onClick={() => navigate('/rules')} className="btn-secondary sidebar-btn">
                <span className="nav-icon text-xl">📖</span>
                <span>Chess Rules</span>
              </button>
            </div>
          </aside>

          <main className="lobby-main">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-white/70">Welcome, {user?.username} ({user?.role})</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/lobby');
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-6 py-3 rounded-xl font-semibold transition ${
              activeTab === 'games'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-white/70 hover:bg-white/15 border border-white/10'
            }`}
          >
            Games
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
              <h3 className="text-white/60 text-sm mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-white">{stats.total_users}</p>
              <p className="text-green-400 text-sm mt-2">+{stats.new_users_week} this week</p>
            </div>
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
              <h3 className="text-white/60 text-sm mb-2">Total Games</h3>
              <p className="text-3xl font-bold text-white">{stats.total_games}</p>
              <p className="text-blue-400 text-sm mt-2">{stats.games_today} today</p>
            </div>
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
              <h3 className="text-white/60 text-sm mb-2">Banned Users</h3>
              <p className="text-3xl font-bold text-white">{stats.banned_users}</p>
            </div>
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
              <h3 className="text-white/60 text-sm mb-2">Commentaries</h3>
              <p className="text-3xl font-bold text-white">{stats.total_commentaries}</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 bg-white/[0.04] text-white rounded-xl border border-white/10 focus:border-purple-500 focus:outline-none"
              />
            </div>

            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.45)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-white">Username</th>
                    <th className="px-6 py-3 text-left text-white">Email</th>
                    <th className="px-6 py-3 text-left text-white">Role</th>
                    <th className="px-6 py-3 text-left text-white">Rating</th>
                    <th className="px-6 py-3 text-left text-white">Games</th>
                    <th className="px-6 py-3 text-left text-white">Status</th>
                    <th className="px-6 py-3 text-left text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-t border-gray-700">
                      <td className="px-6 py-4 text-white">{u.username}</td>
                      <td className="px-6 py-4 text-white/70">{u.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={user?.role !== 'admin'}
                          className="bg-white/[0.04] border border-white/10 text-white px-2 py-1 rounded"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-white">{u.rating}</td>
                      <td className="px-6 py-4 text-white">{u.total_games}</td>
                      <td className="px-6 py-4">
                        {u.is_banned ? (
                          <span className="px-2 py-1 bg-red-600 text-white rounded text-sm">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-600 text-white rounded text-sm">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {!u.is_banned ? (
                            <button
                              onClick={() => handleBanUser(u.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                              Ban
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUnbanUser(u.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Unban
                            </button>
                          )}
                          {user?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div>
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.45)] overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-white">ID</th>
                    <th className="px-6 py-3 text-left text-white">Players</th>
                    <th className="px-6 py-3 text-left text-white">Result</th>
                    <th className="px-6 py-3 text-left text-white">Time Control</th>
                    <th className="px-6 py-3 text-left text-white">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id} className="border-t border-white/10">
                      <td className="px-6 py-4 text-white">{game.id}</td>
                      <td className="px-6 py-4 text-white">
                        {game.white_player} vs {game.black_player}
                      </td>
                      <td className="px-6 py-4 text-white">{game.result}</td>
                      <td className="px-6 py-4 text-white">{game.time_control}</td>
                      <td className="px-6 py-4 text-white/70">
                        {new Date(game.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-xl hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
