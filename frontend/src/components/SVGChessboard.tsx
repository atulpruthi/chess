/**
 * SVGChessboard – a fully SVG-based chess board that replaces react-chessboard.
 *
 * Accepts the same `options` prop shape used by the existing chessComOptions() calls
 * so it can be used as a drop-in replacement for <Chessboard options={...} />.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chess, type Square } from 'chess.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LIGHT_SQUARE = '#eeeed2';
const DARK_SQUARE = '#769656';
const LIGHT_COORD_COLOR = 'rgba(0,0,0,0.55)';
const DARK_COORD_COLOR = 'rgba(255,255,255,0.75)';
const PIECE_BASE_URL = 'https://lichess1.org/assets/piece/cburnett/';
const FILES = 'abcdefgh';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SVGChessboardOptions {
  id?: string;
  position?: string;
  boardOrientation?: 'white' | 'black';
  onPieceDrop?: (args: { sourceSquare: string; targetSquare: string }) => boolean;
  onSquareClick?: (args: { square: string }) => void;
  onSquareRightClick?: (args: { square: string }) => void;
  squareStyles?: Record<string, React.CSSProperties & { background?: string }>;
  customArrows?: Array<[string, string, string?]>;
  boardStyle?: React.CSSProperties;
  lightSquareStyle?: { backgroundColor?: string };
  darkSquareStyle?: { backgroundColor?: string };
  lightSquareNotationStyle?: { color?: string; fontSize?: string; fontWeight?: number | string };
  darkSquareNotationStyle?: { color?: string; fontSize?: string; fontWeight?: number | string };
  dropSquareStyle?: { boxShadow?: string; backgroundColor?: string };
  allowDragging?: boolean;
  showNotation?: boolean;
  showAnimations?: boolean;
  animationDurationInMs?: number;
}

export interface SVGChessboardProps {
  options: SVGChessboardOptions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPieceUrl(color: 'w' | 'b', type: string): string {
  return `${PIECE_BASE_URL}${color}${type.toUpperCase()}.svg`;
}

/**
 * Convert a square name (e.g. "e4") to SVG pixel top-left coordinates.
 * squareSize is the pixel size of one square.
 */
function squareToXY(
  square: string,
  squareSize: number,
  orientation: 'white' | 'black',
): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97; // 'a'=0 … 'h'=7
  const rank = parseInt(square[1], 10) - 1;  // '1'=0 … '8'=7
  const col = orientation === 'white' ? file : 7 - file;
  const row = orientation === 'white' ? 7 - rank : rank;
  return { x: col * squareSize, y: row * squareSize };
}

/**
 * Convert raw SVG pixel coords back to a square name, or '' if out of bounds.
 */
