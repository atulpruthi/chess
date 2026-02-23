import { useGameStore } from '../store/gameStore';

export default function GameControls() {
  const { resetGame, undoMove, offerDraw, resign, moveHistory, gameOver, currentTurn, isGameStarted } = useGameStore();
  const isNewGameDisabled = isGameStarted && !gameOver;
  const areControlsDisabled = !isGameStarted || gameOver;

  const handleResign = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      const resigningColor = currentTurn === 'w' ? 'white' : 'black';
      resign(resigningColor);
    }
  };

  const handleOfferDraw = () => {
    if (window.confirm('Offer a draw? (In local mode, this will end the game as a draw)')) {
      offerDraw();
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Game Controls</h3>

      <div className="space-y-3">
        <button
          onClick={resetGame}
          disabled={isNewGameDisabled}
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New Game
        </button>

        <button
          onClick={undoMove}
          disabled={areControlsDisabled || moveHistory.length === 0}
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Undo Move
        </button>

        <button
          onClick={handleOfferDraw}
          disabled={areControlsDisabled}
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Offer Draw
        </button>

        <button
          onClick={handleResign}
          disabled={areControlsDisabled}
          className="find-match-btn find-match-btn--full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resign
        </button>
      </div>
    </div>
  );
}
