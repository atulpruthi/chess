import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { chessComOptions } from '../styles/chessboardTheme';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';

interface GameData {
  id: number;
  whiteUsername: string;
  blackUsername: string;
  result: string;
  timeControl?: string;
  isRated: boolean;
  totalMoves: number;
  pgn: string;
  completedAt: string;
  whiteRatingBefore?: number;
  whiteRatingAfter?: number;
  blackRatingBefore?: number;
  blackRatingAfter?: number;
}

interface Move {
  moveNumber: number;
  white?: string;
  black?: string;
}

interface HalfMove {
  moveNumber: number;
  playerColor: 'white' | 'black';
  san: string;
}

const GameReplay: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  
  const [game, setGame] = useState<Chess>(new Chess());
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [halfMoves, setHalfMoves] = useState<HalfMove[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [position, setPosition] = useState(game.fen());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const chessboardRef = useRef<HTMLDivElement>(null);
  const moveListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  // Scroll chessboard to center of viewport when game data loads
  useEffect(() => {
    if (gameData && chessboardRef.current) {
      setTimeout(() => {
        chessboardRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [gameData]);

  // Scroll move list to bottom to show first move when game data loads
  useEffect(() => {
    if (moves.length > 0 && moveListRef.current) {
      setTimeout(() => {
        if (moveListRef.current) {
          moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
        }
      }, 150);
    }
  }, [moves]);

  // Scroll move list to keep active move in view
  useEffect(() => {
    if (moveListRef.current && currentMoveIndex >= 0) {
      const activeMoveElement = moveListRef.current.querySelector(`[data-move-index="${currentMoveIndex}"]`);
      if (activeMoveElement) {
        activeMoveElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }
    }
  }, [currentMoveIndex]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isPlaying && currentMoveIndex < halfMoves.length - 1) {
      interval = setInterval(() => {
        goToMove(currentMoveIndex + 1);
      }, 1000); // Auto-advance every second
    } else if (currentMoveIndex >= halfMoves.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentMoveIndex, halfMoves.length]);

  // Keyboard navigation for moves
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (halfMoves.length === 0) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToStart();
      } else if (e.key === 'End') {
        e.preventDefault();
        goToEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [halfMoves, currentMoveIndex]);

  const fetchGameData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${config.apiUrl}/api/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGameData(data);
        if (data.pgn) {
          loadPGN(data.pgn);
        } else {
          setError('Game has no move data');
        }
      } else {
        console.error('Failed to fetch game data:', response.status);
        setError(`Failed to load game (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const loadPGN = (pgn: string) => {
    try {
      const tempGame = new Chess();
      tempGame.loadPgn(pgn);
      
      // Extract moves
      const history = tempGame.history();
      const movePairs: Move[] = [];
      const halfMovesList: HalfMove[] = [];
      
      for (let i = 0; i < history.length; i += 2) {
        movePairs.push({
          moveNumber: Math.floor(i / 2) + 1,
          white: history[i],
          black: history[i + 1],
        });
      }
      
      // Also create individual half-moves for easier navigation
      for (let i = 0; i < history.length; i++) {
        halfMovesList.push({
          moveNumber: Math.floor(i / 2) + 1,
          playerColor: i % 2 === 0 ? 'white' : 'black',
          san: history[i]
        });
      }
      
      setMoves(movePairs);
      setHalfMoves(halfMovesList);
      
      // Reset to starting position
      const startGame = new Chess();
      setGame(startGame);
      setPosition(startGame.fen());
      setCurrentMoveIndex(-1);
    } catch (error) {
      console.error('Error loading PGN:', error);
    }
  };

  const goToMove = (index: number) => {
    if (index < -1 || index >= halfMoves.length) return;

    const tempGame = new Chess();
    
    // Replay half-moves up to the target index
    for (let i = 0; i <= index; i++) {
      const halfMove = halfMoves[i];
      tempGame.move(halfMove.san);
    }

    setGame(tempGame);
    setPosition(tempGame.fen());
    setCurrentMoveIndex(index);
  };

  const goToStart = () => {
    goToMove(-1);
    setIsPlaying(false);
  };

  const goToPrevious = () => {
    goToMove(currentMoveIndex - 1);
    setIsPlaying(false);
  };

  const goToNext = () => {
    goToMove(currentMoveIndex + 1);
  };

  const goToEnd = () => {
    goToMove(halfMoves.length - 1);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (currentMoveIndex >= halfMoves.length - 1) {
      goToStart();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const getResultString = () => {
    if (!gameData) return '';
    
    if (gameData.result === 'white') return `1-0 • ${gameData?.whiteUsername || 'White'} wins`;
    if (gameData.result === 'black') return `0-1 • ${gameData?.blackUsername || 'Black'} wins`;
    if (gameData.result === 'draw') return '½-½ • Draw';
    return 'Game in progress';
  };

  const getMaterialCount = (fen: string) => {
    const pieceValues: { [key: string]: number } = {
      'q': 9, 'Q': 9,
      'r': 5, 'R': 5,
      'b': 3, 'B': 3,
      'n': 3, 'N': 3,
      'p': 1, 'P': 1
    };
    
    const boardPart = fen.split(' ')[0];
    const material = { white: 0, black: 0 };
    
    // Count each piece type
    const pieceCounts = {
      white: { Q: 0, R: 0, B: 0, N: 0, P: 0 },
      black: { q: 0, r: 0, b: 0, n: 0, p: 0 }
    };
    
    for (const char of boardPart) {
      if (pieceValues[char]) {
        if (char === char.toUpperCase()) {
          material.white += pieceValues[char];
          pieceCounts.white[char as keyof typeof pieceCounts.white]++;
        } else {
          material.black += pieceValues[char];
          pieceCounts.black[char as keyof typeof pieceCounts.black]++;
        }
      }
    }
    
    const startingMaterial = 39;
    const whiteLost = Math.max(0, startingMaterial - material.white);
    const blackLost = Math.max(0, startingMaterial - material.black);
    
    // Calculate captured pieces (what's missing from starting position)
    const whiteCaptured = {
      q: Math.max(0, 1 - pieceCounts.black.q),
      r: Math.max(0, 2 - pieceCounts.black.r),
      b: Math.max(0, 2 - pieceCounts.black.b),
      n: Math.max(0, 2 - pieceCounts.black.n),
      p: Math.max(0, 8 - pieceCounts.black.p)
    };
    
    const blackCaptured = {
      Q: Math.max(0, 1 - pieceCounts.white.Q),
      R: Math.max(0, 2 - pieceCounts.white.R),
      B: Math.max(0, 2 - pieceCounts.white.B),
      N: Math.max(0, 2 - pieceCounts.white.N),
      P: Math.max(0, 8 - pieceCounts.white.P)
    };
    
    return {
      white: material.white,
      black: material.black,
      whiteLost,
      blackLost,
      advantage: material.white - material.black,
      whiteCaptured,
      blackCaptured
    };
  };

  const renderCapturedPieces = (captured: { [key: string]: number }, color: 'white' | 'black') => {
    // Unicode symbols: filled symbols for black pieces, outlined for white pieces
    const whitePieces: { [key: string]: string } = {
      'Q': '♛', 'R': '♜', 'B': '♝', 'N': '♞', 'P': '♟'
    };
    const blackPieces: { [key: string]: string } = {
      'q': '♕', 'r': '♖', 'b': '♗', 'n': '♘', 'p': '♙'
    };
    
    // For white column: show black pieces captured by white (lowercase keys with black symbols)
    // For black column: show white pieces captured by black (uppercase keys with white symbols)
    const pieces = color === 'white' ? blackPieces : whitePieces;
    const pieceOrder = color === 'white' ? ['q', 'r', 'b', 'n', 'p'] : ['Q', 'R', 'B', 'N', 'P'];
    
    return (
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {pieceOrder.map(piece => {
          const count = captured[piece] || 0;
          if (count === 0) return null;
          return (
            <span key={piece} style={{ fontSize: '50px', lineHeight: '1' }}>
              {Array(count).fill(pieces[piece]).join('')}
            </span>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameData || error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-white text-xl mb-4">{error || 'Game not found'}</div>
          <button
            onClick={() => navigate('/game-history')}
            className="btn-secondary px-6 py-2"
          >
            Back to Game History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 mt-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/game-history')}
            className="btn-secondary"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Game Replay</h1>
          <div className="text-sm text-gray-400">{getResultString()}</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chessboard */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4">
              {/* Board and Progress Bar */}
              <div className="flex gap-2 mb-4">
                {/* Board */}
                <div ref={chessboardRef} className="flex items-center justify-start ml-4" >
                  <Chessboard
                    options={chessComOptions({
                      id: 'game-replay-chessboard',
                      position,
                      allowDragging: false,
                      boardStyle: {
                        width: '682px',
                        height: '682px',
                        borderRadius: '8px',
                        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
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
                        height: `${currentMoveIndex === -1 ? 0 : ((currentMoveIndex + 1) / halfMoves.length) * 100}%`,
                        background: 'linear-gradient(to top, #556b2f, #6b8e23, #808000, #9acd32)',
                        boxShadow: '0 -4px 24px rgba(107, 142, 35, 0.7)',
                        width: '100%',
                        transition: 'height 200ms ease-out'
                      }}
                    />
                  </div>
                  <div>
                    <button
                      onClick={togglePlayPause}
                      className="bg-transparent border-0 text-white hover:bg-gray-700/50 transition flex items-center justify-center">
                        {isPlaying ? (
                          <svg width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="3" y="2" width="3" height="12" fill="currentColor" rx="1"/>
                            <rect x="10" y="2" width="3" height="12" fill="currentColor" rx="1"/>
                          </svg>
                        ) : (
                          <svg width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 2L13 8L4 14V2Z" fill="currentColor"/>
                          </svg>
                        )}
                      </button>
                  </div>
                  
                 </div>
                 {/* Move history */}
          <div style={{width: '100%', height: '300px'  }}>
            <div className="bg-gray-800 rounded-lg p-4 h-full" >
              <h3 className="text-lg font-bold text-white mb-3 text-center">Moves</h3>
              
              {/* Player Info Row */}
              <div className="flex items-center text-sm mb-2">
                {/* Empty space for move number column */}
                <div style={{ width: '50px' }}></div>
                
                {/* White Player Info */}
                <div className="flex-1 p-2 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div>
                      <div className="text-white font-semibold text-sm">{gameData.whiteUsername || 'White'}</div>
                      {gameData?.whiteRatingBefore && (
                        <div className="text-xs text-gray-400">Rating: {gameData.whiteRatingBefore}</div>
                      )}
                    </div>
                    {game.turn() === 'w' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
                
                {/* Gap between columns */}
                <div style={{ width: '30px' }}></div>
                
                {/* Black Player Info */}
                <div className="flex-1 p-2 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-center gap-2">
                    <div>
                      <div className="text-white font-semibold text-sm">{gameData.blackUsername || 'Bot'}</div>
                      {gameData?.blackRatingBefore && (
                        <div className="text-xs text-gray-400">Rating: {gameData.blackRatingBefore}</div>
                      )}
                    </div>
                    {game.turn() === 'b' && (
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
              <div style={{height: '20px'}}></div>
              
              <div ref={moveListRef} className="space-y-1 h-[100px] overflow-y-auto">
                {moves.slice().reverse().map((move, reversedIndex) => {
                  const pairIndex = moves.length - 1 - reversedIndex;
                  const whiteHalfMoveIndex = halfMoves.findIndex(hm => hm.moveNumber === move.moveNumber && hm.playerColor === 'white');
                  const blackHalfMoveIndex = halfMoves.findIndex(hm => hm.moveNumber === move.moveNumber && hm.playerColor === 'black');
                  
                  return (
                  <div key={pairIndex} className="flex items-center text-sm text-center">
                    {/* Move number */}
                    <div className="text-gray-400 font-bold" style={{ width: '50px' }}>
                      {move.moveNumber}
                    </div>
                    
                    {/* White Move */}
                    <div
                      onClick={() => move.white && goToMove(whiteHalfMoveIndex)}
                      className={`flex-1 p-3 rounded ${move.white ? 'cursor-pointer hover:bg-gray-700' : ''} transition ${
                        currentMoveIndex === whiteHalfMoveIndex ? '' : 'bg-gray-700/50'
                      }`}
                      style={currentMoveIndex === whiteHalfMoveIndex ? { backgroundColor: '#6b8e23' } : {}}
                      data-move-index={whiteHalfMoveIndex}
                    >
                      {move.white && (
                        <span className="font-mono text-white text-base">{move.white}</span>
                      )}
                    </div>
                    
                    {/* Gap between columns */}
                    <div style={{ width: '30px' }}></div>
                    
                    {/* Black Move */}
                    <div
                      onClick={() => move.black && goToMove(blackHalfMoveIndex)}
                      className={`flex-1 p-3 rounded ${move.black ? 'cursor-pointer hover:bg-gray-700' : ''} transition ${
                        currentMoveIndex === blackHalfMoveIndex ? '' : move.black ? 'bg-gray-700/50' : ''
                      }`}
                      style={currentMoveIndex === blackHalfMoveIndex ? { backgroundColor: '#6b8e23' } : {}}
                      data-move-index={blackHalfMoveIndex}
                    >
                      {move.black && (
                        <span className="font-mono text-white text-base">{move.black}</span>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              
              {/* Captured Pieces Row */}
              <div className="flex items-center text-xs mt-4">
                {/* Empty space for move number column */}
                <div style={{ width: '50px' }}></div>
                
                {/* White's captured pieces (Black's pieces captured by White) */}
                <div className="flex-1 p-2 bg-gray-700/30 rounded">
                  {renderCapturedPieces(getMaterialCount(position).whiteCaptured, 'white')}
                  <div className="text-gray-400 text-center mt-1">
                    <span className="text-white font-bold">{getMaterialCount(position).blackLost} pts</span>
                  </div>
                </div>
                
                {/* Gap between columns */}
                <div style={{ width: '30px' }}></div>
                
                {/* Black's captured pieces (White's pieces captured by Black) */}
                <div className="flex-1 p-2 bg-gray-700/30 rounded">
                  {renderCapturedPieces(getMaterialCount(position).blackCaptured, 'black')}
                  <div className="text-gray-400 text-center mt-1">
                    <span className="text-white font-bold">{getMaterialCount(position).whiteLost} pts</span>
                  </div>
                </div>
              </div>
              </div>
              {/* Controls */}
              <div className="flex items-center justify-center gap-3" style={{display: 'none'}}>
                <button
                  onClick={goToStart}
                  disabled={currentMoveIndex === -1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏮️ Start
                </button>
                <button
                  onClick={goToPrevious}
                  disabled={currentMoveIndex === -1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀️ Prev
                </button>
                <button
                  onClick={togglePlayPause}
                  className="m-2 bg-transparent text-white hover:bg-gray-700/50 flex items-center justify-center"
                >
                  {isPlaying ? (
                    <svg width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="2" width="3" height="12" fill="currentColor" rx="1"/>
                      <rect x="10" y="2" width="3" height="12" fill="currentColor" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M4 2L13 8L4 14V2Z" fill="currentColor"/>
                    </svg>
                  )}
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentMoveIndex >= halfMoves.length - 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ▶️
                </button>
                <button
                  onClick={goToEnd}
                  disabled={currentMoveIndex >= halfMoves.length - 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End ⏭️
                </button>
              </div>

              <div className="mt-3 text-center text-gray-400 text-sm">
                {currentMoveIndex === -1 ? 'Start' : `Move ${currentMoveIndex + 1} of ${halfMoves.length}`}
              </div>
              {/* Game info */}
              <div className="pt-4 border-t border-gray-600 space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Time Control:</span>
                  <span className="text-white capitalize">{gameData?.timeControl || 'Custom'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Game Type:</span>
                  <span className="text-white">
                    {gameData?.isRated ? '⭐ Rated' : 'Casual'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Total Moves:</span>
                  <span className="text-white">{gameData?.totalMoves || 0}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Played on:</span>
                  <span className="text-white">
                    {gameData?.completedAt ? new Date(gameData.completedAt).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default GameReplay;
