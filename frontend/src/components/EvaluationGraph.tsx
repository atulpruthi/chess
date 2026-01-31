import React, { useEffect, useRef } from 'react';

interface MoveData {
  moveNumber: number;
  evaluation: number;
  mateIn: number | null;
  classification: string;
}

interface EvaluationGraphProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onMoveClick: (index: number) => void;
}

const EvaluationGraph: React.FC<EvaluationGraphProps> = ({ moves, currentMoveIndex, onMoveClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || moves.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.fillRect(0, 0, width, height);

    // Calculate graph dimensions
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;

    // Normalize evaluations to fit in graph (-10 to +10 range)
    const maxEval = 10;
    const minEval = -10;

    const normalizeEval = (evaluation: number, mateIn: number | null): number => {
      if (mateIn !== null) {
        // Mate is shown at the extreme
        return mateIn > 0 ? maxEval : minEval;
      }
      // Clamp evaluation to range
      const eval_pawns = evaluation / 100;
      return Math.max(minEval, Math.min(maxEval, eval_pawns));
    };

    // Convert evaluation to Y coordinate
    const evalToY = (evaluation: number): number => {
      const normalized = (evaluation - minEval) / (maxEval - minEval);
      return padding + graphHeight - (normalized * graphHeight);
    };

    // Draw grid lines
    ctx.strokeStyle = '#374151'; // gray-700
    ctx.lineWidth = 1;

    // Horizontal grid lines (evaluation lines)
    for (let i = -10; i <= 10; i += 2) {
      const y = evalToY(i);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Labels
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(i > 0 ? `+${i}` : `${i}`, padding - 5, y + 4);
    }

    // Draw center line (evaluation 0)
    ctx.strokeStyle = '#6b7280'; // gray-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, evalToY(0));
    ctx.lineTo(width - padding, evalToY(0));
    ctx.stroke();

    // Draw evaluation line
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 2;
    ctx.beginPath();

    moves.forEach((move, index) => {
      const x = padding + (index / (moves.length - 1)) * graphWidth;
      const normalizedEval = normalizeEval(move.evaluation, move.mateIn);
      const y = evalToY(normalizedEval);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw points for special moves
    moves.forEach((move, index) => {
      const x = padding + (index / (moves.length - 1)) * graphWidth;
      const normalizedEval = normalizeEval(move.evaluation, move.mateIn);
      const y = evalToY(normalizedEval);

      // Color based on classification
      let color = '#6b7280'; // gray-500 default

      switch (move.classification) {
        case 'brilliant':
          color = '#22d3ee'; // cyan-400
          break;
        case 'great':
          color = '#4ade80'; // green-400
          break;
        case 'blunder':
          color = '#ef4444'; // red-400
          break;
        case 'mistake':
          color = '#fb923c'; // orange-400
          break;
        case 'inaccuracy':
          color = '#fbbf24'; // yellow-400
          break;
      }

      // Draw larger point for special moves
      if (move.classification !== 'good' && move.classification !== 'book') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }

      // Highlight current move
      if (index === currentMoveIndex) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    // Draw legend
    const legendX = width - padding - 150;
    const legendY = padding + 10;
    const legendItems = [
      { color: '#22d3ee', label: 'Brilliant' },
      { color: '#4ade80', label: 'Great' },
      { color: '#fbbf24', label: 'Inaccuracy' },
      { color: '#fb923c', label: 'Mistake' },
      { color: '#ef4444', label: 'Blunder' },
    ];

    legendItems.forEach((item, index) => {
      const y = legendY + index * 20;
      
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(legendX, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      ctx.fillStyle = '#e5e7eb'; // gray-200
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, legendX + 10, y + 4);
    });

  }, [moves, currentMoveIndex]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || moves.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;

    const padding = 40;
    const graphWidth = canvas.width - 2 * padding;

    // Find closest move
    const moveX = (x - padding) / graphWidth;
    const moveIndex = Math.round(moveX * (moves.length - 1));

    if (moveIndex >= 0 && moveIndex < moves.length) {
      onMoveClick(moveIndex);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-bold mb-2">Evaluation Graph</h3>
      <p className="text-gray-400 text-sm mb-4">
        Click on the graph to jump to a move. Positive = White advantage, Negative = Black advantage
      </p>
      <canvas
        ref={canvasRef}
        width={800}
        height={300}
        onClick={handleCanvasClick}
        className="w-full cursor-pointer border border-gray-700 rounded"
      />
    </div>
  );
};

export default EvaluationGraph;