function xyToSquare(
  x: number,
  y: number,
  squareSize: number,
  orientation: 'white' | 'black',
): string {
  const col = Math.floor(x / squareSize);
  const row = Math.floor(y / squareSize);
  if (col < 0 || col > 7 || row < 0 || row > 7) return '';
  const file = orientation === 'white' ? col : 7 - col;
  const rank = orientation === 'white' ? 7 - row : row;
  return `${FILES[file]}${rank + 1}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SVGChessboard: React.FC<SVGChessboardProps> = ({ options }) => {
  const {
    position = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    boardOrientation = 'white',
    onPieceDrop,
    onSquareClick,
    onSquareRightClick,
    squareStyles = {},
    customArrows = [],
    boardStyle = {},
    lightSquareStyle = {},
    darkSquareStyle = {},
    lightSquareNotationStyle = {},
    darkSquareNotationStyle = {},
    allowDragging = true,
    showNotation = true,
  } = options;

  // ── Parse board position ──────────────────────────────────────────────────
  const chess = new Chess();
  try { chess.load(position); } catch { /* keep default */ }

  // Determine a reasonable SVG square size from boardStyle width/height.
  // The SVG uses viewBox="0 0 560 560" and is scaled by CSS width.
  const SQUARE_SIZE = 70;
  const BOARD_SIZE = SQUARE_SIZE * 8; // 560

  // ── Drag state ────────────────────────────────────────────────────────────
  const [dragState, setDragState] = useState<{
    square: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    dragging: boolean; // true once moved > threshold
  } | null>(null);
  const [dragOverSquare, setDragOverSquare] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // Convert a PointerEvent into SVG-viewBox coordinates
  const getSVGCoords = useCallback(
    (e: React.PointerEvent<SVGSVGElement> | PointerEvent): { x: number; y: number } => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const scaleX = BOARD_SIZE / rect.width;
      const scaleY = BOARD_SIZE / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [BOARD_SIZE],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) return; // only left button for drag
      const { x, y } = getSVGCoords(e);
      const square = xyToSquare(x, y, SQUARE_SIZE, boardOrientation);
      if (!square) return;
      const piece = chess.get(square as Square);
      if (!piece || !allowDragging) return;
      (e.target as Element).setPointerCapture(e.pointerId);
      setDragState({ square, startX: x, startY: y, currentX: x, currentY: y, dragging: false });
      e.preventDefault();
    },
    [allowDragging, boardOrientation, chess, getSVGCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState) return;
      const { x, y } = getSVGCoords(e);
      const moved =
        Math.abs(x - dragState.startX) > SQUARE_SIZE * 0.1 ||
        Math.abs(y - dragState.startY) > SQUARE_SIZE * 0.1;
      setDragState(prev =>
        prev ? { ...prev, currentX: x, currentY: y, dragging: prev.dragging || moved } : null,
      );
      const sq = xyToSquare(x, y, SQUARE_SIZE, boardOrientation);
      setDragOverSquare(sq || null);
      e.preventDefault();
    },
    [dragState, boardOrientation, getSVGCoords],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragState) return;
      const { x, y } = getSVGCoords(e);
      const targetSquare = xyToSquare(x, y, SQUARE_SIZE, boardOrientation);

      if (dragState.dragging && targetSquare && targetSquare !== dragState.square) {
        // Drag completed – attempt the move
        onPieceDrop?.({ sourceSquare: dragState.square, targetSquare });
      } else if (!dragState.dragging && targetSquare) {
        // No movement detected – treat as a click
        onSquareClick?.({ square: targetSquare });
      }

      setDragState(null);
      setDragOverSquare(null);
    },
    [dragState, boardOrientation, getSVGCoords, onPieceDrop, onSquareClick],
  );

  const handlePointerCancel = useCallback(() => {
    setDragState(null);
    setDragOverSquare(null);
  }, []);

  // Handle click on the SVG for non-drag interactions
  const handleSVGClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      // Handled via pointerUp – only fire if NOT the end of a drag
      // (pointerUp already called onSquareClick for click-like releases)
    },
    [],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = BOARD_SIZE / rect.width;
      const scaleY = BOARD_SIZE / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const square = xyToSquare(x, y, SQUARE_SIZE, boardOrientation);
      if (square) onSquareRightClick?.({ square });
    },
    [boardOrientation, BOARD_SIZE, onSquareRightClick],
  );

  // ── Board squares ─────────────────────────────────────────────────────────
  const squareElements: React.ReactNode[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const file = boardOrientation === 'white' ? col : 7 - col;
      const rank = boardOrientation === 'white' ? 7 - row : row;
      const squareName = `${FILES[file]}${rank + 1}`;
      const isLight = (file + rank) % 2 !== 0;

      const baseColor = isLight
        ? (lightSquareStyle?.backgroundColor ?? LIGHT_SQUARE)
        : (darkSquareStyle?.backgroundColor ?? DARK_SQUARE);

      const isDragOver = dragOverSquare === squareName && dragState?.dragging;

      // Solid-color square background
      squareElements.push(
        <rect
          key={`sq-${squareName}`}
          x={col * SQUARE_SIZE}
          y={row * SQUARE_SIZE}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          fill={baseColor}
        />,
      );

      // CSS-style overlay (handles gradients like moveDot/captureRing/selected)
      const customStyle = squareStyles[squareName];
      const overlayBg = customStyle?.background || customStyle?.backgroundColor;
      if (overlayBg) {
        // Use foreignObject so any CSS background (including radial-gradient) is supported
        squareElements.push(
          <foreignObject
            key={`ov-${squareName}`}
            x={col * SQUARE_SIZE}
            y={row * SQUARE_SIZE}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            style={{ pointerEvents: 'none' }}
          >
            <div
              // @ts-ignore – xmlns is required by foreignObject HTML body
              xmlns="http://www.w3.org/1999/xhtml"
              style={{ width: '100%', height: '100%', background: overlayBg }}
            />
          </foreignObject>,
        );
      }

      // Drop target highlight
      if (isDragOver) {
        squareElements.push(
          <rect
            key={`drop-${squareName}`}
            x={col * SQUARE_SIZE}
            y={row * SQUARE_SIZE}
            width={SQUARE_SIZE}
            height={SQUARE_SIZE}
            fill="none"
            stroke="rgba(20, 83, 45, 0.75)"
            strokeWidth={4}
            style={{ pointerEvents: 'none' }}
          />,
        );
      }

      // Coordinate notation
      if (showNotation) {
        const notationColor = isLight ? LIGHT_COORD_COLOR : DARK_COORD_COLOR;

        // Rank number – left column, at top-left of square
        if (col === 0) {
          squareElements.push(
            <text
              key={`coord-rank-${squareName}`}
              x={col * SQUARE_SIZE + 3}
              y={row * SQUARE_SIZE + 14}
              fill={lightSquareNotationStyle?.color ?? darkSquareNotationStyle?.color ?? notationColor}
              fontSize={12}
              fontWeight={600}
              fontFamily="sans-serif"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {rank + 1}
            </text>,
          );
        }

        // File letter – bottom row, at bottom-right of square
        if (row === 7) {
          squareElements.push(
            <text
              key={`coord-file-${squareName}`}
              x={col * SQUARE_SIZE + SQUARE_SIZE - 3}
              y={row * SQUARE_SIZE + SQUARE_SIZE - 3}
              fill={lightSquareNotationStyle?.color ?? darkSquareNotationStyle?.color ?? notationColor}
              fontSize={12}
              fontWeight={600}
              fontFamily="sans-serif"
              textAnchor="end"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {FILES[file]}
            </text>,
          );
        }
      }
    }
  }

  // ── Pieces ────────────────────────────────────────────────────────────────
  // chess.board() returns an 8×8 array where [0][0] = a8 (top-left for white)
  const boardData = chess.board();
  const pieceElements: React.ReactNode[] = [];

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = boardData[r][f];
      if (!piece) continue;
      // chess.board() rank index 0 = rank 8, index 7 = rank 1
      const rank = 8 - r; // 1–8
      const squareName = `${FILES[f]}${rank}`;
      if (dragState?.square === squareName) continue; // rendered as dragged piece

      const { x, y } = squareToXY(squareName, SQUARE_SIZE, boardOrientation);
      pieceElements.push(
        <image
          key={`piece-${squareName}`}
          href={getPieceUrl(piece.color, piece.type)}
          x={x}
          y={y}
          width={SQUARE_SIZE}
          height={SQUARE_SIZE}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        />,
      );
    }
  }

  // ── Arrows ────────────────────────────────────────────────────────────────
  const arrowElements: React.ReactNode[] = customArrows.map(([from, to, color = 'rgba(255,170,0,0.85)'], idx) => {
    const fp = squareToXY(from, SQUARE_SIZE, boardOrientation);
    const tp = squareToXY(to, SQUARE_SIZE, boardOrientation);
    const fCX = fp.x + SQUARE_SIZE / 2;
    const fCY = fp.y + SQUARE_SIZE / 2;
    const tCX = tp.x + SQUARE_SIZE / 2;
    const tCY = tp.y + SQUARE_SIZE / 2;
    const dx = tCX - fCX;
    const dy = tCY - fCY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;
    const shorten = SQUARE_SIZE * 0.28;
    const endX = tCX - (dx / len) * shorten;
    const endY = tCY - (dy / len) * shorten;
    const markerId = `arrowhead-${idx}`;

    return (
      <g key={`arrow-${idx}`} style={{ pointerEvents: 'none' }}>
        <defs>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <polygon points="0 0, 6 3, 0 6" fill={color} />
          </marker>
        </defs>
        <line
          x1={fCX}
          y1={fCY}
          x2={endX}
          y2={endY}
          stroke={color}
          strokeWidth={SQUARE_SIZE * 0.17}
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </g>
    );
  });

  // ── Dragged piece (rendered last – on top of everything) ──────────────────
  const draggedPieceEl = (() => {
    if (!dragState?.dragging) return null;
    const piece = chess.get(dragState.square as Square);
    if (!piece) return null;
    return (
      <image
        href={getPieceUrl(piece.color, piece.type)}
        x={dragState.currentX - SQUARE_SIZE / 2}
        y={dragState.currentY - SQUARE_SIZE / 2}
        width={SQUARE_SIZE}
        height={SQUARE_SIZE}
        style={{ pointerEvents: 'none', userSelect: 'none', opacity: 0.92 }}
      />
    );
  })();

  // ── Board border & shadow via wrapper ─────────────────────────────────────
  const wrapperStyle: React.CSSProperties = {
    display: 'inline-block',
    borderRadius: boardStyle?.borderRadius ?? '8px',
    boxShadow: boardStyle?.boxShadow ?? '0 10px 30px rgba(0,0,0,0.35)',
    border: boardStyle?.border ?? '1px solid rgba(0,0,0,0.20)',
    overflow: 'hidden',
    lineHeight: 0,
    width: boardStyle?.width ?? '100%',
    height: boardStyle?.height,
    maxWidth: '100%',
    flexShrink: 0,
  };

  return (
    <div style={wrapperStyle}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
        width="100%"
        height="100%"
        style={{ display: 'block', touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={handleContextMenu}
      >
        {/* 1. Squares (with overlay highlights) */}
        {squareElements}

        {/* 2. Pieces (static) */}
        {pieceElements}

        {/* 3. Arrows */}
        {arrowElements}

        {/* 4. Dragged piece (always on top) */}
        {draggedPieceEl}
      </svg>
    </div>
  );
};

export default SVGChessboard;
