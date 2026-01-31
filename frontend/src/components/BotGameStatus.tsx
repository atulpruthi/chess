import React from 'react';
import { useBotGameStore } from '../store/botGameStore';

const difficultyEmoji: Record<string, string> = {
  easy: '🐢',
  medium: '🦊',
  hard: '🦁',
  expert: '🐉',
};

export const BotGameStatus: React.FC = () => {
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
    difficulty,
    isThinking,
  } = useBotGameStore();

  const getTurnDisplay = () => {
    if (gameOver) {
      if (isCheckmate) {
        return result === playerColor ? 'You Win! 🎉' : 'Bot Wins 🤖';
      }
      if (isStalemate) return 'Stalemate';
      if (isDraw) return 'Draw';
      return 'Game Over';
    }

    if (isThinking) {
      return 'Bot is thinking... 🤔';
    }

    const isPlayerTurn = 
      (playerColor === 'white' && turn === 'w') ||
      (playerColor === 'black' && turn === 'b');

    if (isCheck) {
      return isPlayerTurn ? 'You are in Check! ⚠️' : 'Bot is in Check! ⚠️';
    }

    return isPlayerTurn ? 'Your Turn' : "Bot's Turn";
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
    if (isCheck) return 'from-red-600 to-orange-600';
    if (isThinking) return 'from-blue-600 to-cyan-600';
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
            Bot {difficultyEmoji[difficulty]} ({difficulty})
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>Playing as:</span>
          <span className="font-semibold text-white">
            {playerColor === 'white' ? '♔ White' : '♚ Black'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span>Move Count:</span>
          <span className="font-semibold text-white">
            {Math.ceil(moveHistory.length / 2)}
          </span>
        </div>

        {gameOver && (
          <div className="mt-4 p-3 bg-slate-700 rounded-lg">
            <p className="text-sm text-center text-gray-300">
              {isCheckmate && result === playerColor && 'Congratulations! You checkmated the bot!'}
              {isCheckmate && result !== playerColor && 'The bot checkmated you. Better luck next time!'}
              {isStalemate && 'The game ended in stalemate.'}
              {isDraw && 'The game ended in a draw.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
