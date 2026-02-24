import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { chessComOptions, ONLINE_MULTIPLAYER_BOARD_PX, responsiveBoardStyle } from '../styles/chessboardTheme';
import { useAuthStore } from '../store/authStore';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';
import { IconChessboard, IconGlobe, IconMagnifier, IconPlus, IconRobot } from './icons/NavIcons';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  fen?: string;
  highlight?: string[];
  interactive?: boolean;
  expectedMove?: { from: string; to: string };
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: '♟️ Welcome to Chess!',
    description: 'Learn the basics of chess in this interactive tutorial. Chess is a strategic board game played between two players on an 8x8 checkered board.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
  {
    id: 2,
    title: '♙ The Pawn',
    description: 'Pawns move forward one square (or two squares on their first move). They capture diagonally. Try moving the pawn from e2 to e4.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    highlight: ['e2', 'e3', 'e4'],
    interactive: true,
    expectedMove: { from: 'e2', to: 'e4' },
  },
  {
    id: 3,
    title: '♘ The Knight',
    description: 'Knights move in an L-shape: two squares in one direction and one square perpendicular. They can jump over pieces. Try moving the knight from g1 to f3.',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1',
    highlight: ['g1', 'f3', 'h3'],
    interactive: true,
    expectedMove: { from: 'g1', to: 'f3' },
  },
  {
    id: 4,
    title: '♗ The Bishop',
    description: 'Bishops move diagonally any number of squares. Each bishop stays on squares of one color throughout the game.',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    highlight: ['f1', 'e2', 'd3', 'c4', 'b5', 'a6'],
  },
  {
    id: 5,
    title: '♖ The Rook',
    description: 'Rooks move horizontally or vertically any number of squares. They are worth about 5 pawns in value.',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    highlight: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'],
  },
  {
    id: 6,
    title: '♕ The Queen',
    description: 'The Queen is the most powerful piece! She moves like a rook and bishop combined - any number of squares in any direction.',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    highlight: ['d1', 'd2', 'd3', 'd4', 'e2', 'f3', 'g4', 'h5'],
  },
  {
    id: 7,
    title: '♔ The King',
    description: 'The King moves one square in any direction. Protecting your King is crucial - the game ends when the King is checkmated!',
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    highlight: ['e1', 'd1', 'd2', 'e2', 'f2', 'f1'],
  },
  {
    id: 8,
    title: '🎯 Check and Checkmate',
    description: 'When a King is under attack, it\'s in CHECK. If there\'s no way to escape check, it\'s CHECKMATE and the game is over!',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 0 1',
    highlight: ['e1', 'h4'],
  },
  {
    id: 9,
    title: '🏰 Castling',
    description: 'Castling is a special move involving the King and Rook. It\'s the only move where you move two pieces at once! Conditions: Neither piece has moved, no pieces between them, King not in check.',
    fen: 'r1bqk2r/ppppnppp/2n2b2/4p3/4P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1',
    highlight: ['e1', 'g1', 'h1', 'f1'],
  },
  {
    id: 10,
    title: '✨ En Passant',
    description: 'En passant is a special pawn capture. If an opponent\'s pawn moves two squares forward from its starting position and lands beside your pawn, you can capture it as if it had only moved one square.',
    fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 1',
    highlight: ['e5', 'd5', 'd6'],
  },
  {
    id: 11,
    title: '👑 Pawn Promotion',
    description: 'When a pawn reaches the opposite end of the board, it promotes to a Queen, Rook, Bishop, or Knight (usually a Queen!). This can dramatically change the game!',
    fen: 'rnbqkb1r/pPpppppp/8/8/8/8/P1PPPPPP/RNBQKBNR w KQkq - 0 1',
    highlight: ['b7', 'b8'],
  },
  {
    id: 12,
    title: '🎓 You\'re Ready!',
    description: 'Congratulations! You\'ve learned the basics of chess. Now it\'s time to practice! Start with playing against the bot, try solving tactical puzzles, or challenge other players online.',
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  },
];

