import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';

const TIME_CONTROLS = [
  { id: 'bullet', name: 'Bullet', time: '1+0', duration: '1-2 min' },
  { id: 'blitz', name: 'Blitz', time: '3+2', duration: '5-10 min' },
  { id: 'rapid', name: 'Rapid', time: '10+0', duration: '10-20 min' },
  { id: 'classical', name: 'Classical', time: '30+0', duration: '30-60 min' },
];

export const Matchmaking = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket, isConnected } = useSocket();
  const { setCurrentRoom, setSearching, isSearching } = useMultiplayerStore();
  
  const [selectedTimeControl, setSelectedTimeControl] = useState('blitz');
  const [isRated, setIsRated] = useState(true);
  const [searchTime, setSearchTime] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on('matchmakingStatus', (data: { status: string; rating?: number }) => {
      if (data.status === 'searching') {
        setSearching(true);
      } else if (data.status === 'cancelled') {
        setSearching(false);
        setSearchTime(0);
      }
    });

    socket.on('matchFound', (room: any) => {
      setCurrentRoom(room);
      setSearching(false);
      setSearchTime(0);
      navigate('/game');
    });

    socket.on('error', (error: string) => {
      console.error('Matchmaking error:', error);
      setSearching(false);
      setSearchTime(0);
    });

    return () => {
      socket.off('matchmakingStatus');
      socket.off('matchFound');
      socket.off('error');
    };
  }, [socket, navigate, setCurrentRoom, setSearching]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isSearching) {
      interval = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSearching]);

  const handleFindMatch = () => {
    if (!socket || !isConnected) return;
    
    socket.emit('findMatch', {
      timeControl: selectedTimeControl,
      isRated,
    });
    setSearching(true);
    setSearchTime(0);
  };

  const handleCancelSearch = () => {
    if (!socket) return;
    socket.emit('cancelMatchmaking');
    setSearching(false);
    setSearchTime(0);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isConnected) {
    return (
      <div className="card card-lift text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white/60">Connecting to server...</p>
      </div>
    );
  }

  return (
    <div className="card card-lift text-[15px] leading-[1.5]">
      <div className="text-center mb-6">
        <h2 className="text-white font-bold">Find a Match</h2>
        <p>Play rated games to improve your rating</p>
        {user && (
          <div className="rating-badge">
            <span className="text-white/80">Your Rating: </span>
            <span className="text-white font-semibold">{user.rating || 1200}</span>
          </div>
        )}
      </div>

      {!isSearching ? (
        <>
          {/* Time Control Selection */}
          <div className="mb-6">
            <label className="block text-white/80 mb-3 font-medium">Time Control</label>
            <div className="time-controls">
              {TIME_CONTROLS.map((control) => (
                <button
                  key={control.id}
                  type="button"
                  onClick={() => setSelectedTimeControl(control.id)}
                  className={`time-card ${selectedTimeControl === control.id ? 'active' : ''}`}
                  aria-pressed={selectedTimeControl === control.id}
                >
                  <h4 className="text-white font-semibold">{control.name}</h4>
                  <span className="text-white/70 text-[14px]">{control.time}</span>
                  <div className="text-white/50 text-[14px] mt-1">{control.duration}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Rated Toggle */}
          <div className="mb-6 p-4 bg-white/5 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-white/80 font-medium">Game Type:</div>
              <div className="game-type">
                <button
                  type="button"
                  className={isRated ? 'active' : ''}
                  onClick={() => setIsRated(true)}
                >
                  Rated ⏺
                </button>
                <button
                  type="button"
                  className={!isRated ? 'active' : ''}
                  onClick={() => setIsRated(false)}
                >
                  Casual ⭘
                </button>
              </div>
            </div>
          </div>

          {/* Find Match Button */}
          <button
            onClick={handleFindMatch}
            disabled={!isConnected}
            className="find-match-btn transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Find Match
          </button>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-[24px]">{formatTime(searchTime)}</span>
            </div>
          </div>
          
          <h3 className="text-[24px] font-bold text-white mb-2">Searching for opponent...</h3>
          <p className="text-white/60 mb-1">
            {TIME_CONTROLS.find(tc => tc.id === selectedTimeControl)?.name} • {isRated ? 'Rated' : 'Casual'}
          </p>
          <p className="text-white/40 text-[14px] mb-6">Looking for players near your rating</p>
          
          <button
            onClick={handleCancelSearch}
            className="px-8 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-all active:scale-[0.97]"
          >
            Cancel Search
          </button>
        </div>
      )}
    </div>
  );
};
