import React, { useState, useEffect } from 'react';
import { Chess, type Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { config } from '../config';
import { chessComOptions } from '../styles/chessboardTheme';
import { soundService } from '../services/soundService';

interface Puzzle {
  id: number;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  nbPlays: number;
  nbSolved: number;
  solutionRate: number;
}

interface PuzzleStats {
  puzzleRating: number;
  puzzlesAttempted: number;
  puzzlesSolved: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeSpent: number;
  accuracy: number;
}

const TacticalPuzzle: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuthStore();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [game, setGame] = useState<Chess>(new Chess());
  const [userMoves, setUserMoves] = useState<string[]>([]); // SAN format for display
  const [userMovesUCI, setUserMovesUCI] = useState<string[]>([]); // UCI format for backend
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<'playing' | 'solved' | 'failed'>('playing');
  const [message, setMessage] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [ratingChange, setRatingChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && status === 'playing') {
      interval = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, status]);

  // Fetch user stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Load puzzle on mount
  useEffect(() => {
    loadNewPuzzle();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/api/puzzles/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const loadNewPuzzle = async (difficulty?: 'easy' | 'medium' | 'hard') => {
    try {
      setLoading(true);
      setPuzzle(null);
      setMessage('');
      
      console.log('Loading puzzle, token:', token ? 'present' : 'missing');
      const difficultyParam = difficulty ? `?difficulty=${difficulty}` : '';
      const url = `${config.apiUrl}/api/puzzles/random${difficultyParam}`;
      console.log('Fetching from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Puzzle data:', data);
        
        if (!data || !data.fen || !data.moves) {
          throw new Error('Invalid puzzle data received');
        }
        
        setPuzzle(data);
        const newGame = new Chess(data.fen);
        setGame(newGame);
        setUserMoves([]);
        setUserMovesUCI([]);
        setMoveIndex(0);
        setStatus('playing');
        setMessage(`Find the best move for ${newGame.turn() === 'w' ? 'White' : 'Black'}`);
        setShowHint(false);
        setTimeSpent(0);
        setTimerActive(true);
        setAttempts(0);
        setRatingChange(null);
        console.log('Puzzle loaded successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load puzzle:', response.status, errorData);
        setMessage(`Failed to load puzzle: ${errorData.error || response.statusText}`);
        setPuzzle(null);
      }
    } catch (error) {
      console.error('Error loading puzzle:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to load puzzle'}`);
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDailyPuzzle = async () => {
    try {
      setLoading(true);
      setPuzzle(null);
      setMessage('');
      
      console.log('Loading daily puzzle');
      const response = await fetch(`${config.apiUrl}/api/puzzles/daily`);
      console.log('Daily puzzle response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Daily puzzle data:', data);
        
        if (!data || !data.fen || !data.moves) {
          throw new Error('Invalid daily puzzle data received');
        }
        
        setPuzzle(data);
        const newGame = new Chess(data.fen);
        setGame(newGame);
        setUserMoves([]);
        setUserMovesUCI([]);
        setMoveIndex(0);
        setStatus('playing');
        setMessage(`Daily Puzzle - Find the best move for ${newGame.turn() === 'w' ? 'White' : 'Black'}`);
        setShowHint(false);
        setTimeSpent(0);
        setTimerActive(true);
        setAttempts(0);
        setRatingChange(null);
        console.log('Daily puzzle loaded successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to load daily puzzle:', response.status, errorData);
        setMessage(`Failed to load daily puzzle: ${errorData.error || response.statusText}`);
        setPuzzle(null);
      }
    } catch (error) {
      console.error('Error loading daily puzzle:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Failed to load daily puzzle'}`);
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = (sourceSquare: string, targetSquare: string) => {
    console.log('onDrop called:', { sourceSquare, targetSquare, status, puzzle: !!puzzle, moveIndex });
    
    if (status !== 'playing' || !puzzle) {
      console.log('Rejecting: not playing or no puzzle');
      return false;
    }

    try {
      // Create a copy of the game to make the move
      const gameCopy = new Chess(game.fen());
      
      // Check if this is a pawn promotion move
      const piece = gameCopy.get(sourceSquare as Square);
      console.log('Piece at source:', piece);
      
      const isPromotion = piece && 
        piece.type === 'p' && 
        ((piece.color === 'w' && targetSquare[1] === '8') || 
         (piece.color === 'b' && targetSquare[1] === '1'));
      
      console.log('Is promotion?', isPromotion);
      
      // Make the move with promotion only if needed
      const move = gameCopy.move({
        from: sourceSquare as Square,
        to: targetSquare as Square,
        ...(isPromotion ? { promotion: 'q' } : {})
      });

      if (move === null) {
        console.log('Move is invalid');
        return false;
      }

      // Convert move to UCI format for comparison (e.g., "e2e4")
      const uciMove = sourceSquare + targetSquare + (isPromotion ? 'q' : '');
      const expectedMove = puzzle.moves[moveIndex];

      console.log('Move made:', move.san, 'Expected:', expectedMove);
      
      const newUserMoves = [...userMoves, move.san];
      const newUserMovesUCI = [...userMovesUCI, uciMove];
      setUserMoves(newUserMoves);
      setUserMovesUCI(newUserMovesUCI);
      setAttempts(prev => prev + 1);
      
      console.log('Comparing UCI:', uciMove, 'vs expected:', expectedMove);

      // Check if move is correct (compare in UCI format)
      if (uciMove === expectedMove || move.san === expectedMove) {
        console.log('✓ Correct move!');
        
        // Play capture or move sound
        if ('captured' in move && move.captured) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }
        
        // Correct move!
        if (moveIndex + 1 >= puzzle.moves.length) {
          // Puzzle solved!
          soundService.playSuccess();
          setGame(gameCopy);
          // Pass the current attempt count and UCI moves (before state updates)
          const currentAttempts = attempts + 1;
          solvePuzzle(true, newUserMovesUCI, currentAttempts);
        } else {
          // Make opponent's response
          const opponentMoveUCI = puzzle.moves[moveIndex + 1];
          console.log('Making opponent move:', opponentMoveUCI);
          
          // Convert UCI to move object (e.g., "e2e4" -> {from: 'e2', to: 'e4'})
          const opponentFrom = opponentMoveUCI.substring(0, 2);
          const opponentTo = opponentMoveUCI.substring(2, 4);
          const opponentPromotion = opponentMoveUCI.length > 4 ? opponentMoveUCI[4] : undefined;
          
          const opponentMoveResult = gameCopy.move({
            from: opponentFrom as Square,
            to: opponentTo as Square,
            ...(opponentPromotion ? { promotion: opponentPromotion as 'q' | 'r' | 'b' | 'n' } : {})
          });
          
          if (!opponentMoveResult) {
            console.error('Failed to make opponent move:', opponentMoveUCI);
          } else {
            // Play sound for opponent move
            if ('captured' in opponentMoveResult && opponentMoveResult.captured) {
              soundService.playCapture();
            } else {
              soundService.playMove();
            }
          }
          
          setGame(gameCopy);
          setMoveIndex(prev => prev + 2);
          setMessage('Correct! Continue...');
        }
      } else {
        console.log('✗ Wrong move');
        soundService.playError();
        // Wrong move - don't update the board, just show message
        setMessage('That\'s not the best move. Try again!');
        return false; // Returning false prevents the piece from moving
      }

      return true;
    } catch (error) {
      console.error('Error in onDrop:', error);
      return false;
    }
  };

  const solvePuzzle = async (solved: boolean, moves: string[], currentAttempts?: number) => {
    setStatus(solved ? 'solved' : 'failed');
    setTimerActive(false);
    setMessage(solved ? '🎉 Puzzle solved!' : '❌ Puzzle failed');

    if (!puzzle) return;

    const finalAttempts = currentAttempts ?? attempts;
    
    const payload = {
      solved,
      attempts: finalAttempts,
      timeSpent,
      userMoves: moves
    };
    
    console.log('Submitting puzzle attempt:', payload);

    try {
      const response = await fetch(`${config.apiUrl}/api/puzzles/${puzzle.id}/attempt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      console.log('Submit response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Submit response data:', data);
        setRatingChange(data.ratingChange);
        await fetchStats(); // Update stats
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Submit failed:', response.status, errorData);
      }
    } catch (error) {
      console.error('Error submitting attempt:', error);
    }
  };

  const giveUp = () => {
    if (!puzzle) return;
    solvePuzzle(false, userMovesUCI);
    setMessage(`Solution: ${puzzle.moves.join(', ')}`);
  };

  const toggleHint = () => {
    if (!puzzle) return;
    setShowHint(!showHint);
  };

  const formatTime = (seconds: number): string =>{
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="lobby-shell flex items-center justify-center">
        <div className="text-white text-xl">Loading puzzle...</div>
      </div>
    );
  }

  return (
    <div className="lobby-shell">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pb-20 pt-8">
        {/* Header */}
        <header className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-secondary"
            >
              ← Back
            </button>
            <div className="text-[30px] font-extrabold text-center">🧩 Tactical Puzzles</div>
            <div className="text-sm text-white/60">
              {stats ? `Rating: ${stats.puzzleRating}` : ''}
            </div>
          </div>
        </header>

        <div className="flex gap-6" style={{ marginTop: '40px' }}>
          {/* Left Sidebar - Difficulty Selector */}
          <div className="w-100 flex-shrink-0">
            <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-6 py-8 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
              <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2" style={{marginTop: '20px'}}></div>
              <div className="h-px bg-white/10 my-4" />
              <div className="space-y-3">
                <button
                  onClick={loadDailyPuzzle}
                  className="btn-secondary sidebar-btn w-full"
                >
                  <span className="nav-icon text-xl">⭐</span>
                  <span>Daily Puzzle</span>
                </button>
                <button
                  onClick={() => loadNewPuzzle('easy')}
                  className="btn-secondary sidebar-btn w-full"
                >
                  <span className="nav-icon text-xl">🟢</span>
                  <span>Easy</span>
                </button>
                <button
                  onClick={() => loadNewPuzzle('medium')}
                  className="btn-secondary sidebar-btn w-full"
                >
                  <span className="nav-icon text-xl">🟡</span>
                  <span>Medium</span>
                </button>
                <button
                  onClick={() => loadNewPuzzle('hard')}
                  className="btn-secondary sidebar-btn w-full"
                >
                  <span className="nav-icon text-xl">🔴</span>
                  <span>Hard</span>
                </button>
              </div>
            </div>
          </div>

          {/* Puzzle Board */}
          <div className="flex-1">
            <div className="card-lift rounded-3xl bg-white/[0.03] px-8 py-10">
              {puzzle && (
                <>
                  {/* Status Message */}
                  <div className="mb-4 flex justify-center">
                    <div className={`p-4 rounded-lg ${
                      status === 'solved' ? 'bg-green-900/50 border-2 border-green-500' :
                      status === 'failed' ? 'bg-red-900/50 border-2 border-red-500' :
                      'bg-blue-900/50 border-2 border-blue-500'
                    }`} style={{ maxWidth: '600px', width: '100%' }}>
                      <div className="text-center font-semibold text-lg">
                      {message}
                      {ratingChange !== null && (
                        <span className={`ml-3 font-bold text-xl ${ratingChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {ratingChange > 0 ? '+' : ''}{ratingChange}
                        </span>
                      )}
                      </div>
                    </div>
                  </div>

                  {/* Chess Board */}
                  <div className="mb-4 flex justify-center">
                    <Chessboard
                      options={chessComOptions({
                        id: 'tactical-puzzle-board',
                        position: game.fen(),
                        allowDragging: status === 'playing',
                        onPieceDrop: ({ sourceSquare, targetSquare }) => {
                          if (!sourceSquare || !targetSquare) return false;
                          return onDrop(sourceSquare, targetSquare);
                        },
                        boardStyle: {
                          width: '600px',
                          height: '600px',
                          borderRadius: '8px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                        },
                      })}
                    />
                  </div>

                  

                  
                </>
              )}
              
              {!puzzle && !loading && (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">🧩</div>
                  <h3 className="text-2xl font-bold mb-4 text-white">No Puzzle Loaded</h3>
                  {message ? (
                    <div className={`mb-6 p-4 rounded-2xl max-w-md mx-auto backdrop-blur-xl border-2 ${
                      message.includes('Error') || message.includes('Failed') 
                        ? 'bg-red-900/30 border-red-500/50 text-red-200' 
                        : 'bg-white/[0.05] border-white/10'
                    }`}>
                      <p className="font-semibold text-lg">{message}</p>
                      <p className="text-sm mt-2 opacity-80">Check the browser console for more details</p>
                    </div>
                  ) : (
                    <p className="text-white/60 mb-6 text-lg">Select a difficulty level from the sidebar to start</p>
                  )}
                  <button
                    onClick={() => loadNewPuzzle()}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-2xl transition-all font-bold text-lg text-white shadow-[0_4px_14px_rgba(168,85,247,0.4)] active:scale-[0.97]"
                  >
                    🎯 Load Random Puzzle
                  </button>
                </div>
              )}
            </div>

            {/* Puzzle Stats */}
            {false && (
              <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-6 py-8 shadow-[0_14px_50px_rgba(0,0,0,0.45)] mt-6">
                <div className="text-[15px] font-semibold tracking-[0.22em] text-white/60 mb-2">PUZZLE INFO</div>
                <div className="h-px bg-white/10 my-4" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Rating</span>
                    <span className="font-semibold text-white">{puzzle.rating}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Times Played</span>
                    <span className="font-semibold text-white">{puzzle.nbPlays}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Times Solved</span>
                    <span className="font-semibold text-white">{puzzle.nbSolved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Success Rate</span>
                    <span className="font-semibold text-white">{puzzle.solutionRate.toFixed(1)}%</span>
                  </div>
                  
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Stats */}
          {stats && (
            <div className="flex-shrink-0 space-y-4" style={{ width: '384px' }}>
              {/* Puzzle Info */}
              {puzzle && (
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                  <div className="mb-3 flex justify-between items-center">
                    <span className="text-lg font-bold text-white">Puzzle #{puzzle.id}</span>
                    <span className="text-sm font-semibold text-white/60">
                      {puzzle.rating} rated
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/10">
                    <div>
                      <div className="text-white/60 text-xs font-semibold tracking-wider">TIME</div>
                      <div className="text-xl font-mono text-white mt-1">{formatTime(timeSpent)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/60 text-xs font-semibold tracking-wider">ATTEMPTS</div>
                      <div className="text-xl font-bold text-white mt-1">{attempts}</div>
                    </div>
                  </div>
                </div>
              )}
              
              
              
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs font-semibold tracking-wider">PUZZLE RATING</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.puzzleRating}</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs font-semibold tracking-wider">SOLVED</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.puzzlesSolved} / {stats.puzzlesAttempted}</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs font-semibold tracking-wider">ACCURACY</div>
                <div className="text-2xl font-bold text-white mt-1">{stats.accuracy}%</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs font-semibold tracking-wider">CURRENT STREAK</div>
                <div className="text-2xl font-bold text-white mt-1">🔥 {stats.currentStreak}</div>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                <div className="text-white/60 text-xs font-semibold tracking-wider">BEST STREAK</div>
                <div className="text-2xl font-bold text-white mt-1">⭐ {stats.bestStreak}</div>
              </div>
              {/* Action Buttons */}
              {puzzle && (
                <div className="backdrop-blur-xl rounded-2xl p-4" style={{marginTop: '10px'}}>
                  {status === 'playing' && (
                    <div className="flex gap-3">
                      <button
                        onClick={toggleHint}
                        className="btn-secondary flex-1"
                      >
                        💡 {showHint ? 'Hide Hint' : 'Show Hint'}
                      </button>
                      <button
                        onClick={giveUp}
                        className="btn-secondary flex-1"
                      >
                        ❌ Give Up
                      </button>
                    </div>
                  )}
                  
                  {status !== 'playing' && (
                    <button
                      onClick={() => loadNewPuzzle()}
                      className="btn-secondary w-full"
                    >
                      Next Puzzle →
                    </button>
                  )}
                  {/* Hint */}
                  {showHint && (
                    <div className="mb-4 p-4 bg-yellow-500/10 rounded-2xl backdrop-blur-xl">
                      <span className="text-lg">💡</span> <span className="text-white/90 font-medium">Hint: The first move starts from {puzzle.moves[moveIndex].substring(0, 2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
          )}

          

          
        </div>
      </div>
    </div>
  );
};

export default TacticalPuzzle;
