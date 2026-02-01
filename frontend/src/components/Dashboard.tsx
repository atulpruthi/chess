import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gamesDrawn: number;
  botGames: number;
  multiplayerGames: number;
  bulletGames: number;
  blitzGames: number;
  rapidGames: number;
  classicalGames: number;
  highestRating: number;
  lowestRating: number;
  bestWinStreak: number;
  currentWinStreak: number;
  lastGameAt?: string;
}

interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockedAt: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch user stats
      const statsRes = await fetch(`http://localhost:5001/api/stats/users/${user.id}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch rank
      const rankRes = await fetch(`http://localhost:5001/api/stats/users/${user.id}/rank`);
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        setRank(rankData.rank);
      }

      // Fetch achievements
      const achievementsRes = await fetch(`http://localhost:5001/api/stats/users/${user.id}/achievements`);
      if (achievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        setAchievements(achievementsData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWinRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesWon / s.gamesPlayed) * 100).toFixed(1);
  };

  const getDrawRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesDrawn / s.gamesPlayed) * 100).toFixed(1);
  };

  const getLossRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesLost / s.gamesPlayed) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Please log in</div>
      </div>
    );
  }

  // Initialize default stats if not loaded
  const displayStats = stats || {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDrawn: 0,
    botGames: 0,
    multiplayerGames: 0,
    bulletGames: 0,
    blitzGames: 0,
    rapidGames: 0,
    classicalGames: 0,
    highestRating: user.rating,
    lowestRating: user.rating,
    bestWinStreak: 0,
    currentWinStreak: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-gray-300">Welcome back, {user.username}!</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Game
            </button>
          </div>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Rating Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Current Rating</div>
            <div className="text-4xl font-bold text-white mb-2">{user.rating}</div>
            <div className="text-sm text-gray-400">
              Global Rank: #{rank || '---'}
            </div>
          </div>

          {/* Games Played Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Games Played</div>
            <div className="text-4xl font-bold text-white mb-2">{displayStats.gamesPlayed}</div>
            <div className="text-sm text-emerald-400">
              {displayStats.multiplayerGames} multiplayer • {displayStats.botGames} vs bot
            </div>
          </div>

          {/* Win Rate Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Win Rate</div>
            <div className="text-4xl font-bold text-emerald-400 mb-2">{getWinRate()}%</div>
            <div className="text-sm text-gray-400">
              {displayStats.gamesWon}W • {displayStats.gamesDrawn}D • {displayStats.gamesLost}L
            </div>
          </div>

          {/* Win Streak Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="text-gray-300 text-sm mb-2">Win Streak</div>
            <div className="text-4xl font-bold text-orange-400 mb-2">
              🔥 {displayStats.currentWinStreak}
            </div>
            <div className="text-sm text-gray-400">
              Best: {displayStats.bestWinStreak}
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Performance Stats */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Performance</h2>
            
            <div className="space-y-4">
              {/* Win/Draw/Loss Distribution */}
              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Wins</span>
                  <span>{displayStats.gamesWon} ({getWinRate()}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{ width: `${getWinRate()}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Draws</span>
                  <span>{displayStats.gamesDrawn} ({getDrawRate()}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${getDrawRate()}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Losses</span>
                  <span>{displayStats.gamesLost} ({getLossRate()}%)</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${getLossRate()}%` }}
                  ></div>
                </div>
              </div>

              {/* Rating Range */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400">Peak Rating</div>
                    <div className="text-2xl font-bold text-emerald-400">
                      {displayStats.highestRating}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400">Lowest Rating</div>
                    <div className="text-2xl font-bold text-red-400">
                      {displayStats.lowestRating}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Time Controls</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <div className="text-white font-semibold">Bullet</div>
                    <div className="text-sm text-gray-400">1+0 minutes</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{displayStats.bulletGames}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">⚔️</div>
                  <div>
                    <div className="text-white font-semibold">Blitz</div>
                    <div className="text-sm text-gray-400">3+2 minutes</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{displayStats.blitzGames}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎯</div>
                  <div>
                    <div className="text-white font-semibold">Rapid</div>
                    <div className="text-sm text-gray-400">10+0 minutes</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{displayStats.rapidGames}</div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">👑</div>
                  <div>
                    <div className="text-white font-semibold">Classical</div>
                    <div className="text-sm text-gray-400">30+0 minutes</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{displayStats.classicalGames}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Achievements</h2>
          
          {achievements.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No achievements unlocked yet. Keep playing to earn them!
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-white/5 rounded-lg p-4 text-center border border-white/10 hover:border-purple-500/50 transition"
                >
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <div className="text-white font-semibold mb-1">{achievement.name}</div>
                  <div className="text-xs text-gray-400 mb-2">{achievement.description}</div>
                  <div className="text-xs text-purple-400">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/game-history')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 rounded-xl transition"
          >
            📜 View Game History
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl transition"
          >
            🏆 View Leaderboard
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition"
          >
            👤 Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
