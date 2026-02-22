import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import DisplayBoard from './DisplayBoard';
import EvaluationGraph from './EvaluationGraph';
import { config } from '../config';
import { useAuthStore } from '../store/authStore';
import { downloadPGN, copyPGNToClipboard, shareGame, printGame, copyGameLink } from '../utils/exportUtils';
import brilliantknightzLogo from '../assets/brilliantknightz.png';
import brilliantknightzBanner from '../assets/brilliantknightzbgremoved.png';

interface MoveAnalysis {
  id: number;
  moveNumber: number;
  playerColor: 'white' | 'black';
  moveSan: string;
  moveUci: string;
  fenBefore: string;
  fenAfter: string;
  evaluation: number;
  mateIn: number | null;
  bestMoveSan: string | null;
  bestMoveUci: string | null;
  centipawnLoss: number;
  classification: 'brilliant' | 'great' | 'best' | 'good' | 'sacrifice' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
  isBookMove: boolean;
  isForced: boolean;
}

interface GameAnalysisData {
  id: number;
  gameId: number;
  openingName: string;
  openingEco: string;
  accuracyWhite: number;
  accuracyBlack: number;
  analyzedAt: string;
  moves: MoveAnalysis[];
}

interface Commentary {
  id: number;
  userId: number;
  username: string;
  commentaryType: 'user' | 'ai' | 'coach';
  content: string;
  moveNumber: number | null;
  likes: number;
  createdAt: string;
}

