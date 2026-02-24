import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';
import { GameChat } from './GameChat';
import { chessComOptions, ONLINE_MULTIPLAYER_BOARD_PX, responsiveBoardStyle } from '../styles/chessboardTheme';
import { glassCardSoftClass } from '../styles/appTheme';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

export const MultiplayerGame = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { socket, makeMove: sendMove, leaveRoom, offerDraw, respondToDraw, resign } = useSocket();
  const {
    currentRoom,
    updateGameState,
    addMove,
    setGameStatus,
    setDrawOffer,
    reset,
  } = useMultiplayerStore();

  const [game, setGame] = useState<Chess>(new Chess());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [showDrawDialog, setShowDrawDialog] = useState(false);

  useEffect(() => {
    if (!currentRoom) {
      navigate('/lobby');
      return;
    }

    // Set board orientation based on player color
    const myColor = currentRoom.players.find(p => p.username === user?.username)?.color;
    if (myColor) {
      setBoardOrientation(myColor);
    }

    // Initialize game from FEN
    const chess = new Chess(currentRoom.gameState);
    setGame(chess);
  }, [currentRoom, user, navigate]);

  useEffect(() => {
    if (!socket) return;

    socket.on('moveMade', (data: { move: string; fen: string }) => {
      const chess = new Chess(data.fen);
      setGame(chess);
      updateGameState(data.fen);
      addMove(data.move);
    });

    socket.on('gameOver', (data: { winner?: 'white' | 'black' | 'draw'; reason: string }) => {
      setGameStatus('completed', data.winner);
      alert(`Game Over: ${data.reason}`);
    });

    socket.on('ratingUpdate', (data: { oldRating: number; newRating: number; change: number }) => {
      const changeText = data.change > 0 ? `+${data.change}` : `${data.change}`;
      console.log(`Rating updated: ${data.oldRating} → ${data.newRating} (${changeText})`);
      // You can show a toast notification here if you have a toast library
    });

    socket.on('drawOffered', (data: { from: 'white' | 'black' }) => {
      setDrawOffer({ from: data.from, status: 'pending' });
      setShowDrawDialog(true);
    });

    socket.on('drawResponse', (data: { accepted: boolean }) => {
      if (data.accepted) {
        setGameStatus('completed', 'draw');
        setDrawOffer(undefined);
        alert('Draw accepted! Game ended.');
      } else {
        setDrawOffer(undefined);
        alert('Draw offer declined.');
      }
      setShowDrawDialog(false);
    });

    socket.on('playerDisconnected', (data: { player: string }) => {
      alert(`${data.player} disconnected`);
    });

    return () => {
      socket.off('moveMade');
      socket.off('gameOver');
      socket.off('ratingUpdate');
      socket.off('drawOffered');
      socket.off('drawResponse');
      socket.off('playerDisconnected');
    };
  }, [socket, updateGameState, addMove, setGameStatus, setDrawOffer]);

  const onDrop = (sourceSquare: Square, targetSquare: Square) => {
    if (!currentRoom || currentRoom.status !== 'active') return false;

    const myColor = currentRoom.players.find(p => p.username === user?.username)?.color;
    if (myColor !== currentRoom.currentTurn) {
      alert("It's not your turn!");
      return false;
    }

    try {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move) {
        setGame(gameCopy);
        const newFen = gameCopy.fen();
        const newPgn = gameCopy.pgn();
        sendMove(move.san, newFen, newPgn);
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  };

  const handleLogout = () => {
    // Cleanup multiplayer room state before logging out.
    leaveRoom();
    reset();
    logout();
    navigate('/lobby');
  };

  const handleOfferDraw = () => {
    if (currentRoom?.drawOffer?.status === 'pending') {
      alert('A draw offer is already pending');
      return;
    }
    offerDraw();
    alert('Draw offer sent to opponent');
  };

  const handleResign = () => {
    if (confirm('Are you sure you want to resign?')) {
      resign();
    }
  };

  const handleDrawResponse = (accept: boolean) => {
    respondToDraw(accept);
    setShowDrawDialog(false);
  };

  if (!currentRoom) {
    return (
      <div className="lobby-shell flex items-center justify-center p-6">
        <div className={`${glassCardSoftClass} w-full max-w-md p-8 shadow-[0_16px_50px_rgba(0,0,0,0.55)] text-center`}>
          <p className="text-white text-xl font-semibold">Loading game...</p>
          <p className="text-white/60 text-sm mt-2">Preparing your multiplayer room.</p>
        </div>
      </div>
    );
  }

  // Helper function to parse moves into pairs
  const parsedMoves = () => {
    const pairs = [];
    for (let i = 0; i < currentRoom.moves.length; i += 2) {
      pairs.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: currentRoom.moves[i],
        black: currentRoom.moves[i + 1] || null,
      });
    }
    return pairs;
  };

  const whitePlayer = currentRoom.players.find(p => p.color === 'white');
  const blackPlayer = currentRoom.players.find(p => p.color === 'black');
  const totalMoves = currentRoom.moves.length;
  const progressPercentage = totalMoves > 0 ? Math.min((totalMoves / 60) * 100, 100) : 0;

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div
          className="sidebar-logo-container"
          style={{
            marginBottom: '2rem',
            display: 'flex',
            flexDirection: 'row', 
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            position: 'relative',
          }}
        >
          <img
            src={brilliantknightzLogo}
            alt="BrilliantKnightz"
            className="sidebar-logo"
            style={{ width: '150px', height: '150px', cursor: 'pointer' }}
            onClick={() => navigate('/lobby')}
          />
          <img
            src={brilliantknightzBanner}
            alt="Brilliant Knightz"
            style={{
              width: '400px',
              height: '200px',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          />
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
              aria-label={isAuthenticated ? 'Open dashboard' : 'Login'}
              style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
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
              <button onClick={() => navigate('/lobby?tab=matchmaking')} className="btn-primary sidebar-btn">
                <IconMagnifier className="nav-icon" />
                <span>Find Match</span>
              </button>
              <button onClick={() => navigate('/lobby?tab=custom')} className="btn-secondary sidebar-btn">
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
            <div className="mb-4 flex justify-between items-center">
              <div />
              <h1 className="text-2xl font-bold">Multiplayer Game</h1>
              <div className="text-sm text-gray-400">Room: {currentRoom.id}</div>
            </div>

            <div className="flex gap-4 items-start">
              {/* Chessboard */}
              <div>
                <Chessboard
                  options={chessComOptions({
                    id: 'multiplayer-room-chessboard',
                    position: game.fen(),
                    onPieceDrop: ({ sourceSquare, targetSquare }) =>
                      onDrop(sourceSquare as Square, targetSquare as Square),
                    boardOrientation,
                    boardStyle: {
                      ...responsiveBoardStyle(ONLINE_MULTIPLAYER_BOARD_PX, 260),
                    },
                  })}
                />
              </div>

              {/* Vertical Progress Bar */}
              <div className="flex flex-col items-center gap-3" style={{ width: '60px' }}>
                <div
                  className="relative rounded-lg overflow-hidden border-2 border-gray-700"
                  style={{ width: '48px', height: '682px', backgroundColor: '#111827' }}
                >
                  <div
                    className="absolute left-0 right-0"
                    style={{
                      bottom: 0,
                      height: `${progressPercentage}%`,
                      background: 'linear-gradient(to top, #556b2f, #6b8e23, #808000, #9acd32)',
                      boxShadow: '0 -4px 24px rgba(107, 142, 35, 0.7)',
                      width: '100%',
                      transition: 'height 200ms ease-out',
                    }}
                  />
                </div>
                <div className="text-xs text-gray-400 text-center">{totalMoves} moves</div>
              </div>

          {/* Right Sidebar - Move History, Chat and Controls */}
          <div className="space-y-4 flex-1">
            {/* Move History */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-3 text-center">Moves</h3>
              
              {/* Player Info Row */}
              <div className="flex items-center text-sm mb-2 gap-2">
                {/* White Player Info */}
                <div className="flex-1 p-2 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div>
                      <div className="text-white font-semibold text-sm">{whitePlayer?.username || 'White'}</div>
                    </div>
                    {currentRoom.currentTurn === 'white' && currentRoom.status === 'active' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
                
                {/* Black Player Info */}
                <div className="flex-1 p-2 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div>
                      <div className="text-white font-semibold text-sm">{blackPlayer?.username || 'Black'}</div>
                    </div>
                    {currentRoom.currentTurn === 'black' && currentRoom.status === 'active' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1 h-[150px] overflow-y-auto mt-3">
                {parsedMoves().length === 0 ? (
                  <p className="text-white/40 text-center py-4">No moves yet</p>
                ) : (
                  parsedMoves().slice().reverse().map((move, reversedIndex) => {
                    const pairIndex = parsedMoves().length - 1 - reversedIndex;

                    return (
                      <div key={pairIndex} className="text-gray-300 text-sm font-mono whitespace-nowrap overflow-hidden text-ellipsis">
                        {move.moveNumber}. {move.white}{move.black ? ` ... ${move.black}` : ''}
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Game Status */}
              <div className="mt-3 text-center text-sm text-gray-400 pt-3 border-t border-gray-700">
                {currentRoom.status === 'waiting' ? (
                  'Waiting for opponent...'
                ) : currentRoom.status === 'completed' ? (
                  <span className="text-white font-semibold">
                    Game Over{currentRoom.winner ? ` - ${currentRoom.winner} wins!` : ' - Draw'}
                  </span>
                ) : (
                  <span className="text-white">{currentRoom.currentTurn}'s turn</span>
                )}
              </div>
            </div>

            <GameChat />
            
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Game Controls</h3>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleOfferDraw}
                  disabled={currentRoom.status !== 'active'}
                  className="btn-secondary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Offer Draw
                </button>
                <button
                  onClick={handleResign}
                  disabled={currentRoom.status !== 'active'}
                  className="btn-secondary sidebar-btn--logout px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Resign
                </button>
              </div>
            </div>
          </div>

            </div>
          </main>
        </div>

      {/* Draw Offer Dialog */}
      {showDrawDialog && currentRoom.drawOffer?.status === 'pending' && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 rounded-3xl p-8 max-w-md">
            <h3 className="text-2xl font-bold text-white mb-4">Draw Offer</h3>
            <p className="text-white/80 mb-6">
              Your opponent has offered a draw. Do you accept?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => handleDrawResponse(true)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-blue-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
              >
                Accept
              </button>
              <button
                onClick={() => handleDrawResponse(false)}
                className="flex-1 px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-all"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
