import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { appCenteredClass, appPageClass, buttonSecondaryClass, glassCardClass, glassCardSoftClass } from '../styles/appTheme';

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
  const { user, token } = useAuthStore();
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
      <div className={appCenteredClass}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className={appPageClass}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Welcome, {user?.username} ({user?.role})</p>
          </div>
          <button
            onClick={() => navigate('/lobby')}
            className={`${buttonSecondaryClass} px-6 py-2`}
          >
            Back to Game Lobby
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'games'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10'
            }`}
          >
            Games
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`${glassCardClass} p-6`}>
              <h3 className="text-gray-400 text-sm mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-white">{stats.total_users}</p>
              <p className="text-green-400 text-sm mt-2">+{stats.new_users_week} this week</p>
            </div>
            <div className={`${glassCardClass} p-6`}>
              <h3 className="text-gray-400 text-sm mb-2">Total Games</h3>
              <p className="text-3xl font-bold text-white">{stats.total_games}</p>
              <p className="text-blue-400 text-sm mt-2">{stats.games_today} today</p>
            </div>
            <div className={`${glassCardClass} p-6`}>
              <h3 className="text-gray-400 text-sm mb-2">Banned Users</h3>
              <p className="text-3xl font-bold text-white">{stats.banned_users}</p>
            </div>
            <div className={`${glassCardClass} p-6`}>
              <h3 className="text-gray-400 text-sm mb-2">Commentaries</h3>
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
                className="px-4 py-2 bg-white/10 text-white rounded-xl border border-white/10 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className={`${glassCardSoftClass} overflow-hidden`}>
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
                      <td className="px-6 py-4 text-gray-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={user?.role !== 'admin'}
                          className="bg-gray-700 text-white px-2 py-1 rounded"
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
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div>
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-900">
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
                    <tr key={game.id} className="border-t border-gray-700">
                      <td className="px-6 py-4 text-white">{game.id}</td>
                      <td className="px-6 py-4 text-white">
                        {game.white_player} vs {game.black_player}
                      </td>
                      <td className="px-6 py-4 text-white">{game.result}</td>
                      <td className="px-6 py-4 text-white">{game.time_control}</td>
                      <td className="px-6 py-4 text-gray-400">
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
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
