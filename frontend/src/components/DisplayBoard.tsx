import React from 'react';
import { Chessboard } from 'react-chessboard';
import { chessComOptions } from '../styles/chessboardTheme';

interface DisplayBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  moveSquare?: string;
  classification?: string;
}

const ClassificationBadge: React.FC<{ classification: string }> = ({ classification }) => {
  const getClassificationSVG = (type: string) => {
    const svgBase = {
      viewBox: "0 0 40 40",
      width: "40",
      height: "40"
    };

    switch (type) {
      case 'brilliant':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#22d3ee" stroke="#0e7490" strokeWidth="2"/>
            <text x="20" y="28" fontSize="20" fontWeight="bold" fill="white" textAnchor="middle">!!</text>
          </svg>
        );
      case 'great':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#4ade80" stroke="#166534" strokeWidth="2"/>
            <text x="20" y="28" fontSize="24" fontWeight="bold" fill="white" textAnchor="middle">!</text>
          </svg>
        );
      case 'best':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#10b981" stroke="#065f46" strokeWidth="2"/>
            {/* Upward arrow */}
            <path d="M 20 10 L 14 18 L 17 18 L 17 28 L 23 28 L 23 18 L 26 18 Z" fill="white" stroke="white" strokeWidth="1" strokeLinejoin="round"/>
          </svg>
        );
      case 'good':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#60a5fa" stroke="#1e40af" strokeWidth="2"/>
            <path d="M 12 20 L 17 26 L 28 14" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'sacrifice':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#ec4899" stroke="#be185d" strokeWidth="2"/>
            {/* Crossed swords */}
            <g transform="rotate(-45 20 20)">
              <rect x="18" y="10" width="4" height="18" fill="white" rx="1"/>
              <circle cx="20" cy="28" r="2" fill="white"/>
            </g>
            <g transform="rotate(45 20 20)">
              <rect x="18" y="10" width="4" height="18" fill="white" rx="1"/>
              <circle cx="20" cy="28" r="2" fill="white"/>
            </g>
          </svg>
        );
      case 'inaccuracy':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#fbbf24" stroke="#b45309" strokeWidth="2"/>
            <text x="20" y="28" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">?!</text>
          </svg>
        );
      case 'mistake':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#fb923c" stroke="#9a3412" strokeWidth="2"/>
            <text x="20" y="28" fontSize="24" fontWeight="bold" fill="white" textAnchor="middle">?</text>
          </svg>
        );
      case 'blunder':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#f87171" stroke="#991b1b" strokeWidth="2"/>
            <text x="20" y="28" fontSize="18" fontWeight="bold" fill="white" textAnchor="middle">??</text>
          </svg>
        );
      case 'book':
        return (
          <svg {...svgBase}>
            <circle cx="20" cy="20" r="18" fill="#c084fc" stroke="#6b21a8" strokeWidth="2"/>
            <text x="20" y="28" fontSize="20" fill="white" textAnchor="middle">📖</text>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
    }}>
      {getClassificationSVG(classification)}
    </div>
  );
};

const DisplayBoard: React.FC<DisplayBoardProps> = ({ fen, orientation = 'white', moveSquare, classification }) => {
  const boardSize = 700;
  
  // Calculate badge position based on square notation
  const getBadgePosition = (square: string, boardOrientation: 'white' | 'black') => {
    if (!square || square.length !== 2) return null;
    
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0); // 0-7
    const rank = parseInt(square[1]) - 1; // 0-7
    
    // For white orientation: a1 is bottom-left
    // For black orientation: a1 is top-right
    const filePercent = boardOrientation === 'white' ? file * 12.5 : (7 - file) * 12.5;
    const rankPercent = boardOrientation === 'white' ? (7 - rank) * 12.5 : rank * 12.5;
    
    return { left: `${filePercent}%`, top: `${rankPercent}%` };
  };
  
  const badgePosition = moveSquare ? getBadgePosition(moveSquare, orientation) : null;
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Chessboard 
        options={chessComOptions({
          id: 'display-chessboard',
          position: fen,
          boardOrientation: orientation,
          allowDragging: false,
          showNotation: true,
          boardStyle: {
            width: `${boardSize}px`,
            height: `${boardSize}px`,
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
          },
        })}
      />
      {badgePosition && classification && (
        <div style={{
          position: 'absolute',
          ...badgePosition,
          width: '12.5%',
          height: '12.5%',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          padding: '4px',
          zIndex: 100
        }}>
          <ClassificationBadge classification={classification} />
        </div>
      )}
    </div>
  );
};

export default DisplayBoard;
