import { spawn, ChildProcess } from 'child_process';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

interface StockfishConfig {
  depth?: number;
  skillLevel?: number;
  moveTime?: number;
}

export class StockfishService {
  private process: ChildProcess | null = null;
  private isReady = false;
  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Spawn Stockfish process
        this.process = spawn('stockfish');

        if (!this.process.stdout || !this.process.stderr) {
          reject(new Error('Failed to create Stockfish process streams'));
          return;
        }

        // Listen for ready signal
        this.process.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('uciok')) {
            this.isReady = true;
            resolve();
          }
        });

        this.process.stderr.on('data', (data: Buffer) => {
          console.error('Stockfish error:', data.toString());
        });

        this.process.on('error', (error) => {
          console.error('Stockfish process error:', error);
          reject(error);
        });

        // Initialize UCI mode
        this.sendCommand('uci');
      } catch (error) {
        reject(error);
      }
    });
  }

  private sendCommand(command: string): void {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(command + '\n');
    }
  }

  private async waitForReady(): Promise<void> {
    if (!this.isReady && this.readyPromise) {
      await this.readyPromise;
    }
  }

  private getDifficultyConfig(difficulty: DifficultyLevel): StockfishConfig {
    switch (difficulty) {
      case 'easy':
        return { skillLevel: 1, depth: 5, moveTime: 500 };
      case 'medium':
        return { skillLevel: 10, depth: 10, moveTime: 1000 };
      case 'hard':
        return { skillLevel: 15, depth: 15, moveTime: 2000 };
      case 'expert':
        return { skillLevel: 20, depth: 20, moveTime: 3000 };
      default:
        return { skillLevel: 10, depth: 10, moveTime: 1000 };
    }
  }

  async getBestMove(
    fen: string,
    difficulty: DifficultyLevel = 'medium'
  ): Promise<string> {
    await this.waitForReady();

    const config = this.getDifficultyConfig(difficulty);

    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdout) {
        reject(new Error('Stockfish process not available'));
        return;
      }

      let bestMove = '';

      const dataHandler = (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n');

        for (const line of lines) {
          if (line.startsWith('bestmove')) {
            const match = line.match(/bestmove (\w+)/);
            if (match) {
              bestMove = match[1];
              this.process?.stdout?.removeListener('data', dataHandler);
              resolve(bestMove);
            }
          }
        }
      };

      this.process.stdout.on('data', dataHandler);

      // Set position
      this.sendCommand(`position fen ${fen}`);

      // Configure skill level
      if (config.skillLevel !== undefined) {
        this.sendCommand(`setoption name Skill Level value ${config.skillLevel}`);
      }

      // Start analysis
      if (config.moveTime) {
        this.sendCommand(`go movetime ${config.moveTime}`);
      } else if (config.depth) {
        this.sendCommand(`go depth ${config.depth}`);
      }

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!bestMove) {
          this.process?.stdout?.removeListener('data', dataHandler);
          reject(new Error('Stockfish timeout'));
        }
      }, 10000);
    });
  }

  async evaluatePosition(fen: string, depth: number = 15): Promise<number> {
    await this.waitForReady();

    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdout) {
        reject(new Error('Stockfish process not available'));
        return;
      }

      let evaluation = 0;

      const dataHandler = (data: Buffer) => {
        const output = data.toString();
        const lines = output.split('\n');

        for (const line of lines) {
          // Look for evaluation score
          if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) {
              evaluation = parseInt(match[1], 10) / 100; // Convert centipawns to pawns
            }
          } else if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) {
              const mateIn = parseInt(match[1], 10);
              evaluation = mateIn > 0 ? 1000 : -1000; // Mate advantage
            }
          }

          if (line.startsWith('bestmove')) {
            this.process?.stdout?.removeListener('data', dataHandler);
            resolve(evaluation);
          }
        }
      };

      this.process.stdout.on('data', dataHandler);

      // Set position and analyze
      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${depth}`);

      // Timeout
      setTimeout(() => {
        this.process?.stdout?.removeListener('data', dataHandler);
        reject(new Error('Evaluation timeout'));
      }, 15000);
    });
  }

  terminate(): void {
    if (this.process) {
      this.sendCommand('quit');
      this.process.kill();
      this.process = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
let stockfishInstance: StockfishService | null = null;

export const getStockfishInstance = (): StockfishService => {
  if (!stockfishInstance) {
    stockfishInstance = new StockfishService();
  }
  return stockfishInstance;
};
