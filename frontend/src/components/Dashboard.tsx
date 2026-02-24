import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { appCenteredClass } from '../styles/appTheme';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

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
  const { user, isAuthenticated, logout } = useAuthStore();
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

  const clampPercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  };

  const handleLogout = () => {
    logout();
    navigate('/lobby', { replace: true });
  };

  const getWinRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesWon / s.gamesPlayed) * 100).toFixed(1);
  };

  const getWinRateValue = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return clampPercent((s.gamesWon / s.gamesPlayed) * 100);
  };

  const getDrawRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesDrawn / s.gamesPlayed) * 100).toFixed(1);
  };

  const getDrawRateValue = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return clampPercent((s.gamesDrawn / s.gamesPlayed) * 100);
  };

  const getLossRate = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return ((s.gamesLost / s.gamesPlayed) * 100).toFixed(1);
  };

  const getLossRateValue = () => {
    const s = stats || displayStats;
    if (!s || s.gamesPlayed === 0) return 0;
    return clampPercent((s.gamesLost / s.gamesPlayed) * 100);
  };

  if (loading) {
    return (
      <div className={appCenteredClass}>
        <div className="text-slate-700 text-xl font-semibold">Loading dashboard...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={appCenteredClass}>
        <div className="text-slate-700 text-xl font-semibold">Please log in</div>
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
        <header className="flex flex-col gap-4 md:gap-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[30px] font-extrabold">
                {user?.username}
              </div>
              <div>
                Rating <span className="font-normal">{user.rating ?? '—'}</span> · Global Rank{' '}
                <span className="font-normal">#{rank || '---'}</span>
              </div>
            </div>

            <div className="flex flex-wrap" style={{ marginTop: '20px' }}>
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="h-11 px-5 rounded-2xl bg-red-600 text-white font-semibold shadow-sm hover:bg-red-700 transition-colors"
                >
                  Admin
                </button>
              )}
            </div>
          </div>

          <div className="text-slate-500 text-sm" style={{ marginTop: '20px' }} >All-time stats and recent performance</div>
        </header>

        <section className="flex w-full gap-7 overflow-x-auto overflow-y-visible py-3 px-2 mb-8" style={{marginTop: '20px'}}>
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-8 py-10 text-center shadow-[0_14px_50px_rgba(0,0,0,0.45)] flex-1 min-w-[280px]">
            <div className="text-[14px] font-semibold tracking-widest text-white/60 mb-8">GAMES PLAYED</div>
            <div className="text-[88px] font-bold leading-none text-orange-400 mb-6">{displayStats.gamesPlayed}</div>
            <div className="text-base text-white/60">
              {displayStats.multiplayerGames} multiplayer • {displayStats.botGames} vs bot
            </div>
          </div>

          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-8 py-10 text-center shadow-[0_14px_50px_rgba(0,0,0,0.45)] flex-1 min-w-[280px]">
            <div className="text-[14px] font-semibold tracking-widest text-white/60 mb-8">WIN RATE</div>
            <div className="text-[88px] font-bold leading-none text-blue-400 mb-6">{getWinRate()}%</div>
            <div className="text-base text-white/60">
              {displayStats.gamesWon}W • {displayStats.gamesDrawn}D • {displayStats.gamesLost}L
            </div>
          </div>

          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-8 py-10 text-center shadow-[0_14px_50px_rgba(0,0,0,0.45)] flex-1 min-w-[280px]">
            <div className="text-[14px] font-semibold tracking-widest text-white/60 mb-8">WIN STREAK</div>
            <div className="text-[88px] font-bold leading-none text-green-400 mb-6">{displayStats.currentWinStreak}</div>
            <div className="text-base text-white/60">Best: {displayStats.bestWinStreak}</div>
          </div>
        </section>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{marginTop: '20px'}}>
          {/* Performance Stats */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60">PERFORMANCE</div>
            <div className="h-px bg-white/10 mt-6 mb-10" />

            <div className="space-y-9">
              <div>
                <div className="flex items-end justify-between mb-4">
                  <div className="text-2xl font-medium text-white/80">Wins</div>
                  <div className="text-2xl">
                    <span className="font-semibold text-white">{displayStats.gamesWon}</span>{' '}
                    <span className="text-white/60 font-medium">({getWinRate()}%)</span>
                  </div>
                </div>

                <div className="w-full h-5 rounded-full bg-white/10 shadow-inner overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_10px_22px_rgba(16,185,129,0.25)]"
                    style={{ width: `${getWinRateValue()}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-4">
                  <div className="text-2xl font-medium text-white/80">Draws</div>
                  <div className="text-2xl">
                    <span className="font-semibold text-white">{displayStats.gamesDrawn}</span>{' '}
                    <span className="text-white/60 font-medium">({getDrawRate()}%)</span>
                  </div>
                </div>

                <div className="w-full h-5 rounded-full bg-white/10 shadow-inner overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
                    style={{ width: `${getDrawRateValue()}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-end justify-between mb-4">
                  <div className="text-2xl font-medium text-white/80">Losses</div>
                  <div className="text-2xl">
                    <span className="font-semibold text-white">{displayStats.gamesLost}</span>{' '}
                    <span className="text-white/60 font-medium">({getLossRate()}%)</span>
                  </div>
                </div>

                <div className="w-full h-5 rounded-full bg-white/10 shadow-inner overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 via-red-400 to-rose-300 shadow-[0_10px_22px_rgba(239,68,68,0.22)]"
                    style={{ width: `${getLossRateValue()}%` }}
                  />
                </div>
              </div>

              <div className="pt-10 mt-2 border-t border-white/10">
                <div className="grid grid-cols-2 divide-x divide-white/10">
                  <div className="text-center">
                    <div className="text-xl text-white/60">Peak Rating</div>
                    <div className="mt-2 text-5xl font-semibold text-emerald-400">{displayStats.highestRating}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl text-white/60">Lowest Rating</div>
                    <div className="mt-2 text-5xl font-semibold text-red-400">{displayStats.lowestRating}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* Achievements */}
        <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-8 py-10 shadow-[0_14px_50px_rgba(0,0,0,0.45)]" style={{marginTop: '20px'}}>
          <div className="text-[14px] font-semibold tracking-widest text-white/60 mb-8">ACHIEVEMENTS</div>

          {achievements.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white font-semibold">No achievements unlocked yet.</div>
              <div className="text-white/60 text-sm mt-1">Keep playing to earn them!</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 text-center shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="text-4xl mb-2">{achievement.icon}</div>
                  <div className="text-white font-semibold mb-1">{achievement.name}</div>
                  <div className="text-xs text-white/60 mb-2">{achievement.description}</div>
                  <div className="text-xs text-purple-400">
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex w-full gap-4 mt-8">
          <button
            onClick={() => navigate('/game-history')}
            className="btn-secondary flex-1 whitespace-nowrap"
          >
            📜 Game History
          </button>
          <button
            onClick={() => navigate('/leaderboard')}
            className="btn-secondary flex-1 whitespace-nowrap"
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="btn-secondary flex-1 whitespace-nowrap"
          >
            👤 Profile
          </button>
          {/* <button
            onClick={() => navigate('/settings')}
            className="btn-secondary flex-1 whitespace-nowrap"
          >
            ⚙️ Settings
          </button> */}
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
