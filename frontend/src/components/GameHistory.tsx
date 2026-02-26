import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { config } from '../config';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

interface GameHistoryItem {
  id: number;
  whitePlayer: {
    id: number;
    username: string;
    avatar?: string;
    ratingBefore?: number;
    ratingAfter?: number;
    ratingChange?: number;
  };
  blackPlayer: {
    id: number;
    username: string;
    avatar?: string;
    ratingBefore?: number;
    ratingAfter?: number;
    ratingChange?: number;
  };
  result: string;
  timeControl?: string;
  isRated: boolean;
  totalMoves: number;
  completedAt: string;
  isWin: boolean;
  isDraw: boolean;
  playerColor: 'white' | 'black';
}

interface MatchHistoryResponse {
  games: GameHistoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalGames: number;
    hasMore: boolean;
  };
}

const GameHistory: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [timeControlFilter, setTimeControlFilter] = useState<string>('');
  const gamesPerPage = 20;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchGames();
  }, [user, navigate, page, timeControlFilter]);

  const fetchGames = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const timeControlParam = timeControlFilter ? `&timeControl=${timeControlFilter}` : '';
      const response = await fetch(
        `${config.apiUrl}/api/games/user/${user.id}/history?page=${page}&limit=${gamesPerPage}${timeControlParam}`
      );

      if (response.ok) {
        const data: MatchHistoryResponse = await response.json();
        setGames(data.games);
        setTotalPages(data.pagination.totalPages);
        setHasMore(data.pagination.hasMore);
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (game: GameHistoryItem) => {
    if (game.isWin) {
      return (
        <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">
          Victory
        </span>
      );
    } else if (game.isDraw) {
      return (
        <span className="px-3 py-1 bg-blue-500 text-white text-sm font-semibold rounded-full">
          Draw
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-full">
          Defeat
        </span>
      );
    }
  };

  const getRatingChange = (game: GameHistoryItem) => {
    if (!game.isRated) return null;

    const player = game.playerColor === 'white' ? game.whitePlayer : game.blackPlayer;
    const change = player.ratingChange || 0;
    
    if (change === 0) return null;

    const color = change > 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = change > 0 ? '+' : '';

    return (
      <span className={`${color} font-semibold`}>
        ({sign}{change})
      </span>
    );
  };

  const getOpponentName = (game: GameHistoryItem) => {
    return game.playerColor === 'white' ? game.blackPlayer.username : game.whitePlayer.username;
  };

  const getTimeControlIcon = (timeControl?: string) => {
    switch (timeControl) {
      case 'rapid':
        return '🎯';
      case 'classical':
        return '👑';
      default:
        return '♟️';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleViewGame = (gameId: number) => {
    navigate(`/game-replay/${gameId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/lobby', { replace: true });
  };

  if (loading && page === 1) {
    return (
      <div className="lobby-shell flex items-center justify-center p-6">
        <div className="text-white text-xl">Loading game history...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Game History</h1>
              <p className="text-white/70">Review your past games</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setTimeControlFilter('')}
              className={`time-card ${timeControlFilter === '' ? 'active' : ''}`}
              style={{ padding: '12px 24px', fontSize: '16px' }}
            >
              <h4 className="text-white" style={{ margin: 0, fontSize: '16px' }}>All Games</h4>
            </button>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {games.length === 0 ? (
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-12 border border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.45)] text-center">
              <div className="text-white/60 text-lg">No games found</div>
              <button
                onClick={() => navigate('/')}
                className="find-match-btn transition-all duration-200" style={{ marginTop: '24px', width: 'auto', paddingLeft: '48px', paddingRight: '48px' }}
              >
                Play Your First Game
              </button>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 border border-white/10 shadow-[0_14px_50px_rgba(0,0,0,0.45)] hover:border-amber-500/50 transition cursor-pointer"
                onClick={() => handleViewGame(game.id)}
              >
                <div className="flex items-center justify-between">
                  {/* Left side - Game info */}
                  <div className="flex items-center gap-6">
                    {/* Time control icon */}
                    <div className="text-4xl">{getTimeControlIcon(game.timeControl)}</div>

                    {/* Game details */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-white font-semibold text-lg">
                          vs {getOpponentName(game)}
                        </div>
                        {getResultBadge(game)}
                        {game.isRated && (
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-semibold rounded">
                            ⭐ Rated
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span className="capitalize">{game.timeControl || 'Custom'}</span>
                        <span>•</span>
                        <span>{game.totalMoves} moves</span>
                        <span>•</span>
                        <span>Playing as {game.playerColor}</span>
                        <span>•</span>
                        <span>{formatDate(game.completedAt)}</span>
                      </div>

                      {game.isRated && (
                        <div className="mt-2 text-sm">
                          <span className="text-white/60">Rating: </span>
                          {game.playerColor === 'white' ? (
                            <>
                              <span className="text-white">{game.whitePlayer.ratingBefore || 1200}</span>
                              <span className="text-white/40 mx-2">→</span>
                              <span className="text-white">{game.whitePlayer.ratingAfter || 1200}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-white">{game.blackPlayer.ratingBefore || 1200}</span>
                              <span className="text-white/40 mx-2">→</span>
                              <span className="text-white">{game.blackPlayer.ratingAfter || 1200}</span>
                            </>
                          )}
                          {' '}
                          {getRatingChange(game)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right side - Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/game-analysis/${game.id}`);
                      }}
                      className="h-10 px-5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-all active:scale-[0.97]"
                    >
                      📊 Analyze
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewGame(game.id);
                      }}
                      className="h-10 px-5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all active:scale-[0.97]"
                    >
                      View Game →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {games.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-pink-600 text-white rounded-xl hover:from-amber-700 hover:to-pink-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] flex items-center justify-center font-semibold shadow-lg"
              style={{ minWidth: '48px', height: '40px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7"></polyline>
                <polyline points="18 17 13 12 18 7"></polyline>
              </svg>
            </button>

            <span className="text-white font-semibold text-lg">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-pink-600 text-white rounded-xl hover:from-amber-700 hover:to-pink-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] flex items-center justify-center font-semibold shadow-lg"
              style={{ minWidth: '48px', height: '40px' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="13 17 18 12 13 7"></polyline>
                <polyline points="6 17 11 12 6 7"></polyline>
              </svg>
            </button>
          </div>
        )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default GameHistory;
