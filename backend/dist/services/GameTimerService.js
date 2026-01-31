"use strict";
/**
 * Game Timer Service
 * Manages chess game timers with different time controls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameTimerService = exports.TIME_CONTROLS = void 0;
exports.TIME_CONTROLS = {
    bullet: { initial: 60, increment: 0 }, // 1+0
    blitz: { initial: 180, increment: 2 }, // 3+2
    rapid: { initial: 600, increment: 0 }, // 10+0
    classical: { initial: 1800, increment: 0 }, // 30+0
    custom: { initial: 300, increment: 5 }, // 5+5
};
class GameTimerService {
    constructor() {
        this.timers = new Map();
        this.intervals = new Map();
    }
    /**
     * Initialize a timer for a game
     */
    initializeTimer(gameId, timeControl = 'blitz', startingColor = 'white') {
        const control = exports.TIME_CONTROLS[timeControl] || exports.TIME_CONTROLS.blitz;
        const initialTime = control.initial * 1000; // Convert to milliseconds
        const timerState = {
            whiteTime: initialTime,
            blackTime: initialTime,
            currentTurn: startingColor,
            isRunning: false,
            lastMoveTime: Date.now(),
        };
        this.timers.set(gameId, timerState);
        return timerState;
    }
    /**
     * Start the timer for current player
     */
    startTimer(gameId) {
        const timer = this.timers.get(gameId);
        if (!timer)
            return;
        timer.isRunning = true;
        timer.lastMoveTime = Date.now();
        this.timers.set(gameId, timer);
    }
    /**
     * Pause the timer
     */
    pauseTimer(gameId) {
        const timer = this.timers.get(gameId);
        if (!timer || !timer.isRunning)
            return;
        // Update the current player's time
        const elapsed = Date.now() - timer.lastMoveTime;
        if (timer.currentTurn === 'white') {
            timer.whiteTime = Math.max(0, timer.whiteTime - elapsed);
        }
        else {
            timer.blackTime = Math.max(0, timer.blackTime - elapsed);
        }
        timer.isRunning = false;
        this.timers.set(gameId, timer);
    }
    /**
     * Switch turn and add increment
     */
    switchTurn(gameId, timeControl = 'blitz') {
        const timer = this.timers.get(gameId);
        if (!timer)
            return null;
        const control = exports.TIME_CONTROLS[timeControl] || exports.TIME_CONTROLS.blitz;
        const increment = control.increment * 1000; // Convert to milliseconds
        // Calculate time spent on the move
        const elapsed = Date.now() - timer.lastMoveTime;
        // Update the player who just moved
        if (timer.currentTurn === 'white') {
            timer.whiteTime = Math.max(0, timer.whiteTime - elapsed + increment);
        }
        else {
            timer.blackTime = Math.max(0, timer.blackTime - elapsed + increment);
        }
        // Switch turn
        timer.currentTurn = timer.currentTurn === 'white' ? 'black' : 'white';
        timer.lastMoveTime = Date.now();
        this.timers.set(gameId, timer);
        return timer;
    }
    /**
     * Get current timer state
     */
    getTimer(gameId) {
        const timer = this.timers.get(gameId);
        if (!timer)
            return null;
        // If timer is running, calculate current time
        if (timer.isRunning) {
            const elapsed = Date.now() - timer.lastMoveTime;
            return {
                ...timer,
                whiteTime: timer.currentTurn === 'white'
                    ? Math.max(0, timer.whiteTime - elapsed)
                    : timer.whiteTime,
                blackTime: timer.currentTurn === 'black'
                    ? Math.max(0, timer.blackTime - elapsed)
                    : timer.blackTime,
            };
        }
        return timer;
    }
    /**
     * Check if a player has run out of time
     */
    isTimeExpired(gameId) {
        const timer = this.getTimer(gameId);
        if (!timer)
            return { expired: false };
        if (timer.whiteTime <= 0) {
            return { expired: true, loser: 'white' };
        }
        if (timer.blackTime <= 0) {
            return { expired: true, loser: 'black' };
        }
        return { expired: false };
    }
    /**
     * Stop and remove timer
     */
    stopTimer(gameId) {
        this.pauseTimer(gameId);
        this.timers.delete(gameId);
        const interval = this.intervals.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.intervals.delete(gameId);
        }
    }
    /**
     * Add time to a player (for time odds games)
     */
    addTime(gameId, color, seconds) {
        const timer = this.timers.get(gameId);
        if (!timer)
            return;
        if (color === 'white') {
            timer.whiteTime += seconds * 1000;
        }
        else {
            timer.blackTime += seconds * 1000;
        }
        this.timers.set(gameId, timer);
    }
    /**
     * Get all active timers (for debugging)
     */
    getActiveTimers() {
        return Array.from(this.timers.keys());
    }
}
exports.gameTimerService = new GameTimerService();
exports.default = GameTimerService;
