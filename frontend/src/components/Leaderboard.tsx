import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

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
  const { user, isAuthenticated, logout } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeControl] = useState<string | undefined>(undefined);

  // Time control filter - commented out for now
  // const timeControls = [
  //   { value: undefined, label: 'All' },
  //   { value: 'bullet', label: '⚡ Bullet', icon: '⚡' },
  //   { value: 'blitz', label: '⚔️ Blitz', icon: '⚔️' },
  //   { value: 'rapid', label: '🎯 Rapid', icon: '🎯' },
  //   { value: 'classical', label: '👑 Classical', icon: '👑' },
  // ];

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

  const handleLogout = () => {
    logout();
    navigate('/lobby', { replace: true });
  };

  const isCurrentUser = (userId: number) => {
    return user?.id === String(userId);
  };

  if (loading) {
    return (
      <div className="lobby-shell flex items-center justify-center p-6">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <div className="sidebar-user-avatar" style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  : (user?.username?.[0] ?? 'U').toUpperCase()
                }
              </div>
            )}
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

            {isAuthenticated && (
              <div className="lobby-sidebar-footer">
                <button type="button" onClick={handleLogout} className="btn-secondary sidebar-btn sidebar-btn--logout">
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>

          <main className="lobby-main">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🏆 Leaderboard</h1>
            <p className="text-white/70">Top players ranked by rating</p>
            </div>
          </div>
        </div>

        {/* Time Control Filter */}
        {/*<div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            {timeControls.map((tc) => (
              <button
                key={tc.value || 'all'}
                onClick={() => setSelectedTimeControl(tc.value)}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  selectedTimeControl === tc.value
                    ? 'bg-amber-600 text-white'
                    : 'bg-white/10 border border-white/10 text-white/70 hover:bg-white/15'
                }`}
              >
                {tc.label}
              </button>
            ))}
          </div>
        </div>*/}

        {/* Leaderboard Table */}
        <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.45)] overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-white/60">
              No players found for this time control
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                      Rank
                    </th>
                    <th className="px-3 py-4 text-left text-sm font-semibold text-white/80">
                      Player
                    </th>
                    <th className="px-3 py-4 text-center text-sm font-semibold text-white/80">
                      Rating
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">
                      Games
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">
                      Win Rate
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">
                      W/D/L
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-white/80">
                      Streak
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.userId}
                      className={`border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                        isCurrentUser(entry.userId) ? 'bg-amber-500/10 border-amber-500/30' : ''
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
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="text-white font-semibold flex items-center gap-2">
                              {entry.username}
                              {isCurrentUser(entry.userId) && (
                                <span className="px-2 py-0.5 bg-amber-600 text-white text-xs rounded">
                                  You
                                </span>
                              )}
                            </div>
                            {entry.lastGameAt && (
                              <div className="text-xs text-white/40">
                                Last game: {new Date(entry.lastGameAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="px-3 py-4 text-center">
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
                        <div className="text-sm text-white/70">
                          <span className="text-emerald-400">{entry.gamesWon}</span>
                          <span className="text-white/40"> / </span>
                          <span className="text-blue-400">{entry.gamesDrawn}</span>
                          <span className="text-white/40"> / </span>
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
        <div className="mt-6 card-lift rounded-2xl bg-white/[0.03] backdrop-blur-xl p-4 border border-white/10">
          <div className="text-sm text-white/60 text-center">
            Rankings are updated in real-time based on rated games. Play more games to climb the leaderboard!
          </div>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
