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
  private queue: Promise<void> = Promise.resolve();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    console.log('Initializing Stockfish service...');
    this.readyPromise = new Promise((resolve, reject) => {
      try {
        // Spawn Stockfish process
        this.process = spawn('stockfish');

        if (!this.process.stdout || !this.process.stderr) {
          const error = new Error('Failed to create Stockfish process streams');
          console.error(error.message);
          reject(error);
          return;
        }

        console.log('Stockfish process spawned, waiting for UCI...');

        // Listen for ready signal
        this.process.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('uciok')) {
            console.log('✅ Stockfish initialized successfully');
            this.isReady = true;
            resolve();
          }
        });

        this.process.stderr.on('data', (data: Buffer) => {
          console.error('Stockfish error:', data.toString());
        });

        this.process.on('error', (error) => {
          console.error('❌ Stockfish process error:', error);
          reject(error);
        });

        this.process.on('exit', (code) => {
          console.log(`Stockfish process exited with code ${code}`);
          this.isReady = false;
        });

        // Initialize UCI mode
        this.sendCommand('uci');

        // Timeout for initialization
        setTimeout(() => {
          if (!this.isReady) {
            const error = new Error('Stockfish initialization timeout');
            console.error(error.message);
            reject(error);
          }
        }, 5000);
      } catch (error) {
        console.error('Failed to initialize Stockfish:', error);
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

  private waitForEngineReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.process.stdout) {
        reject(new Error('Stockfish process not available'));
        return;
      }

      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        this.process?.stdout?.removeListener('data', dataHandler);
      };

      const dataHandler = (data: Buffer) => {
        const output = data.toString();
        if (output.includes('readyok')) {
          cleanup();
          resolve();
        }
      };

      this.process.stdout.on('data', dataHandler);
      this.sendCommand('isready');

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Stockfish ready timeout'));
      }, 5000);
    });
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(() => undefined, () => undefined);
    return run;
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
    return this.enqueue(async () => {
      await this.waitForReady();
      await this.waitForEngineReady();

      const config = this.getDifficultyConfig(difficulty);

      return new Promise((resolve, reject) => {
        if (!this.process || !this.process.stdout) {
          reject(new Error('Stockfish process not available'));
          return;
        }

        let bestMove = '';
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          if (this.process?.stdout) {
            this.process.stdout.removeListener('data', dataHandler);
          }
        };

        const dataHandler = (data: Buffer) => {
          const output = data.toString();
          const lines = output.split('\n');

          for (const line of lines) {
            if (line.startsWith('bestmove')) {
              const match = line.match(/bestmove (\w+)/);
              if (match) {
                bestMove = match[1];
                cleanup();
                resolve(bestMove);
                return;
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

        // Timeout after 15 seconds (giving extra time beyond moveTime)
        timeoutId = setTimeout(() => {
          cleanup();
          const error = new Error(`Stockfish timeout after 15s (difficulty: ${difficulty})`);
          console.error(error.message);
          reject(error);
        }, 15000);
      });
    });
  }

  async evaluatePosition(fen: string, depth: number = 15): Promise<{
    evaluation: number;
    mateIn: number | null;
    bestMove: string | null;
    isForced: boolean;
  }> {
    return this.enqueue(async () => {
      await this.waitForReady();
      await this.waitForEngineReady();

      return new Promise((resolve, reject) => {
        if (!this.process || !this.process.stdout) {
          reject(new Error('Stockfish process not available'));
          return;
        }

        let evaluation = 0;
        let mateIn: number | null = null;
        let bestMove: string | null = null;
        let legalMoves = 0;
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          this.process?.stdout?.removeListener('data', dataHandler);
        };

        const dataHandler = (data: Buffer) => {
          const output = data.toString();
          const lines = output.split('\n');

          for (const line of lines) {
            // Count legal moves to determine if position is forced
            if (line.includes('info depth 1') && line.includes('multipv 1')) {
              const movesMatch = line.match(/nodes (\d+)/);
              if (movesMatch) {
                legalMoves = parseInt(movesMatch[1], 10);
              }
            }

            // Look for evaluation score
            if (line.includes('score cp')) {
              const match = line.match(/score cp (-?\d+)/);
              if (match) {
                evaluation = parseInt(match[1], 10); // Keep in centipawns
              }
            } else if (line.includes('score mate')) {
              const match = line.match(/score mate (-?\d+)/);
              if (match) {
                mateIn = parseInt(match[1], 10);
                evaluation = mateIn > 0 ? 100000 : -100000; // Large value for mate
              }
            }

            // Get best move
            if (line.startsWith('bestmove')) {
              const match = line.match(/bestmove (\w+)/);
              if (match) {
                bestMove = match[1];
              }
              cleanup();
              resolve({
                evaluation,
                mateIn,
                bestMove,
                isForced: legalMoves <= 1,
              });
            }
          }
        };

        this.process.stdout.on('data', dataHandler);

        // Set position and analyze
        this.sendCommand(`position fen ${fen}`);
        this.sendCommand(`go depth ${depth}`);

        // Timeout
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error('Evaluation timeout'));
        }, 30000);
      });
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