const Tutorial: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/lobby', { replace: true });
  };
  const [currentStep, setCurrentStep] = useState(0);
  const [game, setGame] = useState(new Chess());
  const [completed, setCompleted] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, []);

  const step = tutorialSteps[currentStep];

  useEffect(() => {
    if (step.fen) {
      const newGame = new Chess(step.fen);
      setGame(newGame);
    }
  }, [step]);

  const handleMove = (sourceSquare: string, targetSquare: string) => {
    if (!step.interactive || !step.expectedMove) return false;

    // Check if the move matches the expected move
    if (sourceSquare === step.expectedMove.from && targetSquare === step.expectedMove.to) {
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        setGame(gameCopy);
        // Auto-advance after correct move
        setTimeout(() => nextStep(), 1000);
        return true;
      }
    }

    return false;
  };

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      // Mark tutorial as completed in localStorage
      localStorage.setItem('chess-tutorial-completed', 'true');
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-gray-800 rounded-3xl px-10 py-12 shadow-[0_14px_50px_rgba(0,0,0,0.45)] text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-white mb-4">Tutorial Complete!</h2>
          <p className="text-white/80 text-lg mb-8">
            You've learned the basics of chess! Now it's time to put your knowledge into practice.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })}
              className="px-6 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-2xl font-semibold transition-all active:scale-[0.97] shadow-[0_4px_14px_rgba(59,130,246,0.4)]"
            >
              🤖 Play vs Bot
            </button>
            <button
              onClick={() => navigate('/puzzles')}
              className="px-6 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-2xl font-semibold transition-all active:scale-[0.97] shadow-[0_4px_14px_rgba(168,85,247,0.4)]"
            >
              🧩 Solve Puzzles
            </button>
            <button
              onClick={() => navigate('/lobby')}
              className="px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-2xl font-semibold transition-all active:scale-[0.97] shadow-[0_4px_14px_rgba(34,197,94,0.4)]"
            >
              ⚔️ Online Play
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAuthenticated && (
              <div className="sidebar-user-avatar" style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                  : (user?.username?.[0] ?? 'U').toUpperCase()
                }
              </div>
            )}
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
        </div>

        <div className="lobby-layout">
          <aside className="lobby-sidebar">
            <div className="lobby-sidebar-nav">
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconMagnifier className="nav-icon" />
                <span>Find Match</span>
              </button>
              <button onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
                <IconPlus className="nav-icon" />
                <span>Create Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconGlobe className="nav-icon" />
                <span>Online Multiplayer</span>
              </button>
              <button onClick={() => navigate('/local?mode=local', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
                <IconChessboard className="nav-icon" />
                <span>Local Game</span>
              </button>
              <button onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })} className="btn-secondary sidebar-btn">
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
            </div>

            {isAuthenticated && (
              <div className="lobby-sidebar-footer">
                <button type="button" onClick={handleLogout} className="btn-secondary sidebar-btn sidebar-btn--logout">
                  <span>Logout</span>
                </button>
              </div>
            )}
          </aside>

          <main className="lobby-main">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chessboard */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4">
              {/* Board and Progress Bar */}
              <div className="flex gap-2 mb-4">
                {/* Board */}
                <div className="flex items-center justify-center" ref={boardRef}>
                  <Chessboard
                    options={chessComOptions({
                      id: 'tutorial-board',
                      position: game.fen(),
                      allowDragging: step.interactive || false,
                      onPieceDrop: ({ sourceSquare, targetSquare }) => {
                        if (!sourceSquare || !targetSquare) return false;
                        return handleMove(sourceSquare, targetSquare);
                      },
                      squareStyles: step.highlight
                        ? step.highlight.reduce((acc, square) => {
                            acc[square] = {
                              backgroundColor: 'rgba(59, 130, 246, 0.4)',
                              borderRadius: '3px',
                            };
                            return acc;
                          }, {} as Record<string, React.CSSProperties>)
                        : undefined,
                      boardStyle: {
                        ...responsiveBoardStyle(ONLINE_MULTIPLAYER_BOARD_PX, 260),
                      },
                    })}
                  />
                </div>

                {/* Vertical Progress Bar */}
                <div className="flex flex-col items-center justify-center gap-3 py-4" style={{ width: '60px', marginLeft: '5px', marginRight: '5px' }}>
                  <div 
                    className="relative rounded-lg overflow-hidden border-2 border-gray-700" 
                    style={{ width: '48px', height: '500px', backgroundColor: '#111827' }}
                  >
                    <div 
                      className="absolute left-0 right-0"
                      style={{
                        bottom: 0,
                        height: `${((currentStep + 1) / tutorialSteps.length) * 100}%`,
                        background: 'linear-gradient(to top, #3b82f6, #8b5cf6)',
                        boxShadow: '0 -4px 24px rgba(59, 130, 246, 0.7)',
                        width: '100%',
                        transition: 'height 200ms ease-out'
                      }}
                    />
                  </div>
                  <div className="text-center text-gray-400 text-xs">
                    {currentStep + 1}/{tutorialSteps.length}
                  </div>
                </div>

                {/* Tutorial Content */}
                <div style={{ width: '100%', height: '500px' }}>
                  <div className="bg-gray-800 rounded-lg p-4 h-full overflow-y-auto">
                    <h2 className="text-2xl font-bold text-white mb-4 text-center">{step.title}</h2>
                    <p className="text-white/80 text-lg leading-relaxed mb-6">{step.description}</p>

                    {step.interactive && (
                      <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-2xl mb-6">
                        <p className="text-white font-semibold">🎯 Try it yourself!</p>
                        <p className="text-white/80 text-sm mt-1">Make the move described above on the board</p>
                      </div>
                    )}

                    {step.highlight && !step.interactive && (
                      <div className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-2xl mb-4">
                        <p className="text-white/80 text-sm">💡 Highlighted squares show possible moves</p>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={previousStep}
                        disabled={currentStep === 0}
                        className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={nextStep}
                        disabled={currentStep === tutorialSteps.length - 1}
                        className="btn-secondary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {currentStep === tutorialSteps.length - 1 ? 'Finish ✓' : 'Next →'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
