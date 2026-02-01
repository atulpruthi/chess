import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  username: string;
  rating: number;
  avatarUrl?: string;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  winRate: string;
  bestWinStreak: number;
  lastGameAt?: string;
}

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeControl, setSelectedTimeControl] = useState<string | undefined>(undefined);

  const timeControls = [
    { value: undefined, label: 'All' },
    { value: 'bullet', label: '⚡ Bullet', icon: '⚡' },
    { value: 'blitz', label: '⚔️ Blitz', icon: '⚔️' },
    { value: 'rapid', label: '🎯 Rapid', icon: '🎯' },
    { value: 'classical', label: '👑 Classical', icon: '👑' },
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTimeControl]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = selectedTimeControl ? `?timeControl=${selectedTimeControl}` : '';
      const response = await fetch(`http://localhost:5001/api/stats/leaderboard${params}`);

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-400';
    return 'text-gray-400';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const isCurrentUser = (userId: number) => {
    return user?.id === String(userId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
              <p className="text-gray-300">Top players ranked by rating</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Time Control Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {timeControls.map((tc) => (
              <button
                key={tc.value || 'all'}
                onClick={() => setSelectedTimeControl(tc.value)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedTimeControl === tc.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No players found for this time control
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Player
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                      Games
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                      Win Rate
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                      W/D/L
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-300">
                      Streak
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                        isCurrentUser(entry.userId) ? 'bg-purple-500/10 border-purple-500/30' : ''
                      }`}
                      onClick={() => navigate(`/profile/${entry.userId}`)}
                    >
                      {/* Rank */}
                      <td className="px-6 py-4">
                        <div
                          className={`text-2xl font-bold ${getRankColor(entry.rank)}`}
                        >
                          {getRankBadge(entry.rank)}
                        </div>
                      </td>

                      {/* Player */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                            {entry.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-semibold flex items-center gap-2">
                              {entry.username}
                              {isCurrentUser(entry.userId) && (
                                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">
                                  You
                                </span>
                              )}
                            </div>
                            {entry.lastGameAt && (
                              <div className="text-xs text-gray-400">
                                Last game: {new Date(entry.lastGameAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-2xl font-bold text-white">{entry.rating}</div>
                      </td>

                      {/* Games Played */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg text-white">{entry.gamesPlayed}</div>
                      </td>

                      {/* Win Rate */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg font-semibold text-emerald-400">
                          {entry.winRate}%
                        </div>
                      </td>

                      {/* W/D/L */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-sm text-gray-300">
                          <span className="text-emerald-400">{entry.gamesWon}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="text-blue-400">{entry.gamesDrawn}</span>
                          <span className="text-gray-500"> / </span>
                          <span className="text-red-400">{entry.gamesLost}</span>
                        </div>
                      </td>

                      {/* Best Streak */}
                      <td className="px-6 py-4 text-center">
                        <div className="text-lg text-orange-400">
                          🔥 {entry.bestWinStreak}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-sm text-gray-400 text-center">
            Rankings are updated in real-time based on rated games. Play more games to climb the leaderboard!
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
