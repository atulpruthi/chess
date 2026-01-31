"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStockfishInstance = exports.StockfishService = void 0;
const child_process_1 = require("child_process");
class StockfishService {
    constructor() {
        this.process = null;
        this.isReady = false;
        this.readyPromise = null;
        this.initialize();
    }
    initialize() {
        this.readyPromise = new Promise((resolve, reject) => {
            try {
                // Spawn Stockfish process
                this.process = (0, child_process_1.spawn)('stockfish');
                if (!this.process.stdout || !this.process.stderr) {
                    reject(new Error('Failed to create Stockfish process streams'));
                    return;
                }
                // Listen for ready signal
                this.process.stdout.on('data', (data) => {
                    const output = data.toString();
                    if (output.includes('uciok')) {
                        this.isReady = true;
                        resolve();
                    }
                });
                this.process.stderr.on('data', (data) => {
                    console.error('Stockfish error:', data.toString());
                });
                this.process.on('error', (error) => {
                    console.error('Stockfish process error:', error);
                    reject(error);
                });
                // Initialize UCI mode
                this.sendCommand('uci');
            }
            catch (error) {
                reject(error);
            }
        });
    }
    sendCommand(command) {
        if (this.process && this.process.stdin) {
            this.process.stdin.write(command + '\n');
        }
    }
    async waitForReady() {
        if (!this.isReady && this.readyPromise) {
            await this.readyPromise;
        }
    }
    getDifficultyConfig(difficulty) {
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
    async getBestMove(fen, difficulty = 'medium') {
        await this.waitForReady();
        const config = this.getDifficultyConfig(difficulty);
        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdout) {
                reject(new Error('Stockfish process not available'));
                return;
            }
            let bestMove = '';
            const dataHandler = (data) => {
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
            }
            else if (config.depth) {
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
    async evaluatePosition(fen, depth = 15) {
        await this.waitForReady();
        return new Promise((resolve, reject) => {
            if (!this.process || !this.process.stdout) {
                reject(new Error('Stockfish process not available'));
                return;
            }
            let evaluation = 0;
            let mateIn = null;
            let bestMove = null;
            let legalMoves = 0;
            const dataHandler = (data) => {
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
                    }
                    else if (line.includes('score mate')) {
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
                        this.process?.stdout?.removeListener('data', dataHandler);
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
            setTimeout(() => {
                this.process?.stdout?.removeListener('data', dataHandler);
                reject(new Error('Evaluation timeout'));
            }, 30000);
        });
    }
    terminate() {
        if (this.process) {
            this.sendCommand('quit');
            this.process.kill();
            this.process = null;
            this.isReady = false;
        }
    }
}
exports.StockfishService = StockfishService;
// Singleton instance
let stockfishInstance = null;
const getStockfishInstance = () => {
    if (!stockfishInstance) {
        stockfishInstance = new StockfishService();
    }
    return stockfishInstance;
};
exports.getStockfishInstance = getStockfishInstance;
