import { useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore, PieceSymbol } from '../store/gameStore';
import { Square } from 'chess.js';

export default function ChessBoard() {
  const {
    fen,
    makeMove,
    chess,
    currentTurn,
    isCheck,
    promotionSquare,
    setPromotionSquare,
    promoteAndMove,
  } = useGameStore();

  const [moveFrom, setMoveFrom] = useState<Square | null>(null);
  const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, any>>({});
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  const getMoveOptions = (square: Square) => {
    const moves = chess.moves({
      square,
      verbose: true,
    });

    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, any> = {};
    moves.forEach(move => {
      newSquares[move.to] = {
        background:
          chess.get(move.to as Square) &&
          chess.get(move.to as Square).color !== chess.get(square).color
            ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%',
      };
    });

    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)',
    };

    setOptionSquares(newSquares);
    return true;
  };

  const onSquareClick = (square: Square) => {
    setRightClickedSquares({});

    // If no piece is selected, select the piece
    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) {
        setMoveFrom(square);
      }
      return;
    }

    // Check if it's a pawn promotion
    const piece = chess.get(moveFrom);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && square[1] === '8') || (piece.color === 'b' && square[1] === '1'));

    if (isPromotion) {
      setPromotionSquare(square);
      return;
    }

    // Try to make the move
    const moveMade = makeMove(moveFrom, square);

    if (moveMade) {
      setMoveFrom(null);
      setOptionSquares({});
    } else {
      // If move failed, try to select the new square
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : null);
    }
  };

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square) => {
    setRightClickedSquares({});

    // Check if it's a pawn promotion
    const piece = chess.get(sourceSquare);
    const isPromotion =
      piece?.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'));

    if (isPromotion) {
      setMoveFrom(sourceSquare);
      setPromotionSquare(targetSquare);
      return false;
    }

    const move = makeMove(sourceSquare, targetSquare);
    setMoveFrom(null);
    setOptionSquares({});
    return move;
  };

  const onSquareRightClick = (square: Square) => {
    const color = 'rgba(0, 0, 255, 0.4)';
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square]?.backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    });
  };

  const handlePromotion = (piece: PieceSymbol) => {
    if (moveFrom && promotionSquare) {
      promoteAndMove(moveFrom, promotionSquare, piece);
      setMoveFrom(null);
      setOptionSquares({});
    }
  };

  return (
    <div className="relative">
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onSquareRightClick={onSquareRightClick}
        customSquareStyles={{
          ...optionSquares,
          ...rightClickedSquares,
        }}
        boardWidth={560}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        }}
      />

      {/* Promotion Dialog */}
      {promotionSquare && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Choose Promotion Piece</h3>
            <div className="flex gap-4">
              {['q', 'r', 'b', 'n'].map(piece => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece as PieceSymbol)}
                  className="w-16 h-16 text-4xl hover:bg-gray-100 rounded-lg transition-colors border-2 border-gray-300 hover:border-blue-500"
                >
                  {currentTurn === 'w'
                    ? { q: '♕', r: '♖', b: '♗', n: '♘' }[piece]
                    : { q: '♛', r: '♜', b: '♝', n: '♞' }[piece]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Check indicator */}
      {isCheck && !promotionSquare && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg font-semibold">
          Check!
        </div>
      )}
    </div>
  );
}
