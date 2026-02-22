import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ChessBoard from './components/ChessBoard';
import GameStatus from './components/GameStatus';
import MoveHistory from './components/MoveHistory';
import GameControls from './components/GameControls';
import GameTips from './components/GameTips';
import { UserProfile } from './components/UserProfile';
import { BotSelection } from './components/BotSelection';
import { BotChessBoard } from './components/BotChessBoard';
import { BotGameStatus } from './components/BotGameStatus';
import { BotGameReview } from './components/BotGameReview';
import { MultiplayerLobby } from './components/MultiplayerLobby';
import { MultiplayerChessBoard } from './components/MultiplayerChessBoard';
import { MultiplayerGameStatus } from './components/MultiplayerGameStatus';
import { MultiplayerChat } from './components/MultiplayerChat';
import { useAuthStore } from './store/authStore';
import { useBotGameStore } from './store/botGameStore';
import { useMultiplayerGameStore } from './store/multiplayerGameStore';
import { appShellClass, glassCardSoftClass, buttonPrimaryClass } from './styles/appTheme';
import { ONLINE_MULTIPLAYER_BOARD_PX } from './styles/chessboardTheme';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './components/icons/NavIcons';
import brilliantknightzLogo from './assets/brilliantknightz.png';
import brilliantknightzBanner from './assets/brilliantknightzbgremoved.png';
import './App.css';

