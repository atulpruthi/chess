import React from 'react';
import { Chessboard } from 'react-chessboard';

interface DisplayBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
}

const DisplayBoard: React.FC<DisplayBoardProps> = ({ fen, orientation = 'white' }) => {
  return (
    <Chessboard 
      position={fen} 
      boardOrientation={orientation}
      arePiecesDraggable={false}
      customBoardStyle={{
        borderRadius: '4px',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
      }}
    />
  );
};

export default DisplayBoard;
