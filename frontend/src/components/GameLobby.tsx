import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';
import { Matchmaking } from './Matchmaking';

export const GameLobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { socket, isConnected, createRoom, joinRoom } = useSocket();
  const { availableRooms, setAvailableRooms, setCurrentRoom, isSearching, setSearching, error, setError } = useMultiplayerStore();
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('blitz');
  const [selectedTab, setSelectedTab] = useState<'matchmaking' | 'custom'>('matchmaking');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'matchmaking' || tab === 'custom') {
      setSelectedTab(tab);
    }
  }, [location.search]);

  const setLobbyTab = (tab: 'matchmaking' | 'custom') => {
    setSelectedTab(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate({ pathname: '/lobby', search: params.toString() }, { replace: true });
  };

  useEffect(() => {
    if (!socket) return;

    // Listen for room list updates
    socket.on('roomList', (rooms: any[]) => {
      setAvailableRooms(rooms);
      setSearching(false);
    });

    // Listen for online users
    socket.on('onlineUsers', (users: any[]) => {
      setOnlineUsers(users);
    });

    // Listen for room joined
    socket.on('roomJoined', (room: any) => {
      setCurrentRoom(room);
      setSearching(false);
      navigate('/game');
    });

    // Listen for errors
    socket.on('error', (errorMsg: string) => {
      setError(errorMsg);
      setSearching(false);
    });

    // Request initial data
    socket.emit('getRoomList');
    socket.emit('getOnlineUsers');

    // Poll for updates
    const interval = setInterval(() => {
      socket.emit('getRoomList');
      socket.emit('getOnlineUsers');
    }, 5000);

    return () => {
      clearInterval(interval);
      socket.off('roomList');
      socket.off('onlineUsers');
      socket.off('roomJoined');
      socket.off('error');
    };
  }, [socket, navigate, setAvailableRooms, setCurrentRoom, setSearching, setError]);

  const handleCreateRoom = () => {
    setSearching(true);
    setError(null);
    createRoom(selectedTimeControl);
  };

  const handleJoinRoom = (roomId: string) => {
    setSearching(true);
    setError(null);
    joinRoom(roomId);
  };

  const getTimeControlLabel = (timeControl: string) => {
    const labels: { [key: string]: string } = {
      bullet: '1+0',
      blitz: '3+2',
      rapid: '10+0',
      classical: '30+0',
    };
    return labels[timeControl] || timeControl;
  };

  if (!isConnected) {
    return (
      <div className="lobby-shell flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-8 shadow-[0_16px_50px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-white/10 border-t-purple-400"></div>
          </div>
          <h1 className="text-white text-xl font-semibold text-center">Connecting…</h1>
          <p className="text-white/60 text-sm text-center mt-2">
            Connecting to the game server.
          </p>
          <p className="text-white/40 text-xs text-center mt-3">
            If this takes too long, make sure the backend is running on port 5001.
          </p>
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="max-w-[1100px] mx-auto">
          <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
            <div>
              <div className="flex items-center gap-3">
                <div className="lobby-header">
                  <h2>
                    <span
                      className="text-white font-medium cursor-pointer"
                      onClick={() => navigate('/dashboard')}
                    >
                      {user?.username}
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="h-10 px-4 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                >
                  Admin
                </button>
              )}
            </div>
          </header>
        </div>

        {error && (
          <div className="max-w-[1100px] mx-auto mb-8 rounded-2xl border border-red-500/25 bg-red-500/10 backdrop-blur-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-red-400" />
              <p className="text-red-200/90">{error}</p>
            </div>
          </div>
        )}

        <div className="lobby-layout">
          <aside className="lobby-sidebar">
            <div className="lobby-sidebar-nav">
              <button
                onClick={() => setLobbyTab('matchmaking')}
                className={`${selectedTab === 'matchmaking' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
              >
                🔍 Find Match
              </button>
              <button
                onClick={() => setLobbyTab('custom')}
                className={`${selectedTab === 'custom' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
              >
                ➕ Create Game
              </button>
              <button
                onClick={() => navigate('/local?mode=multiplayer')}
                className="btn-secondary sidebar-btn"
              >
                🌐 Online Multiplayer
              </button>
              <button
                onClick={() => navigate('/local?mode=local')}
                className="btn-secondary sidebar-btn"
              >
                ♟️ Local Game
              </button>
              <button onClick={() => navigate('/local?mode=bot')} className="btn-secondary sidebar-btn">
                🤖 Play vs Bot
              </button>
            </div>
          </aside>

          <div className="lobby-main">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Section */}
          <div className="lg:col-span-2">
            {selectedTab === 'matchmaking' ? (
              <Matchmaking />
            ) : (
              <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div>
                    <h2 className="text-[22px] font-semibold text-white">Create a custom game</h2>
                    <p className="text-white/55 mt-1">Choose a time control and publish a room.</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[14px] text-white/50">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Connected</span>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-white/80 font-medium">Time control</label>
                    <span className="text-[14px] text-white/45">{getTimeControlLabel(selectedTimeControl)}</span>
                  </div>
                  <div className="time-controls">
                    {(
                      [
                        { key: 'bullet', label: 'Bullet' },
                        { key: 'blitz', label: 'Blitz' },
                        { key: 'rapid', label: 'Rapid' },
                        { key: 'classical', label: 'Classical' },
                      ] as const
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedTimeControl(key)}
                        className={`time-card ${selectedTimeControl === key ? 'active' : ''}`}
                        aria-pressed={selectedTimeControl === key}
                      >
                        <h4 className="text-white font-semibold">{label}</h4>
                        <span className="text-white/70 text-[14px]">{getTimeControlLabel(key)}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex justify-center">
                <button
                  onClick={handleCreateRoom}
                  disabled={isSearching}
                  className="find-match-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white" />
                      Creating room…
                    </span>
                  ) : (
                    'Create Game'
                  )}
                </button>
                </div>
                {/* Available Rooms */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[20px] font-semibold text-white">Available games</h3>
                    <span className="text-[14px] text-white/45">{availableRooms.length} rooms</span>
                  </div>

                  {availableRooms.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                      <p className="text-white/70 font-medium">No open rooms yet</p>
                      <p className="text-white/45 text-sm mt-1">Create one above to start playing.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {availableRooms.map((room) => (
                        <div
                          key={room.id}
                          className="card-lift flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 hover:bg-white/[0.08] transition-colors"
                        >
                          <div className="min-w-0 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/90 font-bold">
                              {(room.players?.[0]?.username?.[0] || 'G').toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-semibold truncate">
                                {room.players[0]?.username}'s game
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[14px] text-white/55 mt-1">
                                <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
                                  {room.timeControl
                                    ? `${Math.floor(room.timeControl.initial / 60)}+${room.timeControl.increment}`
                                    : getTimeControlLabel(room.gameMode)}
                                </span>
                                <span className="px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.04]">
                                  {room.players.length}/2 players
                                </span>
                                {room.isRated && (
                                  <span className="px-2 py-0.5 rounded-full border border-yellow-400/25 bg-yellow-400/10 text-yellow-200">
                                    Rated
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={room.players.length >= 2 || isSearching}
                            className="h-10 px-5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Join
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Online Users Section */}
          <aside className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl p-6 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">Online players</h2>
                <div className="text-white/55 text-sm mt-1">Who’s currently connected - {onlineUsers.length}</div>
              </div>
              
            </div>

            <div className="online-players">
              <h3>Players</h3>
              <p>Currently online</p>

              {onlineUsers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
                  <div className="text-white/70 font-medium">No players online</div>
                  <div className="text-white/45 text-sm mt-1">Check back in a moment.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto p-1">
                  {onlineUsers.map((player) => (
                    <div key={player.id} className="online-player-row card-lift">
                      <span className="player-status" />
                      <div className="min-w-0 truncate">
                        <span className="player-name truncate">{player.username}</span>
                        <span className="player-rating tabular-nums">{player.rating ?? '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