type GameMode = 'local' | 'bot' | 'multiplayer' | 'selection';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfile, setShowProfile] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('selection');
  const [botOnlyMenu, setBotOnlyMenu] = useState(false);
  const [showBotReview, setShowBotReview] = useState(false);
  const botMoveHistoryRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();
  
  const handleLogout = () => {
    logout();
    navigate('/lobby');
  };
  const { resetGame: resetBotGame, moveHistory: botMoveHistory, gameOver: botGameOver } = useBotGameStore();
  const { resetGame: resetMultiplayerGame, moveHistory: multiplayerMoveHistory, opponent, playerColor, turn, fen: multiplayerFen } = useMultiplayerGameStore();

  const normalizedPlayerColor = useMemo<'white' | 'black' | null>(() => {
    if (playerColor === 'white' || playerColor === 'black') return playerColor;
    const raw = playerColor as unknown as string | null;
    if (raw === 'w') return 'white';
    if (raw === 'b') return 'black';
    return null;
  }, [playerColor]);

  const derivedTurn = useMemo<'w' | 'b' | null>(() => {
    const fenTurn = multiplayerFen?.split(' ')?.[1];
    if (fenTurn === 'w' || fenTurn === 'b') return fenTurn;
    if (turn === 'w' || turn === 'b') return turn;
    return null;
  }, [multiplayerFen, turn]);

  // Auto-scroll bot move history to bottom when new moves are added
  useEffect(() => {
    if (botMoveHistoryRef.current) {
      botMoveHistoryRef.current.scrollTop = botMoveHistoryRef.current.scrollHeight;
    }
  }, [botMoveHistory]);

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
    <div className={useLobbyShell ? 'lobby-shell' : `${appShellClass} py-8 px-4`}>
      <div className={useLobbyShell ? 'max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8' : 'container mx-auto'}>
          {useLobbyShell ? (
            <div className="max-w-[1100px] mx-auto">
              <header className="flex flex-col items-start gap-4 mb-8">
                {urlMode === 'multiplayer' || urlMode === 'local' || urlMode === 'bot' ? null : (
                  <div className="lobby-header">
                    <h1 className="text-white tracking-tight">Play vs Bot</h1>
                    <p>
                      Welcome, <span className="text-white font-medium">{user?.username || 'Guest'}</span>
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
              <UserProfile />
            </div>
          ) : useLobbyShell ? (
            <>
            <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
              <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
              <button
                type="button"
                className="sidebar-user"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                aria-label={isAuthenticated ? "Open dashboard" : "Login"}
                style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              >
                <div>
                  <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                  <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
                </div>
              </button>
            </div>

            <div className="lobby-layout">
              <aside className="lobby-sidebar">
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
                    onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })}
                    className={`${urlMode === 'multiplayer' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconGlobe className="nav-icon" />
                    <span>Online Multiplayer</span>
                  </button>
                  <button
                    onClick={() => navigate('/local?mode=local', { preventScrollReset: true })}
                    className={`${urlMode === 'local' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconChessboard className="nav-icon" />
                    <span>Local Game</span>
                  </button>
                  <button
                    onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })}
                    className={`${urlMode === 'bot' ? 'btn-primary' : 'btn-secondary'} sidebar-btn`}
                  >
                    <IconRobot className="nav-icon" />
                    <span>Play vs Bot</span>
                  </button>
                  <button onClick={() => navigate('/puzzles')} className="btn-secondary sidebar-btn">
                    <span className="nav-icon text-xl">🧩</span>
                    <span>Tactical Puzzles</span>
                  </button>
                  <button onClick={() => navigate('/tutorial')} className="btn-secondary sidebar-btn">
                    <span className="nav-icon text-xl">📚</span>
                    <span>Tutorial</span>
                  </button>
                  <button onClick={() => navigate('/rules')} className="btn-secondary sidebar-btn">
                    <span className="nav-icon text-xl">📖</span>
                    <span>Chess Rules</span>
                  </button>
                  {/* <button onClick={() => navigate('/settings')} className="btn-secondary sidebar-btn">
                    <span className="nav-icon text-xl">⚙️</span>
                    <span>Settings</span>
                  </button> */}
                </div>

                {isAuthenticated && (
                  <div className="lobby-sidebar-footer">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="btn-secondary sidebar-btn sidebar-btn--logout"
                    >
                      <span>Logout</span>
                    </button>
                  </div>
                )}
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
                    <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[minmax(0,1fr)_320px] overflow-x-auto">
                      {/* Left Panel - Chess Board */}
                      <div className="space-y-6">
                        <div className="w-full flex justify-center items-start mt-2.5">
                          <MultiplayerChessBoard />
                        </div>

                        <div
                          className={`${glassCardSoftClass} p-6 shadow-xl mx-auto`}
                          style={{ maxWidth: `${ONLINE_MULTIPLAYER_BOARD_PX}px`, width: '100%' }}
                        >
                          <h3 className="text-xl font-bold text-white mb-4 text-center">Move List</h3>
                          <div className="text-center text-sm text-white/70 mb-3">
                            {normalizedPlayerColor
                              ? ((normalizedPlayerColor === 'white' && derivedTurn === 'w') || (normalizedPlayerColor === 'black' && derivedTurn === 'b'))
                                ? "Your's turn"
                                : "Opponent's turn"
                              : ''}
                          </div>
                          <div className="grid grid-cols-3 items-center text-xs font-semibold text-white/60 mb-2">
                            <div />
                            <div className="text-center">You</div>
                            <div className="text-center">{opponent?.username || 'Opponent'}</div>
                          </div>
                          <div className="space-y-2 overflow-y-auto" style={{ height: '150px' }}>
                            {multiplayerMoveHistory.length === 0 ? (
                              <div className="text-gray-400 text-center py-4">No moves yet</div>
                            ) : (
                              Array.from({ length: Math.ceil(multiplayerMoveHistory.length / 2) }, (_, i) => {
                                const moveNumber = i + 1;
                                const whiteMove = multiplayerMoveHistory[i * 2];
                                const blackMove = multiplayerMoveHistory[i * 2 + 1];
                                const myMove = (normalizedPlayerColor === 'black' ? blackMove : whiteMove) || '';
                                const opponentMove = (normalizedPlayerColor === 'black' ? whiteMove : blackMove) || '';
                                return (
                                  <div key={moveNumber} className="grid grid-cols-3 items-center text-gray-300 font-mono text-sm">
                                    <div className="text-gray-400 font-semibold text-center">{moveNumber}.</div>
                                    <span className="whitespace-nowrap overflow-hidden text-ellipsis text-center">{myMove}</span>
                                    <span className="whitespace-nowrap overflow-hidden text-ellipsis text-center">{opponentMove}</span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Panel - Lobby + Status + Chat + History */}
                      <div className="space-y-6">
                        <MultiplayerLobby onGameStart={() => {}} />
                        <MultiplayerGameStatus />
                        <MultiplayerChat />
                      </div>
                    </div>
                  </>
                ) : gameMode === 'bot' ? (
                  <>
                    {/* Bot Game Area */}
                    <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[minmax(0,1fr)_320px] overflow-x-auto">
                      {/* Left Panel - Chess Board + Status */}
                      <div className="space-y-4">
                        <div className="w-full flex justify-center items-start mt-2.5">
                          <BotChessBoard />
                        </div>
                        <BotGameStatus />
                      </div>

                      {/* Right Panel - History */}
                      <div className="space-y-6">
                        <div className={`${glassCardSoftClass} p-6 shadow-xl`}>
                          <h3 className="text-xl font-bold text-white mb-4 text-center">Move History</h3>
                          <div ref={botMoveHistoryRef} className="overflow-y-auto" style={{ height: '150px' }}>
                            {botMoveHistory.length === 0 ? (
                              <div className="text-gray-400 text-center py-4">No moves yet</div>
                            ) : (
                              <table className="w-full text-sm">
                                <tbody>
                                  {Array.from({ length: Math.ceil(botMoveHistory.length / 2) }, (_, i) => {
                                    const moveNumber = i + 1;
                                    const whiteMove = botMoveHistory[i * 2];
                                    const blackMove = botMoveHistory[i * 2 + 1];
                                    return (
                                      <tr key={moveNumber} className="border-b border-white/5">
                                        <td className="py-2 px-2 text-gray-400 font-medium w-10">
                                          {moveNumber}.
                                        </td>
                                        <td className="py-2 px-2 text-white font-mono w-24">
                                          {whiteMove}
                                        </td>
                                        <td className="py-2 px-2 text-gray-300 font-mono w-24">
                                          {blackMove || ''}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </div>
                          
                          {/* Game Review Button */}
                          {botGameOver && botMoveHistory.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              <button
                                onClick={() => setShowBotReview(true)}
                                className="find-match-btn"
                              >
                                <span>🎬</span>
                                <span>Review Game</span>
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Game Actions */}
                        {!botGameOver && (
                          <div className="flex gap-4 justify-center mt-4" style={{marginTop: '5px'}}>
                            <button
                              onClick={() => {
                                const botStore = useBotGameStore.getState();
                                botStore.offerDraw();
                              }}
                               className="find-match-btn"
                               style={{ width: 'auto', paddingLeft: '14px', paddingRight: '14px', height: '30px', paddingTop: '0px', paddingBottom: '0px', lineHeight: '30px' }}
                            >
                              🤝 Offer Draw
                            </button>
                            <button
                              onClick={() => {
                                const botStore = useBotGameStore.getState();
                                botStore.resign();
                              }}
                              className="find-match-btn"
                              style={{ 
                                width: 'auto', 
                                paddingLeft: '14px', 
                                paddingRight: '14px',
                                 height: '30px',
                                paddingTop: '0px',
                                paddingBottom: '0px',
                                  lineHeight: '30px',
                                background: 'linear-gradient(180deg, #ff6b6b 0%, #ee5a52 55%, #dc4b3e 100%)'
                              }}
                            >
                              🏳️ Resign
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Game Review Modal */}
                    {showBotReview && (
                      <BotGameReview onClose={() => setShowBotReview(false)} />
                    )}
                  </>
                ) : (
                  <>
                    {/* Local Game Area */}
                    <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[minmax(0,1fr)_320px] overflow-x-auto">
                      {/* Left Panel - Chess Board + Tips */}
                      <div className="space-y-6">
                        <div className="w-full flex justify-center items-start mt-2.5">
                          <ChessBoard />
                        </div>

                        <div className="flex justify-start">
                          <div className="w-full max-w-sm">
                            <GameTips />
                          </div>
                        </div>
                      </div>

                      {/* Right Panel - Controls + Status + History */}
                      <div className="space-y-6">
                        <GameControls />
                        <MoveHistory />
                        <GameStatus />
                      </div>
                    </div>


                  </>
                )}
              </div>
            </div>
            </>
          ) : gameMode === 'selection' ? (
            <>
            <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
              <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
              <button
                type="button"
                className="sidebar-user"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                aria-label={isAuthenticated ? "Open dashboard" : "Login"}
                style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              >
                <div>
                  <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                  <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
                </div>
              </button>
            </div>

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
            </>
          ) : gameMode === 'multiplayer' ? (
            <>
            <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
              <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
              <button
                type="button"
                className="sidebar-user"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                aria-label={isAuthenticated ? "Open dashboard" : "Login"}
                style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              >
                <div>
                  <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                  <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
                </div>
              </button>
            </div>

              {/* Multiplayer Game Area */}
              <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[minmax(0,1fr)_320px] overflow-x-auto">
                {/* Left Panel - Chess Board */}
                <div className="space-y-6">
                  <div className="w-full flex justify-center items-start mt-2.5">
                    <MultiplayerChessBoard />
                  </div>

                  <div
                    className={`${glassCardSoftClass} p-6 shadow-xl mx-auto`}
                    style={{ maxWidth: `${ONLINE_MULTIPLAYER_BOARD_PX}px`, width: '100%' }}
                  >
                    <h3 className="text-xl font-bold text-white mb-4 text-center">Move List</h3>
                    <div className="text-center text-sm text-white/70 mb-3">
                      {normalizedPlayerColor
                        ? ((normalizedPlayerColor === 'white' && derivedTurn === 'w') || (normalizedPlayerColor === 'black' && derivedTurn === 'b'))
                          ? "Your's turn"
                          : "Opponent's turn"
                        : ''}
                    </div>
                    <div className="grid grid-cols-3 items-center text-xs font-semibold text-white/60 mb-2">
                      <div />
                      <div className="text-center">You</div>
                      <div className="text-center">{opponent?.username || 'Opponent'}</div>
                    </div>
                    <div className="space-y-2 overflow-y-auto" style={{ height: '150px' }}>
                      {multiplayerMoveHistory.length === 0 ? (
                        <div className="text-gray-400 text-center py-4">No moves yet</div>
                      ) : (
                        Array.from({ length: Math.ceil(multiplayerMoveHistory.length / 2) }, (_, i) => {
                          const moveNumber = i + 1;
                          const whiteMove = multiplayerMoveHistory[i * 2];
                          const blackMove = multiplayerMoveHistory[i * 2 + 1];
                          const myMove = (normalizedPlayerColor === 'black' ? blackMove : whiteMove) || '';
                          const opponentMove = (normalizedPlayerColor === 'black' ? whiteMove : blackMove) || '';

                          return (
                            <div key={moveNumber} className="grid grid-cols-3 items-center text-gray-300 font-mono text-sm">
                              <div className="text-gray-400 font-semibold text-center">{moveNumber}.</div>
                              <span className="whitespace-nowrap overflow-hidden text-ellipsis text-center">{myMove}</span>
                              <span className="whitespace-nowrap overflow-hidden text-ellipsis text-center">{opponentMove}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Panel - Lobby + Status + Chat + History */}
                <div className="space-y-6">
                  <MultiplayerLobby onGameStart={() => {}} />
                  <MultiplayerGameStatus />
                  <MultiplayerChat />
                </div>
              </div>
            </>
          ) : gameMode === 'bot' ? (
            <>
            <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
              <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
              <button
                type="button"
                className="sidebar-user"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                aria-label={isAuthenticated ? "Open dashboard" : "Login"}
                style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              >
                <div>
                  <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                  <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
                </div>
              </button>
            </div>

              {/* Bot Game Area */}
              <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[320px_minmax(0,1fr)] overflow-x-auto">
                {/* Left Panel - Status + Actions + History */}
                <div className="space-y-6">
                  <BotGameStatus />
                  <div className={`${glassCardSoftClass} p-4`}>
                    <button
                      onClick={handleBackToMenu}
                      className={`${buttonPrimaryClass} w-full py-3`}
                    >
                      New Bot Game
                    </button>
                  </div>
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

                {/* Right Panel - Chess Board */}
                <div className="space-y-6">
                  <div className="w-full flex justify-start items-start mt-2.5">
                    <BotChessBoard />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
            <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
              <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
              <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
              <button
                type="button"
                className="sidebar-user"
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
                aria-label={isAuthenticated ? "Open dashboard" : "Login"}
                style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
              >
                <div>
                  <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                  <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
                </div>
              </button>
            </div>

              {/* Local Game Area */}
              <div className="grid gap-6 max-w-7xl mx-auto grid-cols-[320px_minmax(0,1fr)] overflow-x-auto">
                {/* Left Panel - Controls + Status */}
                <div className="space-y-6">
                  <GameControls />
                  <MoveHistory />
                  <GameStatus />
                </div>

                {/* Right Panel - Chess Board + Tips + Move History */}
                <div className="space-y-6">
                  <div className="w-full flex justify-start items-start mt-2.5">
                    <ChessBoard />
                  </div>

                  <div className="flex justify-center">
                    <div className="w-full max-w-sm">
                      <GameTips />
                    </div>
                  </div>
                </div>
              </div>


            </>
          )}
        </div>
      </div>
  );
}

export default App;

