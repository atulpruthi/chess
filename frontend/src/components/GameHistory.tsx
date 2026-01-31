import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

interface GameHistoryItem {
  id: number;
  whitePlayerId: number;
  blackPlayerId: number;
  whiteUsername: string;
  blackUsername: string;
  whiteAvatar?: string;
  blackAvatar?: string;
  gameType: string;
  timeControl?: string;
  result: string;
  isRated: boolean;
  totalMoves: number;
  createdAt: string;
  completedAt: string;
  pgn: string;
  userColor: 'white' | 'black';
  userRatingBefore?: number;
  userRatingAfter?: number;
  userRatingChange?: number;
}

const GameHistory: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [games, setGames] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const gamesPerPage = 20;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchGames();
  }, [user, navigate, page]);

  const fetchGames = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const offset = page * gamesPerPage;
      const response = await fetch(
        `http://localhost:5001/api/stats/users/${user.id}/history?limit=${gamesPerPage}&offset=${offset}`
      );

      if (response.ok) {
        const data = await response.json();
        setGames(data);
        setHasMore(data.length === gamesPerPage);
      }
    } catch (error) {
      console.error('Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultBadge = (game: GameHistoryItem) => {
    const isUserWhite = game.userColor === 'white';
    const userWon =
      (game.result === 'white' && isUserWhite) ||
      (game.result === 'black' && !isUserWhite);
    const isDraw = game.result === 'draw';

    if (userWon) {
      return (
        <span className="px-3 py-1 bg-emerald-500 text-white text-sm font-semibold rounded-full">
          Victory
        </span>
      );
    } else if (isDraw) {
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
    if (!game.userRatingChange || !game.isRated) return null;

    const change = game.userRatingChange;
    const color = change > 0 ? 'text-emerald-400' : 'text-red-400';
    const sign = change > 0 ? '+' : '';

    return (
      <span className={`${color} font-semibold`}>
        ({sign}{change})
      </span>
    );
  };

  const getOpponentName = (game: GameHistoryItem) => {
    return game.userColor === 'white' ? game.blackUsername : game.whiteUsername;
  };

  const getTimeControlIcon = (timeControl?: string) => {
    switch (timeControl) {
      case 'bullet':
        return '⚡';
      case 'blitz':
        return '⚔️';
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

  if (loading && page === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading game history...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Game History</h1>
              <p className="text-gray-300">Review your past games</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Games List */}
        <div className="space-y-4">
          {games.length === 0 ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-12 border border-white/20 text-center">
              <div className="text-gray-400 text-lg">No games found</div>
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Play Your First Game
              </button>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:border-purple-500/50 transition cursor-pointer"
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

                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="capitalize">{game.timeControl || 'Custom'}</span>
                        <span>•</span>
                        <span>{game.totalMoves} moves</span>
                        <span>•</span>
                        <span>Playing as {game.userColor}</span>
                        <span>•</span>
                        <span>{formatDate(game.completedAt)}</span>
                      </div>

                      {game.isRated && game.userRatingBefore && game.userRatingAfter && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-400">Rating: </span>
                          <span className="text-white">{game.userRatingBefore}</span>
                          <span className="text-gray-400 mx-2">→</span>
                          <span className="text-white">{game.userRatingAfter}</span>
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
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      📊 Analyze
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewGame(game.id);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
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
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <span className="text-white">Page {page + 1}</span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={!hasMore}
              className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameHistory;
