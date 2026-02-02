import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { chessComOptions, responsiveBoardStyle } from '../styles/chessboardTheme';
import { appCenteredClass, appPageClass, buttonSecondaryClass } from '../styles/appTheme';

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

const GameReplay: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  
  const [game, setGame] = useState<Chess>(new Chess());
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [position, setPosition] = useState(game.fen());
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchGameData();
    }
  }, [gameId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    
    if (isPlaying && currentMoveIndex < moves.length - 1) {
      interval = setInterval(() => {
        goToMove(currentMoveIndex + 1);
      }, 1000); // Auto-advance every second
    } else if (currentMoveIndex >= moves.length - 1) {
      setIsPlaying(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, currentMoveIndex, moves.length]);

  const fetchGameData = async () => {
    try {
      setLoading(true);
      // In a real app, you'd fetch the game details from an API endpoint
      // For now, we'll need to add an endpoint to get game by ID
      
      // Placeholder: You'll need to implement this endpoint
      const response = await fetch(`http://localhost:5001/api/games/${gameId}`);
      
      if (response.ok) {
        const data = await response.json();
        setGameData(data);
        loadPGN(data.pgn);
      }
    } catch (error) {
      console.error('Error fetching game data:', error);
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
      
      for (let i = 0; i < history.length; i += 2) {
        movePairs.push({
          moveNumber: Math.floor(i / 2) + 1,
          white: history[i],
          black: history[i + 1],
        });
      }
      
      setMoves(movePairs);
      
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
    if (index < -1 || index >= moves.length) return;

    const tempGame = new Chess();
    
    // Replay moves up to the target index
    for (let i = 0; i <= index; i++) {
      const move = moves[i];
      if (move.white) tempGame.move(move.white);
      if (i === index && !move.black) break;
      if (move.black) tempGame.move(move.black);
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
    goToMove(moves.length - 1);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (currentMoveIndex >= moves.length - 1) {
      goToStart();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const getResultString = () => {
    if (!gameData) return '';
    
    if (gameData.result === 'white') return `1-0 • ${gameData.whiteUsername} wins`;
    if (gameData.result === 'black') return `0-1 • ${gameData.blackUsername} wins`;
    if (gameData.result === 'draw') return '½-½ • Draw';
    return 'Game in progress';
  };

  if (loading) {
    return (
      <div className={appCenteredClass}>
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className={appCenteredClass}>
        <div className="text-center">
          <div className="text-white text-xl mb-4">Game not found</div>
          <button
            onClick={() => navigate('/game-history')}
            className={`${buttonSecondaryClass} px-6 py-2`}
          >
            Back to Game History
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={appPageClass}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Game Replay</h1>
              <p className="text-gray-300">{getResultString()}</p>
            </div>
            <button
              onClick={() => navigate('/game-history')}
              className={`${buttonSecondaryClass} px-6 py-2`}
            >
              Back to History
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chessboard */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              {/* Player info - Black */}
              <div className="mb-4 flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                    {gameData.blackUsername[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{gameData.blackUsername}</div>
                    {gameData.blackRatingBefore && (
                      <div className="text-sm text-gray-400">Rating: {gameData.blackRatingBefore}</div>
                    )}
                  </div>
                </div>
                {game.turn() === 'b' && (
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              {/* Board */}
              <div className="mb-4">
                <Chessboard
                  options={chessComOptions({
                    id: 'game-replay-chessboard',
                    position,
                    allowDragging: false,
                    boardStyle: {
                      ...responsiveBoardStyle(620, 260),
                    },
                  })}
                />
              </div>

              {/* Player info - White */}
              <div className="mb-4 flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center text-white font-bold">
                    {gameData.whiteUsername[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-semibold">{gameData.whiteUsername}</div>
                    {gameData.whiteRatingBefore && (
                      <div className="text-sm text-gray-400">Rating: {gameData.whiteRatingBefore}</div>
                    )}
                  </div>
                </div>
                {game.turn() === 'w' && (
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={goToStart}
                  disabled={currentMoveIndex === -1}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ⏮️ Start
                </button>
                <button
                  onClick={goToPrevious}
                  disabled={currentMoveIndex === -1}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ◀️ Previous
                </button>
                <button
                  onClick={togglePlayPause}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentMoveIndex >= moves.length - 1}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ▶️
                </button>
                <button
                  onClick={goToEnd}
                  disabled={currentMoveIndex >= moves.length - 1}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  End ⏭️
                </button>
              </div>

              <div className="mt-4 text-center text-gray-400 text-sm">
                Move {currentMoveIndex + 1} of {moves.length}
              </div>
            </div>
          </div>

          {/* Move history */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 h-full">
              <h3 className="text-xl font-bold text-white mb-4">Moves</h3>
              
              <div className="space-y-1 max-h-[600px] overflow-y-auto">
                {moves.map((move, index) => (
                  <div
                    key={index}
                    onClick={() => goToMove(index)}
                    className={`p-2 rounded-lg cursor-pointer transition ${
                      index === currentMoveIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-semibold mr-2">{move.moveNumber}.</span>
                    <span className="mr-3">{move.white}</span>
                    {move.black && <span>{move.black}</span>}
                  </div>
                ))}
              </div>

              {/* Game info */}
              <div className="mt-6 pt-6 border-t border-white/10 space-y-2 text-sm">
                <div className="flex justify-between text-gray-300">
                  <span>Time Control:</span>
                  <span className="text-white capitalize">{gameData.timeControl || 'Custom'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Game Type:</span>
                  <span className="text-white">
                    {gameData.isRated ? '⭐ Rated' : 'Casual'}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Total Moves:</span>
                  <span className="text-white">{gameData.totalMoves}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Played on:</span>
                  <span className="text-white">
                    {new Date(gameData.completedAt).toLocaleDateString()}
                  </span>
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
