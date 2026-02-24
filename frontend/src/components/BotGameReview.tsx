import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useBotGameStore } from '../store/botGameStore';
import { chessComOptions, responsiveBoardStyle } from '../styles/chessboardTheme';

interface BotGameReviewProps {
  onClose: () => void;
}

export const BotGameReview: React.FC<BotGameReviewProps> = ({ onClose }) => {
  const { moveHistory, playerColor } = useBotGameStore();
  const [reviewChess] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [position, setPosition] = useState(reviewChess.fen());
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Reset to initial position
    reviewChess.reset();
    setPosition(reviewChess.fen());
    setCurrentMoveIndex(-1);
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isPlaying && currentMoveIndex < moveHistory.length - 1) {
      interval = setInterval(() => {
        handleNext();
      }, 1500);
    } else if (currentMoveIndex >= moveHistory.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentMoveIndex]);

  const handleNext = () => {
    if (currentMoveIndex < moveHistory.length - 1) {
      const nextIndex = currentMoveIndex + 1;
      const moveToMake = moveHistory[nextIndex];
      
      try {
        reviewChess.move(moveToMake);
        setPosition(reviewChess.fen());
        setCurrentMoveIndex(nextIndex);
      } catch (error) {
        console.error('Invalid move:', moveToMake);
      }
    }
  };

  const handlePrevious = () => {
    if (currentMoveIndex >= 0) {
      reviewChess.undo();
      setPosition(reviewChess.fen());
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const handleReset = () => {
    reviewChess.reset();
    setPosition(reviewChess.fen());
    setCurrentMoveIndex(-1);
    setIsPlaying(false);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const getMoveCommentary = (): string => {
    if (currentMoveIndex === -1) {
      return 'Game Review: Use the controls to step through each move and see analysis.';
    }

    const moveNumber = Math.floor(currentMoveIndex / 2) + 1;
    const isWhiteMove = currentMoveIndex % 2 === 0;
    const currentMove = moveHistory[currentMoveIndex];
    const isPlayerMove = (playerColor === 'white' && isWhiteMove) || (playerColor === 'black' && !isWhiteMove);

    // Opening moves (1-10)
    if (moveNumber <= 5) {
      if (currentMove.includes('e4') || currentMove.includes('d4')) {
        return '📚 Classic opening move! Controlling the center is key in the opening phase.';
      }
      if (currentMove.includes('Nf3') || currentMove.includes('Nc3')) {
        return '♞ Good knight development! Developing pieces early is important.';
      }
      return '📖 Opening phase. Focus on controlling the center and developing pieces.';
    }

    // Middle game
    if (moveNumber <= 25) {
      if (currentMove.includes('x')) {
        return isPlayerMove 
          ? '⚔️ Nice capture! Material exchanges are important in the middle game.'
          : '⚠️ The bot captured a piece. Stay alert and calculate your next moves.';
      }
      if (currentMove.includes('+')) {
        return isPlayerMove
          ? '🎯 Check! You\'re putting pressure on the opponent\'s king.'
          : '⚠️ You\'re in check! The bot is attacking your king.';
      }
      if (currentMove.includes('O-O') || currentMove.includes('O-O-O')) {
        return '🏰 Castling! This move keeps the king safe and activates the rook.';
      }
      return '⚔️ Middle game tactics. Look for piece coordination and tactical opportunities.';
    }

    // Endgame
    if (currentMove.includes('x')) {
      return isPlayerMove
        ? '👑 Endgame capture! Every piece matters in the endgame.'
        : '🛡️ Bot captured your piece. Precision is critical in the endgame.';
    }
    if (currentMove.includes('=Q')) {
      return '👑 Pawn promotion! A pawn reached the end and became a queen!';
    }
    if (currentMove.includes('+')) {
      return '⚠️ Check in the endgame! King safety is still paramount.';
    }
    if (currentMove.includes('#')) {
      return '🎉 Checkmate! The game is over - one side has won!';
    }
    return '👑 Endgame: Activate your king and calculate precisely!';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/10">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Game Review</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Chessboard */}
            <div>
              <Chessboard
                options={chessComOptions({
                  id: 'review-board',
                  position,
                  boardOrientation: playerColor,
                  allowDragging: false,
                  boardStyle: {
                    ...responsiveBoardStyle(400, 100),
                  },
                })}
              />
            </div>

            {/* Controls and Commentary */}
            <div className="space-y-4">
              {/* Move Counter */}
              <div className="bg-slate-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm mb-1">Current Move</div>
                <div className="text-white text-2xl font-bold">
                  {currentMoveIndex === -1 ? 'Start' : `${Math.floor(currentMoveIndex / 2) + 1}. ${moveHistory[currentMoveIndex]}`}
                </div>
                <div className="text-gray-400 text-sm mt-1">
                  Move {currentMoveIndex + 1} of {moveHistory.length}
                </div>
              </div>

              {/* Commentary */}
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">💬</span>
                  <div>
                    <div className="text-xs font-semibold text-purple-300 mb-1">Move Analysis</div>
                    <p className="text-sm text-gray-200 leading-relaxed">
                      {getMoveCommentary()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    disabled={currentMoveIndex === -1}
                  >
                    ⏮ Reset
                  </button>
                  <button
                    onClick={handlePrevious}
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    disabled={currentMoveIndex === -1}
                  >
                    ← Previous
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handlePlayPause}
                    className="flex-1 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    disabled={currentMoveIndex >= moveHistory.length - 1}
                  >
                    Next →
                  </button>
                </div>
              </div>

              {/* Move List */}
              <div className="bg-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                <div className="text-sm font-semibold text-white mb-2">All Moves</div>
                <div className="space-y-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, i) => {
                    const moveNumber = i + 1;
                    const whiteMove = moveHistory[i * 2];
                    const blackMove = moveHistory[i * 2 + 1];
                    const isCurrentWhite = currentMoveIndex === i * 2;
                    const isCurrentBlack = currentMoveIndex === i * 2 + 1;
                    
                    return (
                      <div key={moveNumber} className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-8">{moveNumber}.</span>
                        <span className={`flex-1 ${isCurrentWhite ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                          {whiteMove}
                        </span>
                        <span className={`flex-1 ${isCurrentBlack ? 'text-yellow-400 font-bold' : 'text-gray-400'}`}>
                          {blackMove || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
