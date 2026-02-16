import { useGameStore } from '../store/gameStore';

export default function GameControls() {
  const { resetGame, undoMove, moveHistory, gameOver } = useGameStore();

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Game Controls</h3>

      <div className="space-y-3">
        <button
          onClick={resetGame}
          className="find-match-btn find-match-btn--full transition-all duration-200"
        >
          New Game
        </button>

        <button
          onClick={undoMove}
          disabled={moveHistory.length === 0 || gameOver}
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo Move
        </button>

        <button
          disabled
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Offer Draw (Coming Soon)
        </button>

        <button
          disabled
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resign (Coming Soon)
        </button>
      </div>
    </div>
  );
}
