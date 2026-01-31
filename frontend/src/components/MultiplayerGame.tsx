import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess, type Square } from 'chess.js';
import { useSocket } from '../hooks/useSocket';
import { useMultiplayerStore } from '../store/multiplayerStore';
import { useAuthStore } from '../store/authStore';
import { GameChat } from './GameChat';

export const MultiplayerGame = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
        sendMove(move.san);
        return true;
      }
    } catch (error) {
      console.error('Invalid move:', error);
    }
    return false;
  };

  const handleLeaveGame = () => {
    if (confirm('Are you sure you want to leave the game?')) {
      leaveRoom();
      reset();
      navigate('/lobby');
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center">
          <p className="text-white text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Multiplayer Game</h1>
            <p className="text-white/60">Room: {currentRoom.id}</p>
          </div>
          <button
            onClick={handleLeaveGame}
            className="px-6 py-2 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-all"
          >
            Leave Game
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Players & Status */}
          <div className="space-y-6">
            <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Players</h3>
              <div className="space-y-3">
                {currentRoom.players.map((player) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-2xl ${
                      player.color === currentRoom.currentTurn
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{player.username}</p>
                        <p className="text-white/60 text-sm capitalize">{player.color}</p>
                      </div>
                      {player.color === currentRoom.currentTurn && (
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 space-y-3">
              <h3 className="text-xl font-semibold text-white mb-4">Game Controls</h3>
              <button
                onClick={handleOfferDraw}
                disabled={currentRoom.status !== 'active'}
                className="w-full px-6 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium rounded-xl hover:bg-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Offer Draw
              </button>
              <button
                onClick={handleResign}
                disabled={currentRoom.status !== 'active'}
                className="w-full px-6 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-medium rounded-xl hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Resign
              </button>
            </div>
          </div>

          {/* Center - Chessboard */}
          <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6">
            <Chessboard
              position={game.fen()}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customBoardStyle={{
                borderRadius: '8px',
                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              }}
            />
            <div className="mt-4 text-center">
              <p className="text-white/80">
                {currentRoom.status === 'waiting' ? (
                  'Waiting for opponent...'
                ) : currentRoom.status === 'completed' ? (
                  `Game Over${currentRoom.winner ? ` - ${currentRoom.winner} wins!` : ' - Draw'}`
                ) : (
                  `${currentRoom.currentTurn}'s turn`
                )}
              </p>
            </div>
          </div>

          {/* Right Panel - Chat & Moves */}
          <div className="space-y-6">
            <GameChat />
            
            <div className="backdrop-blur-xl bg-white/[0.03] border border-white/10 rounded-3xl p-6 max-h-64 overflow-y-auto">
              <h3 className="text-xl font-semibold text-white mb-4">Move History</h3>
              <div className="space-y-2">
                {currentRoom.moves.length === 0 ? (
                  <p className="text-white/40 text-center py-4">No moves yet</p>
                ) : (
                  currentRoom.moves.map((move, index) => (
                    <div key={index} className="text-white/80">
                      {Math.floor(index / 2) + 1}. {move}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
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
  );
};
