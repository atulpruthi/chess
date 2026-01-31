import { useGameStore } from '../store/gameStore';

export default function GameControls() {
  const { resetGame, undoMove, moveHistory, gameOver } = useGameStore();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Game Controls</h3>

      <div className="space-y-3">
        <button
          onClick={resetGame}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm"
        >
          New Game
        </button>

        <button
          onClick={undoMove}
          disabled={moveHistory.length === 0 || gameOver}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Undo Move
        </button>

        <button
          disabled
          className="w-full bg-gray-300 text-gray-500 font-semibold py-2 px-4 rounded-lg cursor-not-allowed"
        >
          Offer Draw (Coming Soon)
        </button>

        <button
          disabled
          className="w-full bg-gray-300 text-gray-500 font-semibold py-2 px-4 rounded-lg cursor-not-allowed"
        >
          Resign (Coming Soon)
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Click a piece to see legal moves</li>
          <li>• Drag and drop pieces to move</li>
          <li>• Right-click to highlight squares</li>
          <li>• All chess rules are enforced</li>
        </ul>
      </div>
    </div>
  );
}
