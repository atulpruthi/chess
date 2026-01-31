import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import DisplayBoard from './DisplayBoard';
import EvaluationGraph from './EvaluationGraph';

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
  classification: 'brilliant' | 'great' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';
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
  const [analysis, setAnalysis] = useState<GameAnalysisData | null>(null);
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [chess] = useState(new Chess());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCommentary, setShowCommentary] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedMoveNumber, setSelectedMoveNumber] = useState<number | null>(null);

  useEffect(() => {
    loadAnalysis();
    loadCommentaries();
  }, [gameId]);

  useEffect(() => {
    if (analysis && analysis.moves.length > 0) {
      chess.reset();
      // Play all moves up to current index
      for (let i = 0; i <= currentMoveIndex; i++) {
        chess.move(analysis.moves[i].moveUci);
      }
    }
  }, [currentMoveIndex, analysis]);

  const loadAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/analysis/games/${gameId}/analysis`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else if (response.status === 404) {
        // No analysis found, show option to analyze
        setAnalysis(null);
      }
    } catch (error) {
      console.error('Error loading analysis:', error);
    }
  };

  const loadCommentaries = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/analysis/games/${gameId}/commentaries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCommentaries(data);
      }
    } catch (error) {
      console.error('Error loading commentaries:', error);
    }
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/analysis/games/${gameId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ depth: 20 })
      });

      if (response.ok) {
        await loadAnalysis();
      } else {
        alert('Failed to analyze game');
      }
    } catch (error) {
      console.error('Error analyzing game:', error);
      alert('Error analyzing game');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCommentary = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/analysis/games/${gameId}/commentary`, {
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
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:3000/api/analysis/commentaries/${commentaryId}/like`, {
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

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'brilliant': return 'text-cyan-400';
      case 'great': return 'text-green-400';
      case 'good': return 'text-blue-400';
      case 'inaccuracy': return 'text-yellow-400';
      case 'mistake': return 'text-orange-400';
      case 'blunder': return 'text-red-400';
      case 'book': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case 'brilliant': return '!!';
      case 'great': return '!';
      case 'good': return '';
      case 'inaccuracy': return '?!';
      case 'mistake': return '?';
      case 'blunder': return '??';
      case 'book': return '📖';
      default: return '';
    }
  };

  const getEvaluationDisplay = (evaluation: number, mateIn: number | null) => {
    if (mateIn !== null) {
      return `M${mateIn > 0 ? mateIn : -mateIn}`;
    }
    const eval_pawns = evaluation / 100;
    return eval_pawns >= 0 ? `+${eval_pawns.toFixed(2)}` : eval_pawns.toFixed(2);
  };

  if (!analysis && !isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/game-history')}
            className="mb-4 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            ← Back to History
          </button>
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Analysis Available</h2>
            <p className="text-gray-400 mb-6">
              This game hasn't been analyzed yet. Click below to start computer analysis.
            </p>
            <button
              onClick={startAnalysis}
              className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-bold"
            >
              Start Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">Analyzing Game...</h2>
          <p className="text-gray-400 mt-2">This may take a few moments</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const currentMove = analysis.moves[currentMoveIndex];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/game-history')}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">Game Analysis</h1>
          <button
            onClick={() => setShowCommentary(!showCommentary)}
            className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
          >
            {showCommentary ? 'Hide' : 'Show'} Commentary
          </button>
        </div>

        {/* Opening Info */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">{analysis.openingName}</h3>
              <p className="text-gray-400">{analysis.openingEco}</p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.accuracyWhite.toFixed(1)}%</div>
                <div className="text-gray-400">White Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{analysis.accuracyBlack.toFixed(1)}%</div>
                <div className="text-gray-400">Black Accuracy</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Board and Controls */}
          <div className="lg:col-span-2">
            {/* Evaluation Graph */}
            <div className="mb-4">
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
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <DisplayBoard 
                fen={chess.fen()} 
                orientation="white" 
              />
            </div>

            {/* Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-center items-center gap-4 mb-4">
                <button
                  onClick={() => setCurrentMoveIndex(0)}
                  disabled={currentMoveIndex === 0}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  ⏮️ Start
                </button>
                <button
                  onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
                  disabled={currentMoveIndex === 0}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  ◀️ Previous
                </button>
                <button
                  onClick={() => setCurrentMoveIndex(Math.min(analysis.moves.length - 1, currentMoveIndex + 1))}
                  disabled={currentMoveIndex === analysis.moves.length - 1}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  Next ▶️
                </button>
                <button
                  onClick={() => setCurrentMoveIndex(analysis.moves.length - 1)}
                  disabled={currentMoveIndex === analysis.moves.length - 1}
                  className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
                >
                  End ⏭️
                </button>
              </div>

              {/* Current Move Info */}
              {currentMove && (
                <div className="bg-gray-700 rounded p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xl font-bold">
                      {currentMove.moveNumber}. {currentMove.moveSan}
                      <span className={`ml-2 ${getClassificationColor(currentMove.classification)}`}>
                        {getClassificationIcon(currentMove.classification)}
                      </span>
                    </span>
                    <span className={currentMove.evaluation >= 0 ? 'text-white' : 'text-white'}>
                      {getEvaluationDisplay(currentMove.evaluation, currentMove.mateIn)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Classification:</span>
                      <span className={`ml-2 font-bold ${getClassificationColor(currentMove.classification)}`}>
                        {currentMove.classification.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">CP Loss:</span>
                      <span className="ml-2">{currentMove.centipawnLoss}</span>
                    </div>
                    {currentMove.bestMoveSan && (
                      <div>
                        <span className="text-gray-400">Best Move:</span>
                        <span className="ml-2 font-mono">{currentMove.bestMoveSan}</span>
                      </div>
                    )}
                    {currentMove.isForced && (
                      <div>
                        <span className="text-yellow-400">⚡ Forced Move</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Moves List */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">Move List</h3>
            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {analysis.moves.map((move, index) => (
                <div
                  key={move.id}
                  onClick={() => setCurrentMoveIndex(index)}
                  className={`p-2 rounded cursor-pointer ${
                    index === currentMoveIndex ? 'bg-blue-600' : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono">
                      {move.moveNumber}. {move.moveSan}
                      <span className={`ml-2 ${getClassificationColor(move.classification)}`}>
                        {getClassificationIcon(move.classification)}
                      </span>
                    </span>
                    <span className="text-sm">
                      {getEvaluationDisplay(move.evaluation, move.mateIn)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commentary Section */}
        {showCommentary && (
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
                        {comment.commentaryType.toUpperCase()}
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
      </div>
    </div>
  );
};

export default GameAnalysis;
