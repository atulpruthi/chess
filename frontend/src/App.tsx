import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import './App.css';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">
            ♔ Chess Game ♚
          </h1>
          <p className="text-gray-300 text-lg">
            Play offline chess with full rule validation
          </p>
        </header>

        {/* Main Game Area */}
        <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
          {/* Left Panel - Game Status */}
          <div className="lg:w-80 space-y-6">
            <GameStatus />
            <GameControls />
          </div>

          {/* Center - Chess Board */}
          <div className="flex-1 flex justify-center items-start">
            <ChessBoard />
          </div>

          {/* Right Panel - Move History */}
          <div className="lg:w-80">
            <MoveHistory />
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 text-gray-400 text-sm">
          <p>Built with React, TypeScript, chess.js & react-chessboard</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

