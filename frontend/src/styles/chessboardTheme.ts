import type { ChessboardOptions } from 'react-chessboard';

const LIGHT_SQUARE = '#eeeed2'; // chess.com-like
const DARK_SQUARE = '#769656';

const LIGHT_COORD = 'rgba(0, 0, 0, 0.55)';
const DARK_COORD = 'rgba(255, 255, 255, 0.75)';

const baseTheme: Partial<ChessboardOptions> = {
  lightSquareStyle: { backgroundColor: LIGHT_SQUARE },
  darkSquareStyle: { backgroundColor: DARK_SQUARE },

  showNotation: true,
  lightSquareNotationStyle: {
    color: LIGHT_COORD,
    fontSize: '12px',
    fontWeight: 600,
  },
  darkSquareNotationStyle: {
    color: DARK_COORD,
    fontSize: '12px',
    fontWeight: 600,
  },

  dropSquareStyle: {
    boxShadow: 'inset 0 0 0 3px rgba(20, 83, 45, 0.65)',
  },

  boardStyle: {
    borderRadius: '8px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
    border: '1px solid rgba(0, 0, 0, 0.20)',
  },

  showAnimations: true,
  animationDurationInMs: 180,
};

export function chessComOptions(options: ChessboardOptions): ChessboardOptions {
  return {
    ...baseTheme,
    ...options,
    boardStyle: {
      ...(baseTheme.boardStyle ?? {}),
      ...(options.boardStyle ?? {}),
    },
    lightSquareStyle: {
      ...(baseTheme.lightSquareStyle ?? {}),
      ...(options.lightSquareStyle ?? {}),
    },
    darkSquareStyle: {
      ...(baseTheme.darkSquareStyle ?? {}),
      ...(options.darkSquareStyle ?? {}),
    },
    lightSquareNotationStyle: {
      ...(baseTheme.lightSquareNotationStyle ?? {}),
      ...(options.lightSquareNotationStyle ?? {}),
    },
    darkSquareNotationStyle: {
      ...(baseTheme.darkSquareNotationStyle ?? {}),
      ...(options.darkSquareNotationStyle ?? {}),
    },
    dropSquareStyle: {
      ...(baseTheme.dropSquareStyle ?? {}),
      ...(options.dropSquareStyle ?? {}),
    },
  };
}

export const chessComHighlight = {
  selected: 'rgba(246, 246, 105, 0.65)',
  rightClick: 'rgba(220, 38, 38, 0.45)',
  moveDot: 'radial-gradient(circle, rgba(0, 0, 0, 0.25) 20%, transparent 22%)',
  captureRing:
    'radial-gradient(circle, transparent 0%, transparent 70%, rgba(0, 0, 0, 0.28) 72%, rgba(0, 0, 0, 0.28) 84%, transparent 86%)',
};

export function responsiveBoardStyle(
  maxPx = 560,
  viewportPaddingPx = 220,
): React.CSSProperties {
  return {
    width: `min(92vw, calc(100vh - ${viewportPaddingPx}px), ${maxPx}px)`,
  };
}
