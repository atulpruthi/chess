import React from 'react';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';

export const MultiplayerGameStatus: React.FC = () => {
  const {
    turn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    gameOver,
    result,
    moveHistory,
    playerColor,
    opponent,
    drawOffered,
    opponentDisconnected,
    resign,
    offerDraw,
    acceptDraw,
  } = useMultiplayerGameStore();

  const getTurnDisplay = () => {
    if (gameOver) {
      if (isCheckmate) {
        return result === playerColor ? 'You Win! 🎉' : 'You Lost';
      }
      if (isStalemate) return 'Stalemate';
      if (isDraw) return 'Draw';
      return 'Game Over';
    }

    if (opponentDisconnected) {
      return 'Opponent Disconnected';
    }

    const isMyTurn =
      (playerColor === 'white' && turn === 'w') ||
      (playerColor === 'black' && turn === 'b');

    if (isCheck) {
      return isMyTurn ? 'You are in Check! ⚠️' : 'Opponent is in Check! ⚠️';
    }

    return isMyTurn ? 'Your Turn' : "Opponent's Turn";
  };

  const getStatusColor = () => {
    if (gameOver) {
      if (isCheckmate && result === playerColor) {
        return 'from-green-600 to-emerald-600';
      }
      if (isCheckmate) {
        return 'from-red-600 to-rose-600';
      }
      return 'from-gray-600 to-slate-600';
    }
    if (opponentDisconnected) return 'from-orange-600 to-red-600';
    if (isCheck) return 'from-red-600 to-orange-600';
    return 'from-purple-600 to-blue-600';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <div className={`bg-gradient-to-r ${getStatusColor()} rounded-lg p-4 mb-4`}>
        <h2 className="text-2xl font-bold text-white text-center">
          {getTurnDisplay()}
        </h2>
      </div>

      <div className="space-y-3 text-gray-300">
        <div className="flex justify-between items-center">
          <span>Opponent:</span>
          <span className="font-semibold text-white">
            {opponent?.username || 'Waiting...'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>Playing as:</span>
          <span className="font-semibold text-white">
            {playerColor === null
              ? 'Assigning…'
              : playerColor === 'white'
                ? '♔ White'
                : '♚ Black'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>Move Count:</span>
          <span className="font-semibold text-white">
            {Math.ceil(moveHistory.length / 2)}
          </span>
        </div>
      </div>

      {/* Draw offer notification */}
      {drawOffered && !gameOver && (
        <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-600 rounded-lg">
          <p className="text-yellow-200 text-sm text-center mb-2">
            Your opponent offered a draw
          </p>
          <button
            onClick={acceptDraw}
            className="w-full py-2 bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition-colors"
          >
            Accept Draw
          </button>
        </div>
      )}

      {/* Game controls */}
      {!gameOver && !opponentDisconnected && (
        <div className="mt-4 space-y-2">
          <button
            onClick={offerDraw}
            className="w-full py-2 bg-slate-700 text-white font-semibold rounded-lg hover:bg-slate-600 transition-colors"
          >
            Offer Draw
          </button>
          <button
            onClick={resign}
            className="w-full py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Resign
          </button>
        </div>
      )}

      {/* Game over message */}
      {gameOver && (
        <div className="mt-4 p-3 bg-slate-700 rounded-lg">
          <p className="text-sm text-center text-gray-300">
            {isCheckmate && result === playerColor && 'Congratulations! You won by checkmate!'}
            {isCheckmate && result !== playerColor && 'You lost by checkmate.'}
            {isStalemate && 'The game ended in stalemate.'}
            {isDraw && 'The game ended in a draw.'}
          </p>
        </div>
      )}
    </div>
  );
};