const GameAnalysis: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { token, isAuthenticated, user, logout } = useAuthStore();
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(null);
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [chess] = useState(new Chess());
  const [currentFen, setCurrentFen] = useState(new Chess().fen());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedMoveNumber, setSelectedMoveNumber] = useState<number | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const chessboardRef = useRef<HTMLDivElement>(null);
  const moveRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const moveListRef = useRef<HTMLDivElement>(null);

  const loadAnalysis = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${config.apiUrl}/api/analysis/games/${gameId}/analysis`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
        setIsAnalyzing(false);
        setLoadingError(null);
      } else if (response.status === 404) {
        setAnalysis(null);
        setIsAnalyzing(false);
        setLoadingError(null);
      } else {
        const errorText = await response.text();
        console.error(`Failed to load analysis: ${response.status} - ${errorText}`);
        setLoadingError(`Failed to load analysis: ${response.status}`);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
      setLoadingError(error instanceof Error ? error.message : 'Network error');
      setIsAnalyzing(false);
    }
  }, [gameId, token]);

  const loadCommentaries = useCallback(async () => {
    try {
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${config.apiUrl}/api/analysis/games/${gameId}/commentaries`, {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        setCommentaries(data);
      }
    } catch (error) {
      console.error('Error loading commentaries:', error);
    }
  }, [gameId, token]);

  useEffect(() => {
    loadAnalysis();
    loadCommentaries();
  }, [loadAnalysis, loadCommentaries]);

  // Scroll chessboard to center of viewport
  useEffect(() => {
    if (analysis && chessboardRef.current) {
      setTimeout(() => {
        chessboardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [analysis]);

  useEffect(() => {
    if (currentMoveIndex === -1 || !analysis) {
      const startFen = new Chess().fen();
      setCurrentFen(startFen);
      chess.reset();
      return;
    }

    if (analysis && analysis.moves.length > 0 && currentMoveIndex >= 0 && currentMoveIndex < analysis.moves.length) {
      try {
        const currentMove = analysis.moves[currentMoveIndex];
        
        if (currentMove && currentMove.fenAfter) {
          // Try to create a fresh Chess instance with the FEN
          try {
            const testChess = new Chess(currentMove.fenAfter);
            const loadedFen = testChess.fen();
            setCurrentFen(loadedFen);
            // Update the main chess instance too
            chess.load(currentMove.fenAfter);
          } catch (fenError) {
            console.error('Failed to load FEN:', currentMove.fenAfter, fenError);
            // Fallback: replay moves from start
            chess.reset();
            for (let i = 0; i <= currentMoveIndex; i++) {
              try {
                chess.move(analysis.moves[i].moveSan);
              } catch (err) {
                console.error(`Failed to play move ${i}:`, analysis.moves[i].moveSan, err);
              }
            }
            setCurrentFen(chess.fen());
          }
        } else {
          // Fallback: replay moves if FEN not available
          chess.reset();
          for (let i = 0; i <= currentMoveIndex; i++) {
            try {
              chess.move(analysis.moves[i].moveSan);
            } catch (err) {
              console.error(`Failed to play move ${i}:`, analysis.moves[i].moveSan, err);
            }
          }
          setCurrentFen(chess.fen());
        }
      } catch (error) {
        console.error('Error loading position:', error);
      }
    }
  }, [currentMoveIndex, analysis]);

  // Keyboard navigation for moves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!analysis || analysis.moves.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentMoveIndex(prev => Math.min(analysis.moves.length - 1, prev + 1));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentMoveIndex(prev => Math.max(-1, prev - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentMoveIndex(-1);
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentMoveIndex(analysis.moves.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [analysis]);

  // Voice commentary for move classifications
  useEffect(() => {
    if (!analysis || currentMoveIndex === -1 || !voiceEnabled) return;
    
    const currentMove = analysis.moves[currentMoveIndex];
    if (!currentMove) return;

    const speak = (text: string) => {
      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        window.speechSynthesis.speak(utterance);
      }
    };

    const getVoiceText = (classification: string) => {
      switch (classification) {
        case 'brilliant': return 'Brilliant move!';
        case 'great': return 'Great move!';
        case 'best': return 'Best move!';
        case 'good': return 'Good move';
        case 'sacrifice': return 'Sacrifice!';
        case 'inaccuracy': return 'Inaccuracy';
        case 'mistake': return 'Mistake';
        case 'blunder': return 'Blunder!';
        case 'book': return 'Book move';
        default: return '';
      }
    };

    const voiceText = getVoiceText(currentMove.classification);
    if (voiceText) {
      // Small delay to ensure smooth transition
      const timer = setTimeout(() => {
        speak(voiceText);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        window.speechSynthesis.cancel();
      };
    }
  }, [currentMoveIndex, analysis]);

  // Scroll move list to bottom on initial load
  useEffect(() => {
    if (analysis && moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [analysis]);

  // Auto-scroll to highlighted move in Move List
  useEffect(() => {
    if (currentMoveIndex >= 0 && moveRefs.current[currentMoveIndex]) {
      moveRefs.current[currentMoveIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [currentMoveIndex]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportMenu && !target.closest('.relative')) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDownloadPGN = () => {
    if (!chess || !analysis) return;
    
    downloadPGN({
      pgn: chess.pgn(),
      players: {
        white: 'Player 1',
        black: 'Player 2',
      },
      date: new Date().toISOString().split('T')[0],
      event: 'Chess Game Analysis',
    }, `game_${gameId}.pgn`);
    
    showToast('PGN downloaded successfully!');
    setShowExportMenu(false);
  };

  const handleCopyPGN = async () => {
    if (!chess) return;
    
    const success = await copyPGNToClipboard({
      pgn: chess.pgn(),
      players: {
        white: 'Player 1',
        black: 'Player 2',
      },
      date: new Date().toISOString().split('T')[0],
    });
    
    showToast(success ? 'PGN copied to clipboard!' : 'Failed to copy PGN');
    setShowExportMenu(false);
  };

  const handleShareGame = async () => {
    const success = await shareGame({
      gameId,
      pgn: chess.pgn(),
      players: {
        white: 'Player 1',
        black: 'Player 2',
      },
    });
    
    showToast(success ? 'Game shared successfully!' : 'Failed to share game');
    setShowExportMenu(false);
  };

  const handleCopyLink = async () => {
    const success = await copyGameLink(gameId!);
    showToast(success ? 'Link copied to clipboard!' : 'Failed to copy link');
    setShowExportMenu(false);
  };

  const handlePrintGame = () => {
    if (!chess || !analysis) return;
    
    printGame({
      pgn: chess.pgn(),
      players: {
        white: 'Player 1',
        black: 'Player 2',
      },
      date: new Date().toISOString().split('T')[0],
      moves: chess.history(),
    });
    
    setShowExportMenu(false);
  };

  const startAnalysis = async () => {
    if (!isAuthenticated) {
      if (window.confirm('You need to login to analyze games. Would you like to login now?')) {
        navigate('/auth');
      }
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const response = await fetch(`${config.apiUrl}/api/analysis/games/${gameId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ depth: 20 })
      });

      if (response.status === 401) {
        alert('Your session has expired. Please log out and log back in.');
        setIsAnalyzing(false);
        return;
      }

      if (response.ok) {
        const result = await response.json();
        console.log('Analysis result:', result);
        await loadAnalysis();
      } else {
        const errorData = await response.json();
        console.error('Analysis failed:', errorData);
        alert(`Failed to analyze game: ${errorData.error || 'Unknown error'}`);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error analyzing game:', error);
      alert(`Error analyzing game: ${error instanceof Error ? error.message : 'Network error'}`);
      setIsAnalyzing(false);
    }
  };

  const addCommentary = async () => {
    if (!newComment.trim()) return;

    if (!isAuthenticated) {
      if (window.confirm('You need to login to add comments. Would you like to login now?')) {
        navigate('/auth');
      }
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/api/analysis/games/${gameId}/commentary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content: newComment,
          moveNumber: selectedMoveNumber
        })
      });

      if (response.ok) {
        setNewComment('');
        setSelectedMoveNumber(null);
        await loadCommentaries();
      }
    } catch (error) {
      console.error('Error adding commentary:', error);
    }
  };

  const likeCommentary = async (commentaryId: number) => {
    if (!isAuthenticated) {
      if (window.confirm('You need to login to like comments. Would you like to login now?')) {
        navigate('/auth');
      }
      return;
    }
    
    try {
      await fetch(`${config.apiUrl}/api/analysis/commentaries/${commentaryId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      await loadCommentaries();
    } catch (error) {
      console.error('Error liking commentary:', error);
    }
  };

  const getClassificationText = (classification: string) => {
    switch (classification) {
      case 'brilliant': return 'Brilliant!! ✨';
      case 'great': return 'Great Move! ⭐';
      case 'best': return 'Best Move! ⬆️';
      case 'good': return 'Good Move ✓';
      case 'sacrifice': return 'Sacrifice! ⚔️';
      case 'inaccuracy': return 'Inaccuracy ?! ⚠️';
      case 'mistake': return 'Mistake ? ❌';
      case 'blunder': return 'Blunder ?? 💥';
      case 'book': return 'Book Move 📖';
      default: return 'Move';
    }
  };

  const getPieceIcon = (moveSan: string, playerColor: 'white' | 'black') => {
    const whitePieces: { [key: string]: string } = {
      'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'
    };
    const blackPieces: { [key: string]: string } = {
      'K': '♚', 'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
    };
    
    const pieces = playerColor === 'white' ? whitePieces : blackPieces;
    const firstChar = moveSan[0];
    
    // If the first character is uppercase, it's a piece move
    if (firstChar >= 'A' && firstChar <= 'Z') {
      return pieces[firstChar] || '';
    }
    // Otherwise, it's a pawn move
    return pieces['P'];
  };

  const getEvaluationDisplay = (evaluation: number, mateIn: number | null) => {
    if (mateIn !== null) {
      return `M${mateIn > 0 ? mateIn : -mateIn}`;
    }
    const eval_pawns = evaluation / 100;
    return eval_pawns >= 0 ? `+${eval_pawns.toFixed(2)}` : eval_pawns.toFixed(2);
  };

  const getMaterialCount = (fen: string) => {
    const pieceValues: { [key: string]: number } = {
      'q': 9, 'r': 5, 'b': 3, 'n': 3, 'p': 1,
      'Q': 9, 'R': 5, 'B': 3, 'N': 3, 'P': 1
    };
    
    // Get the board position part of the FEN (first part before space)
    const boardPart = fen.split(' ')[0];
    const material = { white: 0, black: 0 };
    
    // Count material for each piece (excluding kings)
    for (const char of boardPart) {
      if (pieceValues[char]) {
        if (char === char.toUpperCase()) {
          material.white += pieceValues[char];
        } else {
          material.black += pieceValues[char];
        }
      }
    }
    
    // Starting material: Q(9) + 2R(10) + 2B(6) + 2N(6) + 8P(8) = 39 points per side
    const startingMaterial = 39;
    const whiteLost = Math.max(0, startingMaterial - material.white);
    const blackLost = Math.max(0, startingMaterial - material.black);
    
    return {
      white: material.white,
      black: material.black,
      whiteLost,
      blackLost,
      advantage: material.white - material.black
    };
  };

  const renderCapturedPieces = (pointsLost: number) => {
    return (
      <div className="flex items-center gap-2">
        <span className="text-gray-400 text-sm">Lost:</span>
        <span className="text-lg font-bold">{pointsLost} pts</span>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const lobbySidebar = (
    <aside className="lobby-sidebar">
      <div className="lobby-sidebar-nav">
        <button type="button" onClick={() => navigate('/lobby')} className="btn-primary sidebar-btn">
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Find match"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="11" cy="11" r="7" fill="#22D3EE" />
            <circle cx="11" cy="11" r="4" fill="#0EA5E9" />
            <path d="M16.6 16.6L21 21" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M6.6 11c0-2.5 2-4.4 4.4-4.4"
              stroke="#FFFFFF"
              strokeOpacity="0.75"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Find Match</span>
        </button>

        <button type="button" onClick={() => navigate('/lobby')} className="btn-secondary sidebar-btn">
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Create"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="3" width="18" height="18" rx="6" fill="#34D399" />
            <path d="M12 7v10M7 12h10" stroke="#064E3B" strokeWidth="3" strokeLinecap="round" />
            <path
              d="M6.5 6.8c1.6-1.5 3.6-2.3 5.9-2.3"
              stroke="#FFFFFF"
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Create Game</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/local?mode=multiplayer', { preventScrollReset: true })}
          className="btn-secondary sidebar-btn"
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Online"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="12" cy="12" r="9" fill="#60A5FA" />
            <path
              d="M3.7 10.2c2.1 1 5 1.6 8.3 1.6s6.2-.6 8.3-1.6"
              stroke="#0B3A1F"
              strokeOpacity="0.25"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M12 3c2.8 2.6 4.5 6 4.5 9s-1.7 6.4-4.5 9c-2.8-2.6-4.5-6-4.5-9S9.2 5.6 12 3Z"
              fill="#34D399"
              fillOpacity="0.95"
            />
            <path
              d="M4.5 14.2c2.2-1.2 5-1.9 7.5-1.9s5.3.7 7.5 1.9"
              stroke="#1D4ED8"
              strokeOpacity="0.55"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span>Online Multiplayer</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/local?mode=local', { preventScrollReset: true })}
          className="btn-secondary sidebar-btn"
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Local game"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" fill="#A78BFA" />
            <g opacity="0.9">
              <path d="M7 7h3v3H7V7Z" fill="#FDE68A" />
              <path d="M10 10h3v3h-3v-3Z" fill="#FDE68A" />
              <path d="M13 7h3v3h-3V7Z" fill="#FDE68A" />
              <path d="M7 13h3v3H7v-3Z" fill="#FDE68A" />
              <path d="M13 13h3v3h-3v-3Z" fill="#FDE68A" />
            </g>
            <path d="M7.5 18.5h9" stroke="#3B0764" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
          </svg>
          <span>Local Game</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/local?mode=bot', { preventScrollReset: true })}
          className="btn-secondary sidebar-btn"
        >
          <svg
            className="nav-icon"
            viewBox="0 0 24 24"
            fill="none"
            role="img"
            aria-label="Play vs bot"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="5" y="7" width="14" height="12" rx="5" fill="#FB7185" />
            <rect x="8" y="10" width="3.5" height="3" rx="1.5" fill="#0F172A" />
            <rect x="12.5" y="10" width="3.5" height="3" rx="1.5" fill="#0F172A" />
            <path d="M9 15.5c1 .9 2.1 1.3 3 1.3s2-.4 3-1.3" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 7V4" stroke="#FDE68A" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="3.5" r="1.2" fill="#FDE68A" />
          </svg>
          <span>Play vs Bot</span>
        </button>

        <button type="button" onClick={() => navigate('/puzzles')} className="btn-secondary sidebar-btn">
          <span className="nav-icon text-xl">🧩</span>
          <span>Tactical Puzzles</span>
        </button>
        <button type="button" onClick={() => navigate('/tutorial')} className="btn-secondary sidebar-btn">
          <span className="nav-icon text-xl">📚</span>
          <span>Tutorial</span>
        </button>
        <button type="button" onClick={() => navigate('/rules')} className="btn-secondary sidebar-btn">
          <span className="nav-icon text-xl">📖</span>
          <span>Chess Rules</span>
        </button>
      </div>

      <div className="lobby-sidebar-footer">
        <button type="button" onClick={handleLogout} className="btn-secondary sidebar-btn sidebar-btn--logout">
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );

  // Show loading state
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
            <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
            <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
            <button
              type="button"
              className="sidebar-user"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
              aria-label={isAuthenticated ? 'Open dashboard' : 'Login'}
              style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
            >
              <div>
                <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
              </div>
            </button>
          </div>

          <div className="lobby-layout">
            {lobbySidebar}
            <main className="lobby-main">
              <div className="flex items-center justify-center" style={{ minHeight: '50vh' }}>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <h2 className="text-2xl font-bold">Analyzing Game...</h2>
                  <p className="text-gray-400 mt-2">This may take a few moments</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (loadingError) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
            <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
            <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
            <button
              type="button"
              className="sidebar-user"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
              aria-label={isAuthenticated ? 'Open dashboard' : 'Login'}
              style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
            >
              <div>
                <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
              </div>
            </button>
          </div>

          <div className="lobby-layout">
            {lobbySidebar}
            <main className="lobby-main">
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4 text-red-500">Error Loading Analysis</h2>
                <p className="text-gray-400 mb-6">{loadingError}</p>
                <button
                  onClick={() => {
                    setLoadingError(null);
                    loadAnalysis();
                  }}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-bold"
                >
                  Retry
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  // Show "no analysis" state
  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
            <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
            <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
            <button
              type="button"
              className="sidebar-user"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
              aria-label={isAuthenticated ? 'Open dashboard' : 'Login'}
              style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
            >
              <div>
                <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
                <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
              </div>
            </button>
          </div>

          <div className="lobby-layout">
            {lobbySidebar}
            <main className="lobby-main">
              <div className="bg-gray-800 rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">No Analysis Available</h2>
                <p className="text-gray-400 mb-6">
                  This game hasn't been analyzed yet. Click below to start computer analysis.
                </p>
                <button
                  onClick={startAnalysis}
                  disabled={isAnalyzing}
                  className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
                </button>
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }

  const currentMove = analysis.moves[currentMoveIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 mt-4">
      <div className="max-w-7xl mx-auto">
        <div className="sidebar-logo-container" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <img src={brilliantknightzLogo} alt="BrilliantKnightz" className="sidebar-logo" onClick={() => navigate('/lobby')} style={{ width: '150px', height: '150px', cursor: 'pointer' }} />
          <img src={brilliantknightzBanner} alt="Brilliant Knightz" style={{ width: '400px', height: '200px', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} />
          <button
            type="button"
            className="sidebar-user"
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/auth')}
            aria-label={isAuthenticated ? 'Open dashboard' : 'Login'}
            style={{ width: 'auto', minWidth: 'unset', maxWidth: '120px' }}
          >
            <div>
              <div className="sidebar-user-name">{isAuthenticated ? (user?.username ?? 'User') : 'Login'}</div>
              <div className="sidebar-user-hint">{isAuthenticated ? 'Dashboard' : 'Sign in'}</div>
            </div>
          </button>
        </div>

        <div className="lobby-layout">
          {lobbySidebar}
          <main className="lobby-main">
            {/* Header */}
            <div className="mb-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold">Game Analysis</h1>
              <div className="flex gap-2 relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold shadow-[0_4px_14px_rgba(59,130,246,0.35)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.45)] transition-all active:scale-[0.97]"
            >
              📤 Export
            </button>
            
            {/* Export Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 top-14 bg-gray-800/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-white/10 z-50 min-w-[220px] overflow-hidden animate-fade-in">
                <button
                  onClick={handleDownloadPGN}
                  className="w-full px-5 py-3 text-left hover:bg-white/10 transition-all flex items-center gap-3 text-white/90 hover:text-white font-medium"
                >
                  <span className="text-lg">💾</span>
                  <span>Download PGN</span>
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handleCopyPGN}
                  className="w-full px-5 py-3 text-left hover:bg-white/10 transition-all flex items-center gap-3 text-white/90 hover:text-white font-medium"
                >
                  <span className="text-lg">📋</span>
                  <span>Copy PGN</span>
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handleCopyLink}
                  className="w-full px-5 py-3 text-left hover:bg-white/10 transition-all flex items-center gap-3 text-white/90 hover:text-white font-medium"
                >
                  <span className="text-lg">🔗</span>
                  <span>Copy Link</span>
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handleShareGame}
                  className="w-full px-5 py-3 text-left hover:bg-white/10 transition-all flex items-center gap-3 text-white/90 hover:text-white font-medium"
                >
                  <span className="text-lg">🔄</span>
                  <span>Share Game</span>
                </button>
                <div className="h-px bg-white/10" />
                <button
                  onClick={handlePrintGame}
                  className="w-full px-5 py-3 text-left hover:bg-white/10 transition-all flex items-center gap-3 text-white/90 hover:text-white font-medium"
                >
                  <span className="text-lg">🖨️</span>
                  <span>Print Game</span>
                </button>
              </div>
            )}
            
            <button style={{display: 'none'}}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`px-4 py-2 rounded hover:bg-gray-600 ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
              title={voiceEnabled ? 'Voice On' : 'Voice Off'}
            >
              {voiceEnabled ? '🔊' : '🔇'} Voice
            </button>
            <button
              onClick={() => setShowCommentary(!showCommentary)}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600" style={{display: 'none'}}
            >
              {showCommentary ? 'Hide' : 'Show'} Commentary
            </button>
              </div>
            </div>

        {/* Opening Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4" style={{ visibility: 'hidden', display: 'none' }}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">{analysis.openingName}</h3>
              <p className="text-gray-400">{analysis.openingEco}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{Number(analysis.accuracyWhite).toFixed(1)}%</div>
                <div className="text-gray-400">White Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Number(analysis.accuracyBlack).toFixed(1)}%</div>
                <div className="text-gray-400">Black Accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Board and Controls */}
          <div className="lg:col-span-2">
            {/* Graph and Board Side by Side with Vertical Control */}
            <div className="flex gap-2 mb-4" ref={chessboardRef}>
              {/* Chessboard */}
              <div className="flex-1 rounded-lg p-4 flex items-center justify-start" style={{ backgroundColor: '#1f2937' }}>
                <DisplayBoard 
                  fen={currentFen} 
                  orientation="white"
                  moveSquare={currentMove ? currentMove.moveUci.substring(2, 4) : undefined}
                  classification={currentMove?.classification}
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
                      height: `${currentMoveIndex === -1 ? 0 : ((currentMoveIndex + 1) / analysis.moves.length) * 100}%`,
                      background: 'linear-gradient(to top, #556b2f, #6b8e23, #808000, #9acd32)',
                      boxShadow: '0 -4px 24px rgba(107, 142, 35, 0.7)',
                      width: '100%',
                      transition: 'height 200ms ease-out'
                    }}
                  />
                </div>
                <div className="text-center text-sm font-bold text-white">
                  {currentMoveIndex === -1 
                    ? 'Start' 
                    : (() => {
                        const currentMove = analysis.moves[currentMoveIndex];
                        const totalMoves = Math.max(...analysis.moves.map(m => m.moveNumber));
                        return `${currentMove.moveNumber}${currentMove.playerColor === 'black' ? '..' : ''}/${totalMoves}`;
                      })()
                  }
                </div>
              </div>

              {/* Evaluation Graph */}
              <div className="grid grid-row-3 flex-1 flex items-center justify-center">
                <EvaluationGraph
                  moves={analysis.moves.map(m => ({
                    moveNumber: m.moveNumber,
                    evaluation: m.evaluation,
                    mateIn: m.mateIn,
                    classification: m.classification
                  }))}
                  currentMoveIndex={currentMoveIndex}
                  onMoveClick={setCurrentMoveIndex}
                />
                {/* Moves List */}
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="text-lg font-bold">Move List</h3>
                  <div ref={moveListRef} className="space-y-2 overflow-y-auto" style={{ height: '150px' }}>
                    {/* Header */}
                    <div className="flex items-center pb-2 border-b border-gray-600 font-bold text-sm text-gray-400 sticky top-0 bg-gray-800 z-10">
                      <div style={{ width: '50px' }}>#</div>
                      <div className="flex-1 text-center">
                        White (<span className="text-lg font-bold text-white">
                          {getMaterialCount(currentFen).white} pts
                        </span>)
                      </div>
                      <div style={{ width: '30px' }}></div>
                      <div className="flex-1 text-center">
                        Black (<span className="text-lg font-bold text-white">
                          {getMaterialCount(currentFen).black} pts
                        </span>)</div>
                    </div>
                    
                    {/* Group moves by move number */}
                    {Array.from(new Set(analysis.moves.map(m => m.moveNumber))).reverse().map(moveNum => {
                      const whiteMoveIndex = analysis.moves.findIndex(m => m.moveNumber === moveNum && m.playerColor === 'white');
                      const blackMoveIndex = analysis.moves.findIndex(m => m.moveNumber === moveNum && m.playerColor === 'black');
                      const whiteMove = whiteMoveIndex >= 0 ? analysis.moves[whiteMoveIndex] : null;
                      const blackMove = blackMoveIndex >= 0 ? analysis.moves[blackMoveIndex] : null;
                      
                      return (
                        <div key={moveNum} className="flex items-center text-sm">
                          <div className="text-gray-400 font-bold" style={{ width: '50px' }}>{moveNum}</div>
                          
                          {/* White Move */}
                          <div
                            ref={(el) => { if (whiteMove) moveRefs.current[whiteMoveIndex] = el; }}
                            onClick={() => {
                              if (whiteMove) {
                                console.log('Clicked white move:', whiteMove.moveNumber, whiteMove.moveSan, 'index:', whiteMoveIndex);
                                setCurrentMoveIndex(whiteMoveIndex);
                              }
                            }}
                            className={`flex-1 p-2 rounded relative ${whiteMove ? 'cursor-pointer' : 'cursor-default'} ${
                              whiteMove ? 'hover:bg-gray-700' : ''
                            }`}
                            style={currentMoveIndex === whiteMoveIndex ? { backgroundColor: '#6b8e23' } : {}}
                          >
                            {whiteMove && (
                              <>
                                <div className="flex justify-between items-center gap-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <span style={{ fontSize: '36px', lineHeight: '1' }}>{getPieceIcon(whiteMove.moveSan, 'white')}</span>
                                    <span>{whiteMove.moveSan}</span>
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {getEvaluationDisplay(whiteMove.evaluation, whiteMove.mateIn)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* Gap between columns */}
                          <div style={{ width: '30px' }}></div>
                          
                          {/* Black Move */}
                          <div
                            ref={(el) => { if (blackMove) moveRefs.current[blackMoveIndex] = el; }}
                            onClick={() => {
                              if (blackMove) {
                                console.log('Clicked black move:', blackMove.moveNumber, blackMove.moveSan, 'index:', blackMoveIndex);
                                setCurrentMoveIndex(blackMoveIndex);
                              }
                            }}
                            className={`flex-1 p-2 rounded relative ${blackMove ? 'cursor-pointer' : 'cursor-default'} ${
                              blackMove ? 'hover:bg-gray-700' : ''
                            }`}
                            style={currentMoveIndex === blackMoveIndex ? { backgroundColor: '#6b8e23' } : {}}
                          >
                            {blackMove && (
                              <>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <span style={{ fontSize: '36px', lineHeight: '1' }}>{getPieceIcon(blackMove.moveSan, 'black')}</span>
                                    <span>{blackMove.moveSan}</span>
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {getEvaluationDisplay(blackMove.evaluation, blackMove.mateIn)}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Player Material Info */}
                <div className="bg-gray-800 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    {/* White Player */}
                    <div className="bg-gray-700 rounded">
                      {renderCapturedPieces(getMaterialCount(currentFen).whiteLost)}
                      {getMaterialCount(currentFen).advantage > 0 && (
                        <div className="mt-2 text-green-400 font-bold">
                          +{getMaterialCount(currentFen).advantage}
                        </div>
                      )}
                    </div>

                    {/* Black Player */}
                    <div className="bg-gray-700 rounded">
                      {renderCapturedPieces(getMaterialCount(currentFen).blackLost)}
                      {getMaterialCount(currentFen).advantage < 0 && (
                        <div className="mt-2 text-green-400 font-bold">
                          +{Math.abs(getMaterialCount(currentFen).advantage)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            

            {/* Animated Knight Commentary */}
            {currentMove && (
              <div className="bg-gray-800 rounded-lg p-6 relative overflow-hidden">
                {/* Animated Background Glow */}
                <div 
                  className="absolute inset-0 opacity-20"
                  style={{
                    background: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3), transparent 50%)',
                    animation: 'pulse 2s ease-in-out infinite'
                  }}
                />
                
                <div className="relative flex items-center gap-3">
                  {/* Blue Knight Character */}
                  <div className="flex flex-col items-center">
                    <div 
                      className="relative"
                      style={{
                        animation: currentMoveIndex >= 0 ? 'knightBounce 0.6s ease-out' : 'none'
                      }}
                    >
                      {/* Knight Icon - Flipped */}
                      <div 
                        className="font-bold select-none flex items-center justify-center"
                        style={{
                          width: '100px',
                          height: '100px',
                          fontSize: '90px',
                          lineHeight: '100px',
                          color: '#3b82f6',
                          textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)',
                          filter: 'drop-shadow(0 4px 12px rgba(59, 130, 246, 0.5))',
                          transform: 'scaleX(-1)'
                        }}
                      >
                        ♞
                      </div>
                      {/* Animated Sparkles for Brilliant/Great moves */}
                      {(currentMove.classification === 'brilliant' || currentMove.classification === 'great') && (
                        <>
                          <div 
                            className="absolute"
                            style={{
                              top: '10%',
                              left: '10%',
                              fontSize: '24px',
                              animation: 'sparkle 1s ease-in-out infinite',
                              animationDelay: '0s'
                            }}
                          >
                            ✨
                          </div>
                          <div 
                            className="absolute"
                            style={{
                              top: '20%',
                              right: '5%',
                              fontSize: '20px',
                              animation: 'sparkle 1s ease-in-out infinite',
                              animationDelay: '0.3s'
                            }}
                          >
                            ⭐
                          </div>
                          <div 
                            className="absolute"
                            style={{
                              bottom: '15%',
                              left: '5%',
                              fontSize: '18px',
                              animation: 'sparkle 1s ease-in-out infinite',
                              animationDelay: '0.6s'
                            }}
                          >
                            💫
                          </div>
                        </>
                      )}
                    </div>
                    
                  </div>

                  {/* Classification Speech Bubble - Improved cloud shape */}
                  <div 
                    className="relative"
                    style={{
                      animation: currentMoveIndex >= 0 ? 'slideIn 0.4s ease-out' : 'none'
                    }}
                  >
                    {/* Speech bubble tail - curved organic style */}
                    <div className="absolute" style={{ left: '-30px', top: '50%', transform: 'translateY(-50%)', zIndex: 0 }}>
                      {/* Large bubble circle */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: '15px',
                          top: '-10px',
                          width: '22px',
                          height: '22px',
                          backgroundColor: '#faf9f6',
                          borderRadius: '50%',
                          border: '2px solid #e8e6e3',
                          boxShadow: '0 3px 8px rgba(0, 0, 0, 0.12)'
                        }}
                      />
                      {/* Medium bubble circle */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: '4px',
                          top: '-4px',
                          width: '14px',
                          height: '14px',
                          backgroundColor: '#faf9f6',
                          borderRadius: '50%',
                          border: '2px solid #e8e6e3',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      {/* Small bubble circle */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: '-2px',
                          top: '1px',
                          width: '9px',
                          height: '9px',
                          backgroundColor: '#faf9f6',
                          borderRadius: '50%',
                          border: '2px solid #e8e6e3',
                          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)'
                        }}
                      />
                    </div>
                    
                    {/* Cloud-style speech bubble */}
                    <div 
                      className="text-4xl font-bold"
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        background: 'linear-gradient(135deg, #ffffff 0%, #faf9f6 100%)',
                        color: '#1a1a1a',
                        paddingLeft: '40px',
                        paddingRight: '40px',
                        paddingTop: '24px',
                        paddingBottom: '24px',
                        borderRadius: '60px',
                        textShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        animation: (currentMove.classification === 'brilliant' || currentMove.classification === 'blunder') 
                          ? 'textPulse 1s ease-in-out infinite' : 'none',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.8)',
                        border: '3px solid #e8e6e3',
                        display: 'inline-block',
                        minWidth: '280px',
                        textAlign: 'center',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {getClassificationText(currentMove.classification)}
                    </div>
                  </div>
                </div>

                {/* CSS Animations */}
                <style>{`
                  @keyframes knightBounce {
                    0%, 100% { transform: translateY(0); }
                    25% { transform: translateY(-12px) rotate(-5deg); }
                    50% { transform: translateY(-8px) rotate(0deg); }
                    75% { transform: translateY(-4px) rotate(5deg); }
                  }
                  @keyframes slideIn {
                    from { 
                      opacity: 0;
                      transform: translateX(-20px);
                    }
                    to { 
                      opacity: 1;
                      transform: translateX(0);
                    }
                  }
                  @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                  }
                  @keyframes sparkle {
                    0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); }
                    50% { opacity: 1; transform: scale(1.2) rotate(180deg); }
                  }
                  @keyframes textPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                  }
                `}</style>
              </div>
            )}
          </div>

          
        </div>

        {/* Commentary Section */}
        {/*showCommentary*/ false && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">Commentary</h3>
            
            {/* Add Commentary */}
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add your commentary..."
                className="w-full p-3 bg-gray-700 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <div>
                  {selectedMoveNumber !== null && (
                    <span className="text-gray-400">
                      Commenting on move {selectedMoveNumber}
                      <button
                        onClick={() => setSelectedMoveNumber(null)}
                        className="ml-2 text-red-400 hover:text-red-300"
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
                <button
                  onClick={addCommentary}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Post Comment
                </button>
              </div>
            </div>

            {/* Commentary List */}
            <div className="space-y-4">
              {commentaries.map((comment) => (
                <div key={comment.id} className="bg-gray-700 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold">{comment.username}</span>
                      {comment.moveNumber && (
                        <span className="ml-2 text-gray-400">• Move {comment.moveNumber}</span>
                      )}
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        comment.commentaryType === 'coach' ? 'bg-purple-600' :
                        comment.commentaryType === 'ai' ? 'bg-blue-600' :
                        'bg-gray-600'
                      }`}>
                        {comment.commentaryType?.toUpperCase() || 'PLAYER'}
                      </span>
                    </div>
                    <button
                      onClick={() => likeCommentary(comment.id)}
                      className="text-gray-400 hover:text-red-400"
                    >
                      ❤️ {comment.likes}
                    </button>
                  </div>
                  <p className="text-gray-300">{comment.content}</p>
                  <p className="text-gray-500 text-sm mt-2">
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-6 py-4 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.4)] z-50 backdrop-blur-xl border border-emerald-400/20 font-semibold animate-slide-in">
            <div className="flex items-center gap-3">
              <span className="text-xl">✓</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default GameAnalysis;
