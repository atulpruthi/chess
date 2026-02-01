import { Chess } from 'chess.js';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export class SimpleChessAI {
  /**
   * Get a random legal move (for easy difficulty)
   */
  private getRandomMove(chess: Chess): string {
    const moves = chess.moves({ verbose: true });
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex].lan;
  }

  /**
   * Get a move with basic evaluation (captures, checks)
   */
  private getSmartMove(chess: Chess, depth: number = 2): string {
    const moves = chess.moves({ verbose: true });
    
    // Prioritize captures
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0 && Math.random() > 0.3) {
      return captures[Math.floor(Math.random() * captures.length)].lan;
    }

    // Prioritize checks
    const checks = moves.filter(m => {
      const testChess = new Chess(chess.fen());
      testChess.move(m.lan);
      return testChess.inCheck();
    });
    
    if (checks.length > 0 && Math.random() > 0.5) {
      return checks[Math.floor(Math.random() * checks.length)].lan;
    }

    // Otherwise pick randomly
    return moves[Math.floor(Math.random() * moves.length)].lan;
  }

  /**
   * Minimax evaluation (simplified)
   */
  private evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -1000 : 1000;
    }
    if (chess.isDraw() || chess.isStalemate()) {
      return 0;
    }

    let score = 0;
    const board = chess.board();
    
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0,
      'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 0
    };

    for (let row of board) {
      for (let square of row) {
        if (square) {
          const value = pieceValues[square.type] || 0;
          score += square.color === 'w' ? value : -value;
        }
      }
    }

    return score;
  }

  /**
   * Minimax with alpha-beta pruning
   */
  private minimax(
    chess: Chess,
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean
  ): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }

    const moves = chess.moves({ verbose: true });

    if (maximizingPlayer) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const testChess = new Chess(chess.fen());
        testChess.move(move.lan);
        const evalScore = this.minimax(testChess, depth - 1, alpha, beta, false);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const testChess = new Chess(chess.fen());
        testChess.move(move.lan);
        const evalScore = this.minimax(testChess, depth - 1, alpha, beta, true);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Get best move using minimax
   */
  private getBestMoveWithMinimax(chess: Chess, depth: number): string {
    const moves = chess.moves({ verbose: true });
    let bestMove = moves[0].lan;
    let bestValue = -Infinity;

    const isWhite = chess.turn() === 'w';

    for (const move of moves) {
      const testChess = new Chess(chess.fen());
      testChess.move(move.lan);
      const moveValue = this.minimax(
        testChess,
        depth - 1,
        -Infinity,
        Infinity,
        !isWhite
      );

      if ((isWhite && moveValue > bestValue) || (!isWhite && moveValue < bestValue)) {
        bestValue = moveValue;
        bestMove = move.lan;
      }
    }

    return bestMove;
  }

  /**
   * Get best move based on difficulty
   */
  async getBestMove(fen: string, difficulty: DifficultyLevel): Promise<string> {
    const chess = new Chess(fen);

    if (chess.isGameOver()) {
      throw new Error('Game is already over');
    }

    switch (difficulty) {
      case 'easy':
        // Random moves with occasional smart moves
        return Math.random() > 0.7 
          ? this.getSmartMove(chess, 1)
          : this.getRandomMove(chess);

      case 'medium':
        // Smart moves with some randomness
        return Math.random() > 0.3
          ? this.getBestMoveWithMinimax(chess, 2)
          : this.getSmartMove(chess, 2);

      case 'hard':
        // Minimax depth 3
        return this.getBestMoveWithMinimax(chess, 3);

      case 'expert':
        // Minimax depth 4
        return this.getBestMoveWithMinimax(chess, 4);

      default:
        return this.getSmartMove(chess, 2);
    }
  }
}

// Singleton instance
let aiInstance: SimpleChessAI | null = null;

export function getChessAI(): SimpleChessAI {
  if (!aiInstance) {
    aiInstance = new SimpleChessAI();
  }
  return aiInstance;
}
