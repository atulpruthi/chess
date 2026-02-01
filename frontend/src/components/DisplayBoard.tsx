import React from 'react';
import { Chessboard } from 'react-chessboard';
import { chessComOptions, responsiveBoardStyle } from '../styles/chessboardTheme';

interface DisplayBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
}

const DisplayBoard: React.FC<DisplayBoardProps> = ({ fen, orientation = 'white' }) => {
  return (
    <Chessboard 
      options={chessComOptions({
        id: 'display-chessboard',
        position: fen,
        boardOrientation: orientation,
        allowDragging: false,
        showNotation: false,
        boardStyle: {
          ...responsiveBoardStyle(360, 260),
          borderRadius: '4px',
          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)',
        },
      })}
    />
  );
};

export default DisplayBoard;
