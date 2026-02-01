import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';
import { Matchmaking } from './Matchmaking';

export const GameLobby = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, isConnected, createRoom, joinRoom } = useSocket();
  const { availableRooms, setAvailableRooms, setCurrentRoom, isSearching, setSearching, error, setError } = useMultiplayerStore();
  const [selectedTimeControl, setSelectedTimeControl] = useState<string>('blitz');
  const [selectedTab, setSelectedTab] = useState<'matchmaking' | 'custom'>('matchmaking');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center max-w-md">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/60 mb-4">Connecting to game server...</p>
          <p className="text-white/40 text-sm">
            If this takes too long, make sure the backend server is running on port 5001
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <h1 className="text-4xl font-bold text-white">Game Lobby</h1>
            <div className="flex gap-2">
              {(user?.role === 'admin' || user?.role === 'moderator') && (
                <button
                  onClick={() => navigate('/admin')}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  👑 Admin
                </button>
              )}
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                📊 Dashboard
              </button>
            </div>
          </div>
          <p className="text-white/60">Welcome, {user?.username}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl backdrop-blur-xl">
            <p className="text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 justify-center">
          <button
            onClick={() => setSelectedTab('matchmaking')}
            className={`px-8 py-3 font-semibold rounded-xl transition-all ${
              selectedTab === 'matchmaking'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            🎯 Find Match
          </button>
          <button
            onClick={() => setSelectedTab('custom')}
            className={`px-8 py-3 font-semibold rounded-xl transition-all ${
              selectedTab === 'custom'
                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
            }`}
          >
            🎮 Custom Game
          </button>
          <button
            onClick={() => navigate('/local')}
            className="px-8 py-3 font-semibold rounded-xl transition-all bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
          >
            🤖 Play vs Bot
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Section */}
          <div className="lg:col-span-2">
            {selectedTab === 'matchmaking' ? (
              <Matchmaking />
            ) : (
              <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-semibold text-white mb-6">Create Custom Game</h2>
                
                <div className="mb-6">
                  <label className="block text-white/80 mb-3 font-medium">Time Control</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['bullet', 'blitz', 'rapid', 'classical'].map((control) => (
                      <button
                        key={control}
                    onClick={() => setSelectedTimeControl(control)}
                    className={`px-6 py-3 rounded-2xl font-medium transition-all duration-200 ${
                      selectedTimeControl === control
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="text-sm uppercase tracking-wider">{control}</div>
                    <div className="text-xs opacity-60">{getTimeControlLabel(control)}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={isSearching}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-2xl hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Room...
                </span>
              ) : (
                'Create Game'
              )}
            </button>

            {/* Available Rooms */}
            <div className="mt-8">
              <h3 className="text-xl font-semibold text-white mb-4">Available Games</h3>
              <div className="space-y-3">
                {availableRooms.length === 0 ? (
                  <p className="text-white/40 text-center py-8">No games available. Create one!</p>
                ) : (
                  availableRooms.map((room) => (
                    <div
                      key={room.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all duration-200"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {room.players[0]?.username}'s Game
                        </p>
                        <p className="text-white/60 text-sm">
                          {(room.timeControl
                            ? `${Math.floor(room.timeControl.initial / 60)}+${room.timeControl.increment}`
                            : getTimeControlLabel(room.gameMode))} • {room.players.length}/2 players
                          {room.isRated && <span className="ml-2 text-yellow-400">⭐ Rated</span>}
                        </p>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={room.players.length >= 2 || isSearching}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
              </div>
            )}
          </div>

          {/* Online Users Section */}
          <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6">
            <h2 className="text-2xl font-semibold text-white mb-6">
              Online Players
              <span className="text-white/60 text-sm ml-2">({onlineUsers.length})</span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {onlineUsers.length === 0 ? (
                <p className="text-white/40 text-center py-8">No players online</p>
              ) : (
                onlineUsers.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all duration-200"
                  >
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{player.username}</p>
                      {player.rating && (
                        <p className="text-white/60 text-xs">Rating: {player.rating}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
