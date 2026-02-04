import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UserProfile } from './components/UserProfile';
import { BotSelection } from './components/BotSelection';
import { BotChessBoard } from './components/BotChessBoard';
import { BotGameStatus } from './components/BotGameStatus';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerChessBoard } from './components/MultiplayerChessBoard';
import { MultiplayerGameStatus } from './components/MultiplayerGameStatus';
import { MultiplayerChat } from './components/MultiplayerChat';
import { useAuthStore } from './store/authStore';
import { useBotGameStore } from './store/botGameStore';
import { useMultiplayerGameStore } from './store/multiplayerGameStore';
import { appShellClass, glassCardSoftClass, buttonSecondaryClass, buttonPrimaryClass } from './styles/appTheme';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './components/icons/NavIcons';
import './App.css';

type GameMode = 'local' | 'bot' | 'multiplayer' | 'selection';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('selection');
  const [botOnlyMenu, setBotOnlyMenu] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { resetGame: resetBotGame, moveHistory: botMoveHistory } = useBotGameStore();
  const { resetGame: resetMultiplayerGame, moveHistory: multiplayerMoveHistory } = useMultiplayerGameStore();

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

  const handleStartMultiplayer = () => {
    setGameMode('multiplayer');
  };

  const handleBackToMenu = () => {
    if (gameMode === 'bot') {
      resetBotGame();
    } else if (gameMode === 'multiplayer') {
      resetMultiplayerGame();
    }
    setGameMode('selection');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') as GameMode | null;

    if (mode === 'local') {
      setBotOnlyMenu(false);
      setGameMode('local');
    } else if (mode === 'multiplayer') {
      setBotOnlyMenu(false);
      setGameMode('multiplayer');
    } else if (mode === 'bot') {
      setBotOnlyMenu(true);
      setGameMode('selection');
    } else {
      setBotOnlyMenu(false);
    }
  }, [location.search]);

  const urlMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('mode') as GameMode | null;
  }, [location.search]);

  const useLobbyShell = (urlMode === 'bot' || urlMode === 'multiplayer' || urlMode === 'local') && !showProfile;

  const goLobbyTab = (tab: 'matchmaking' | 'custom') => {
    navigate(`/lobby?tab=${tab}`);
  };

  return (
    <ProtectedRoute>
      <div className={useLobbyShell ? 'lobby-shell' : `${appShellClass} py-8 px-4`}>
        <div className={useLobbyShell ? 'max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8' : 'container mx-auto'}>
          {useLobbyShell ? (
            <div className="max-w-[1100px] mx-auto">
              <header className="flex flex-col items-start gap-4 mb-8">
                {urlMode === 'multiplayer' || urlMode === 'local' || urlMode === 'bot' ? null : (
                  <div className="lobby-header">
                    <h1 className="text-white tracking-tight">Play vs Bot</h1>
                    <p>
                      Welcome, <span className="text-white font-medium">{user?.username}</span>
                    </p>
                  </div>
                )}
              </header>
            </div>
          ) : (
            /* Header */
            <header className="text-center mb-8">
              <div className="flex justify-between items-center max-w-7xl mx-auto mb-4">
                <div />
                <h1 className="text-5xl font-bold text-white">♔ Chess Game ♚</h1>
                {isAuthenticated && (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setShowProfile(!showProfile)}
                      className={`flex items-center gap-2 px-4 py-2 ${glassCardSoftClass} hover:bg-white/[0.06] transition-colors`}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {user?.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-medium">{user?.username}</span>
                    </button>
                  </div>
                )}
              </div>
            </header>
          )}

          {showProfile ? (
            <div className="max-w-7xl mx-auto">
              <button
                onClick={() => setShowProfile(false)}
                className={`${buttonSecondaryClass} mb-4 px-4 py-2`}
              >
                ← Back to Game
              </button>
              <UserProfile />
            </div>
          ) : useLobbyShell ? (
            <div className="lobby-layout">
              <aside className="lobby-sidebar">
                <button
                  type="button"
                  className="sidebar-user"
                  onClick={() => navigate('/dashboard')}
                  aria-label="Open dashboard"
                >
                  <div className="sidebar-user-avatar">
                    {(user?.username?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <div>
                    <div className="sidebar-user-name">{user?.username ?? 'User'}</div>
                    <div className="sidebar-user-hint">Dashboard</div>
                  </div>
                </button>

                <div className="lobby-sidebar-nav">
                  <button onClick={() => goLobbyTab('matchmaking')} className="btn-secondary sidebar-btn">
                    <IconMagnifier className="nav-icon" />
                    <span>Find Match</span>
                  </button>
                  <button onClick={() => goLobbyTab('custom')} className="btn-secondary sidebar-btn">
                    <IconPlus className="nav-icon" />
                    <span>Create Game</span>
                  </button>
                  <button
                    onClick={() => navigate('/local?mode=multiplayer')}
                    className={`${urlMode === 'multiplayer' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconGlobe className="nav-icon" />
                    <span>Online Multiplayer</span>
                  </button>
                  <button
                    onClick={() => navigate('/local?mode=local')}
                    className={`${urlMode === 'local' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconChessboard className="nav-icon" />
                    <span>Local Game</span>
                  </button>
                  <button
                    onClick={() => navigate('/local?mode=bot')}
                    className={`${urlMode === 'bot' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconRobot className="nav-icon" />
                    <span>Play vs Bot</span>
                  </button>
                </div>

                <div className="lobby-sidebar-footer">
                  <button
                    type="button"
                    onClick={logout}
                    className="btn-secondary sidebar-btn sidebar-btn--logout"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              </aside>

              <div className="lobby-main">
                {gameMode === 'selection' ? (
                  <div className="max-w-7xl mx-auto space-y-6">
                    {!botOnlyMenu && (
                      <>
                        {/* Game Mode Selection */}
                        <div className="grid md:grid-cols-3 gap-6">
                          <button
                            onClick={handleNewLocalGame}
                            className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-purple-500/50 group`}
                          >
                            <IconChessboard className="kid-hero-icon" />
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                              Local Game
                            </h3>
                            <p className="text-gray-400">
                              Play against a friend on the same device
                            </p>
                          </button>

                          <button
                            onClick={handleNewBotGame}
                            className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-blue-500/50 group`}
                          >
                            <IconRobot className="kid-hero-icon" />
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                              Play vs Bot
                            </h3>
                            <p className="text-gray-400">
                              Challenge the computer at various difficulty levels
                            </p>
                          </button>

                          <button
                            onClick={handleStartMultiplayer}
                            className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-emerald-500/40 group`}
                          >
                            <IconGlobe className="kid-hero-icon" />
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                              Online Multiplayer
                            </h3>
                            <p className="text-gray-400">
                              Play against players from around the world
                            </p>
                          </button>
                        </div>
                      </>
                    )}

                    <BotSelection onStartGame={handleStartBotGame} />
                  </div>
                ) : gameMode === 'multiplayer' ? (
                  <>
                    {/* Multiplayer Game Area */}
                    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
                      {/* Left Panel - Game Status */}
                      <div className="lg:w-80 space-y-6">
                        <MultiplayerLobby onGameStart={() => {}} />
                        <MultiplayerGameStatus />
                      </div>

                      {/* Center - Chess Board */}
                      <div className="flex-1 flex justify-center items-start">
                        <MultiplayerChessBoard />
                      </div>

                      {/* Right Panel - Chat and Move History */}
                      <div className="lg:w-80 space-y-6">
                        <MultiplayerChat />
                        <div className={`${glassCardSoftClass} p-6 shadow-xl`}>
                          <h3 className="text-xl font-bold text-white mb-4">Move History</h3>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {multiplayerMoveHistory.map((move, index) => (
                              <div key={index} className="text-gray-300">
                                {Math.floor(index / 2) + 1}. {move}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : gameMode === 'bot' ? (
                  <>
                    {/* Bot Game Area */}
                    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
                      {/* Left Panel - Bot Game Status */}
                      <div className="lg:w-80 space-y-6">
                        <BotGameStatus />
                        <div className={`${glassCardSoftClass} p-4`}>
                          <button
                            onClick={handleBackToMenu}
                            className={`${buttonPrimaryClass} w-full py-3`}
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
                        <div className={`${glassCardSoftClass} p-6 shadow-xl`}>
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
          ) : gameMode === 'selection' ? (
            <div className="max-w-7xl mx-auto space-y-6">
              {!botOnlyMenu && (
                <>
                  {/* Game Mode Selection */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <button
                      onClick={handleNewLocalGame}
                      className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-purple-500/50 group`}
                    >
                      <IconChessboard className="kid-hero-icon" />
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        Local Game
                      </h3>
                      <p className="text-gray-400">
                        Play against a friend on the same device
                      </p>
                    </button>

                    <button
                      onClick={handleNewBotGame}
                      className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-blue-500/50 group`}
                    >
                      <IconRobot className="kid-hero-icon" />
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        Play vs Bot
                      </h3>
                      <p className="text-gray-400">
                        Challenge the computer at various difficulty levels
                      </p>
                    </button>

                    <button
                      onClick={handleStartMultiplayer}
                      className={`p-8 ${glassCardSoftClass} hover:bg-white/[0.06] transition-all border border-white/10 hover:border-emerald-500/40 group`}
                    >
                      <IconGlobe className="kid-hero-icon" />
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                        Online Multiplayer
                      </h3>
                      <p className="text-gray-400">
                        Play against players from around the world
                      </p>
                    </button>
                  </div>
                </>
              )}

              <BotSelection onStartGame={handleStartBotGame} />
            </div>
          ) : gameMode === 'multiplayer' ? (
            <>
              {/* Multiplayer Game Area */}
              <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
                {/* Left Panel - Game Status */}
                <div className="lg:w-80 space-y-6">
                  <MultiplayerLobby onGameStart={() => {}} />
                  <MultiplayerGameStatus />
                </div>

                {/* Center - Chess Board */}
                <div className="flex-1 flex justify-center items-start">
                  <MultiplayerChessBoard />
                </div>

                {/* Right Panel - Chat and Move History */}
                <div className="lg:w-80 space-y-6">
                  <MultiplayerChat />
                  <div className={`${glassCardSoftClass} p-6 shadow-xl`}>
                    <h3 className="text-xl font-bold text-white mb-4">Move History</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {multiplayerMoveHistory.map((move, index) => (
                        <div key={index} className="text-gray-300">
                          {Math.floor(index / 2) + 1}. {move}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : gameMode === 'bot' ? (
            <>
              {/* Bot Game Area */}
              <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto">
                {/* Left Panel - Bot Game Status */}
                <div className="lg:w-80 space-y-6">
                  <BotGameStatus />
                  <div className={`${glassCardSoftClass} p-4`}>
                    <button
                      onClick={handleBackToMenu}
                      className={`${buttonPrimaryClass} w-full py-3`}
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
                  <div className={`${glassCardSoftClass} p-6 shadow-xl`}>
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

