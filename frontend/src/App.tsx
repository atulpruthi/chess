import { useState } from 'react';
import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserProfile } from './components/UserProfile';
import { BotSelection } from './components/BotSelection';
import { BotChessBoard } from './components/BotChessBoard';
import { BotGameStatus } from './components/BotGameStatus';
import { useAuthStore } from './store/authStore';
import { useBotGameStore } from './store/botGameStore';
import './App.css';

type GameMode = 'local' | 'bot' | 'selection';

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('selection');
  const { user, isAuthenticated, logout } = useAuthStore();
  const { resetGame: resetBotGame, moveHistory: botMoveHistory } = useBotGameStore();

  const handleNewLocalGame = () => {
    setGameMode('local');
  };

  const handleNewBotGame = () => {
    resetBotGame();
    setGameMode('selection');
  };

  const handleStartBotGame = () => {
    setGameMode('bot');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex justify-between items-center max-w-7xl mx-auto mb-4">
              <div className="flex gap-2">
                {!showProfile && gameMode !== 'selection' && (
                  <button
                    onClick={handleNewBotGame}
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
                  >
                    ← Game Menu
                  </button>
                )}
              </div>
              <h1 className="text-5xl font-bold text-white">
                ♔ Chess Game ♚
              </h1>
              {isAuthenticated && (
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {user?.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{user?.username}</span>
                  </button>
                  <button
                    onClick={logout}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-300 text-lg">
              {gameMode === 'bot' ? 'Playing against Bot' : gameMode === 'local' ? 'Local Game' : 'Choose Your Game Mode'}
            </p>
          </header>

          {showProfile ? (
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => setShowProfile(false)}
                className="mb-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                ← Back to Game
              </button>
              <UserProfile />
            </div>
          ) : gameMode === 'selection' ? (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Game Mode Selection */}
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={handleNewLocalGame}
                  className="p-8 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border-2 border-slate-600 hover:border-purple-500 group"
                >
                  <div className="text-6xl mb-4">♟️</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    Local Game
                  </h3>
                  <p className="text-gray-400">
                    Play against a friend on the same device
                  </p>
                </button>

                <button
                  onClick={handleNewBotGame}
                  className="p-8 bg-slate-800 rounded-lg hover:bg-slate-700 transition-all border-2 border-slate-600 hover:border-blue-500 group"
                >
                  <div className="text-6xl mb-4">🤖</div>
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Play vs Bot
                  </h3>
                  <p className="text-gray-400">
                    Challenge the computer at various difficulty levels
                  </p>
                </button>
              </div>

              <BotSelection onStartGame={handleStartBotGame} />
            </div>
          ) : gameMode === 'bot' ? (
            <>
              {/* Bot Game Area */}
              <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
                {/* Left Panel - Bot Game Status */}
                <div className="lg:w-80 space-y-6">
                  <BotGameStatus />
                  <div className="bg-slate-800 rounded-lg p-4">
                    <button
                      onClick={handleNewBotGame}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                      New Bot Game
                    </button>
                  </div>
                </div>

                {/* Center - Chess Board */}
                <div className="flex-1 flex justify-center items-start">
                  <BotChessBoard />
                </div>

                {/* Right Panel - Move History */}
                <div className="lg:w-80">
                  <div className="bg-slate-800 rounded-lg p-6 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4">Move History</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {botMoveHistory.map((move, index) => (
                        <div key={index} className="text-gray-300">
                          {Math.floor(index / 2) + 1}. {move}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Local Game Area */}
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default App;

