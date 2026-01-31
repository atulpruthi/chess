import { useState } from 'react';
import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserProfile } from './components/UserProfile';
import { useAuthStore } from './store/authStore';
import './App.css';

function App() {
  const [showProfile, setShowProfile] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8 px-4">
        <div className="container mx-auto">
          {/* Header */}
          <header className="text-center mb-8">
            <div className="flex justify-between items-center max-w-7xl mx-auto mb-4">
              <div></div>
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
              Play offline chess with full rule validation
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
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default App;

