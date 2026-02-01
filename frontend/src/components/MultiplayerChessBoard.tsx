import React, { useState, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { type Square } from 'chess.js';
import { useMultiplayerGameStore } from '../store/multiplayerGameStore';
import { chessComHighlight, chessComOptions, responsiveBoardStyle } from '../styles/chessboardTheme';

export const MultiplayerChessBoard: React.FC = () => {
  const {
    fen,
    chess,
    makeMove,
    isCheck,
    playerColor,
    promotionSquare,
    setPromotionSquare,
    promoteAndMove,
    turn,
    opponentDisconnected,
  } = useMultiplayerGameStore() as any;

  const [moveFrom, setMoveFrom] = useState<string>('');
  const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, any>>({});
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

  useEffect(() => {
    setMoveFrom('');
    setOptionSquares({});
  }, [fen]);

  const getMoveOptions = (square: Square) => {
    const moves = chess.moves({
      square,
      verbose: true,
    });

    if (moves.length === 0) {
      return {};
    }

    const newSquares: Record<string, any> = {};
    moves.forEach((move: any) => {
      newSquares[move.to] = {
        background:
          chess.get(move.to) &&
          chess.get(move.to).color !== chess.get(square).color
            ? chessComHighlight.captureRing
            : chessComHighlight.moveDot,
        borderRadius: '50%',
      };
    });

    newSquares[square] = {
      background: chessComHighlight.selected,
    };

    return newSquares;
  };

  const onSquareClick = (square: Square) => {
    // Check if it's player's turn
    if ((playerColor === 'white' && turn !== 'w') || (playerColor === 'black' && turn !== 'b')) {
      return;
    }

    if (!moveFrom) {
      const moves = getMoveOptions(square);
      if (Object.keys(moves).length !== 0) {
        setMoveFrom(square);
        setOptionSquares(moves);
      }
      return;
    }

    // Check for pawn promotion
    const piece = chess.get(moveFrom);
    if (
      piece?.type === 'p' &&
      ((piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1'))
    ) {
      setPromotionSquare(moveFrom, square);
      return;
    }

    makeMove({ from: moveFrom, to: square });
    setMoveFrom('');
    setOptionSquares({});
  };

  const onPieceDrop = (sourceSquare: Square, targetSquare: Square) => {
    // Check if it's player's turn
    if ((playerColor === 'white' && turn !== 'w') || (playerColor === 'black' && turn !== 'b')) {
      return false;
    }

    // Check for pawn promotion
    const piece = chess.get(sourceSquare);
    if (
      piece?.type === 'p' &&
      ((piece.color === 'w' && targetSquare[1] === '8') ||
        (piece.color === 'b' && targetSquare[1] === '1'))
    ) {
      setPromotionSquare(sourceSquare, targetSquare);
      return false;
    }

    makeMove({ from: sourceSquare, to: targetSquare });
    return true;
  };

  const onSquareRightClick = (square: Square) => {
    const color = chessComHighlight.rightClick;
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]:
        rightClickedSquares[square]?.backgroundColor === color
          ? undefined
          : { backgroundColor: color },
    });
  };

  const handlePromotion = (piece: string) => {
    if (promotionSquare?.from && promotionSquare?.to) {
      promoteAndMove(promotionSquare.from, promotionSquare.to, piece);
    }
  };

  const isMyTurn = (playerColor === 'white' && turn === 'w') || (playerColor === 'black' && turn === 'b');

  return (
    <div className="relative">
      <Chessboard
        options={chessComOptions({
          id: 'multiplayer-chessboard',
          position: fen,
          onPieceDrop: ({ sourceSquare, targetSquare }) =>
            onPieceDrop(sourceSquare as Square, targetSquare as Square),
          onSquareClick: ({ square }) => onSquareClick(square as Square),
          onSquareRightClick: ({ square }) => onSquareRightClick(square as Square),
          boardOrientation: playerColor || 'white',
          squareStyles: {
            ...optionSquares,
            ...rightClickedSquares,
          },
          boardStyle: {
            ...responsiveBoardStyle(560, 260),
          },
          allowDragging: isMyTurn && !opponentDisconnected,
        })}
      />

      {/* Check indicator */}
      {isCheck && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg animate-pulse">
          Check!
        </div>
      )}

      {/* Turn indicator */}
      {!isMyTurn && !opponentDisconnected && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg">
          Opponent's turn...
        </div>
      )}

      {/* Opponent disconnected */}
      {opponentDisconnected && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-6 py-4 rounded-lg font-bold shadow-xl">
          Opponent disconnected
        </div>
      )}

      {/* Promotion Dialog */}
      {promotionSquare && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
            <h3 className="text-white text-xl font-bold mb-4 text-center">
              Choose Promotion Piece
            </h3>
            <div className="flex gap-4">
              {['q', 'r', 'b', 'n'].map((piece) => (
                <button
                  key={piece}
                  onClick={() => handlePromotion(piece)}
                  className="w-16 h-16 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center text-4xl transition-colors"
                >
                  {playerColor === 'white'
                    ? { q: '♕', r: '♖', b: '♗', n: '♘' }[piece]
                    : { q: '♛', r: '♜', b: '♝', n: '♞' }[piece]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
