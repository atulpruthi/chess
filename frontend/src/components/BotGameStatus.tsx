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
    capturedPieces,
    resetThinkingState,
  } = useBotGameStore();

  const pieceSymbols: Record<string, string> = {
    p: '♟',
    n: '♞',
    b: '♝',
    r: '♜',
    q: '♛',
    k: '♚',
  };

  const pieceValues: Record<string, number> = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0,
  };

  const calculatePoints = (pieces: string[]): number => {
    return pieces.reduce((total, piece) => total + (pieceValues[piece] || 0), 0);
  };

  // Bot captures the opposite color pieces
  // If player is white, bot is black, so bot captured white pieces (capturedPieces.white)
  const botCapturedPieces = playerColor === 'white' ? capturedPieces.white : capturedPieces.black;
  
  // Player's captured pieces are the opposite
  const playerCapturedPieces = playerColor === 'white' ? capturedPieces.black : capturedPieces.white;

  const playerPoints = calculatePoints(playerCapturedPieces);
  const botPoints = calculatePoints(botCapturedPieces);
  const materialAdvantage = playerPoints - botPoints;

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
    return 'from-amber-600 to-blue-600';
  };

  const getCommentary = (): string => {
    const moveCount = Math.ceil(moveHistory.length / 2);
    const lastMove = moveHistory[moveHistory.length - 1];
    
    if (gameOver) {
      if (isCheckmate && result === playerColor) {
        return 'Excellent! You managed to checkmate the bot. Well played! 🎯';
      }
      if (isCheckmate && result !== playerColor) {
        return "Don't give up! Learn from this game and try again. 💪";
      }
      if (isStalemate) {
        return 'The game ended in stalemate - no legal moves available but not in check.';
      }
      if (isDraw) {
        return 'A draw is a respectable result. Consider it a learning experience!';
      }
      return 'Game over.';
    }

    // Recent capture detection
    if (lastMove && (lastMove.includes('x') || lastMove.includes('×'))) {
      const capturedByPlayer = moveHistory.length % 2 === (playerColor === 'white' ? 1 : 0);
      if (capturedByPlayer) {
        if (materialAdvantage >= 5) {
          return "Excellent capture! You're building a winning advantage. Keep it up! 🎯";
        }
        return "Good trade! Material captures can shift the game in your favor. 💪";
      } else {
        if (materialAdvantage <= -5) {
          return "The bot just captured your piece! Stay focused and look for counterplay. 🔥";
        }
        return "The bot captured a piece. Calculate carefully before your next move. 🤔";
      }
    }

    // Check commentary (priority)
    if (isCheck) {
      const isPlayerInCheck = (playerColor === 'white' && turn === 'w') || (playerColor === 'black' && turn === 'b');
      if (isPlayerInCheck) {
        return 'Your king is in danger! Find a safe square or block the attack. ⚠️';
      } else {
        return 'Nice! You have the bot in check. Can you find a winning continuation? 🎯';
      }
    }

    // Material advantage commentary
    if (materialAdvantage >= 9) {
      return "You're dominating! You have a decisive material advantage. Go for the win! 👑";
    }
    if (materialAdvantage >= 5) {
      return "Great position! You're significantly ahead in material. Keep the pressure on! 🔥";
    }
    if (materialAdvantage >= 3) {
      return "You have a solid advantage! Look for opportunities to convert it into a win. ✨";
    }
    if (materialAdvantage <= -9) {
      return "Don't panic! Focus on defensive play and look for tactical opportunities. 🛡️";
    }
    if (materialAdvantage <= -5) {
      return "You're behind in material. Stay focused and look for counterplay opportunities! 🎯";
    }
    if (materialAdvantage <= -3) {
      return "The bot has a slight edge. Play carefully and watch for tactical chances. 👀";
    }

    // Thinking state
    if (isThinking) {
      return "The bot is calculating... Use this time to plan your strategy! ⏳";
    }

    // Game phase commentary with variety
    if (moveCount <= 5) {
      return 'Opening phase: Control the center and develop your pieces efficiently. 📚';
    }
    if (moveCount <= 10) {
      return 'Continue developing! Get your pieces into active positions. ♟️';
    }
    if (moveCount <= 20) {
      return 'Middle game: Look for tactical opportunities and coordinate your pieces. ⚔️';
    }
    if (moveCount <= 30) {
      return 'Strategic planning! Consider piece exchanges and pawn structure. 🎯';
    }
    return 'Endgame: Activate your king and be precise with your moves! 👑';
  };

  return (
    <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
      <div className={`bg-gradient-to-r ${getStatusColor()} rounded-lg p-4 mb-4`}>
        <h2 className="text-2xl font-bold text-white text-center">
          {getTurnDisplay()}
        </h2>
      </div>

      {/* Player's Captured Pieces */}
      {playerCapturedPieces.length > 0 && (
        <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-gray-400">Your captures:</span>
            <div className="flex gap-1">
              {playerCapturedPieces.map((piece, index) => (
                <span key={index} className="text-xl">
                  {pieceSymbols[piece]}
                </span>
              ))}
            </div>
            <span className="text-sm font-semibold text-green-400 ml-1">
              +{playerPoints}
            </span>
          </div>
        </div>
      )}

      {/* Material Advantage Indicator */}
      {materialAdvantage !== 0 && (
        <div className={`mb-4 p-2 rounded-lg text-center text-sm font-semibold ${
          materialAdvantage > 0 
            ? 'bg-green-500/20 text-green-300' 
            : 'bg-red-500/20 text-red-300'
        }`}>
          {materialAdvantage > 0 
            ? `You're up by ${materialAdvantage} points` 
            : `Bot is up by ${Math.abs(materialAdvantage)} points`}
        </div>
      )}

      {/* Commentary Section */}
      <div className="mb-4 p-4 bg-gradient-to-r from-amber-900/30 to-blue-900/30 rounded-lg">
        <div className="flex items-start gap-2">
          <span className="text-2xl">💬</span>
          <div>
            <div className="text-xs font-semibold text-amber-300 mb-1">Commentary</div>
            <p className="text-sm text-gray-200 leading-relaxed">
              {getCommentary()}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 text-gray-300">
        <div className="flex justify-between items-center">
          <span>Opponent:</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">
              Bot {difficultyEmoji[difficulty]} ({difficulty})
            </span>
            {botCapturedPieces.length > 0 && (
              <>
                <div className="flex gap-0.5">
                  {botCapturedPieces.map((piece, index) => (
                    <span key={index} className="text-lg">
                      {pieceSymbols[piece]}
                    </span>
                  ))}
                </div>
                <span className="text-xs font-semibold text-red-400">
                  +{botPoints}
                </span>
              </>
            )}
          </div>
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

        {isThinking && !gameOver && (
          <div className="mt-4">
            <button
              onClick={resetThinkingState}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-all active:scale-[0.97]"
            >
              Reset Bot Thinking
            </button>
          </div>
        )}

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
