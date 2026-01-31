import { useGameStore } from '../store/gameStore';

export default function GameStatus() {
  const {
    currentTurn,
    isCheck,
    isCheckmate,
    isStalemate,
    isDraw,
    gameOver,
    winner,
    moveHistory,
  } = useGameStore();

  const getTurnDisplay = () => {
    if (gameOver) {
      if (isCheckmate) {
        return winner === 'white' ? 'White wins by checkmate!' : 'Black wins by checkmate!';
      }
      if (isStalemate) {
        return "Stalemate - It's a draw!";
      }
      if (isDraw) {
        return "Draw by insufficient material or repetition";
      }
    }
    return currentTurn === 'w' ? "White's turn" : "Black's turn";
  };

  const getStatusColor = () => {
    if (gameOver) {
      if (isCheckmate) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      return 'bg-gradient-to-r from-gray-400 to-gray-600';
    }
    if (isCheck) return 'bg-gradient-to-r from-red-500 to-red-700';
    return currentTurn === 'w'
      ? 'bg-gradient-to-r from-slate-700 to-slate-900'
      : 'bg-gradient-to-r from-slate-800 to-black';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Main Status */}
      <div className={`${getStatusColor()} text-white rounded-lg p-4 mb-4 text-center`}>
        <div className="text-2xl font-bold mb-1">{getTurnDisplay()}</div>
        {isCheck && !gameOver && (
          <div className="text-sm font-semibold animate-pulse">Check!</div>
        )}
      </div>

      {/* Game Info */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Move Number:</span>
          <span className="text-sm font-bold text-gray-800">
            {Math.ceil(moveHistory.length / 2)}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Current Turn:</span>
          <span className="text-sm font-bold text-gray-800">
            {currentTurn === 'w' ? '⚪ White' : '⚫ Black'}
          </span>
        </div>

        {gameOver && (
          <div className="pt-3 border-t border-gray-200">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 mb-2">Game Over</div>
              <div className="text-lg font-bold text-gray-800">
                {isCheckmate && `${winner === 'white' ? '⚪' : '⚫'} ${winner?.toUpperCase()} WINS`}
                {isStalemate && 'STALEMATE'}
                {isDraw && !isStalemate && 'DRAW'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Statistics */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Game Info</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>
            <span className="font-medium">Status:</span>{' '}
            {gameOver ? 'Finished' : 'In Progress'}
          </div>
          <div>
            <span className="font-medium">Moves:</span> {moveHistory.length}
          </div>
          <div>
            <span className="font-medium">Check:</span> {isCheck ? 'Yes' : 'No'}
          </div>
          <div>
            <span className="font-medium">Mode:</span> Offline
          </div>
        </div>
      </div>
    </div>
  );
}
