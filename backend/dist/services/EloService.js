"use strict";
/**
 * ELO Rating Service
 * Implements the ELO rating system for chess players
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eloService = void 0;
class EloService {
    constructor() {
        // K-factor determines how much ratings change per game
        // Higher K-factor = more volatile ratings
        this.K_FACTOR = 32; // Standard for most chess platforms
        this.K_FACTOR_NEW = 40; // For players with < 30 games
        this.K_FACTOR_HIGH = 24; // For players rated > 2400
    }
    /**
     * Calculate expected score for a player
     * @param playerRating - Current rating of the player
     * @param opponentRating - Current rating of the opponent
     * @returns Expected score (0-1)
     */
    calculateExpectedScore(playerRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    }
    /**
     * Get appropriate K-factor based on player rating and games played
     * @param rating - Player's current rating
     * @param gamesPlayed - Number of games played
     * @returns K-factor
     */
    getKFactor(rating, gamesPlayed) {
        if (gamesPlayed < 30) {
            return this.K_FACTOR_NEW;
        }
        if (rating >= 2400) {
            return this.K_FACTOR_HIGH;
        }
        return this.K_FACTOR;
    }
    /**
     * Calculate new ratings after a game
     * @param whiteRating - White player's current rating
     * @param blackRating - Black player's current rating
     * @param result - Game result ('white', 'black', 'draw')
     * @param whiteGamesPlayed - Number of games white player has played
     * @param blackGamesPlayed - Number of games black player has played
     * @returns New ratings and rating changes
     */
    calculateNewRatings(whiteRating, blackRating, result, whiteGamesPlayed = 100, blackGamesPlayed = 100) {
        // Get K-factors for both players
        const whiteK = this.getKFactor(whiteRating, whiteGamesPlayed);
        const blackK = this.getKFactor(blackRating, blackGamesPlayed);
        // Calculate expected scores
        const whiteExpected = this.calculateExpectedScore(whiteRating, blackRating);
        const blackExpected = this.calculateExpectedScore(blackRating, whiteRating);
        // Actual scores based on result
        let whiteActual;
        let blackActual;
        switch (result) {
            case 'white':
                whiteActual = 1;
                blackActual = 0;
                break;
            case 'black':
                whiteActual = 0;
                blackActual = 1;
                break;
            case 'draw':
                whiteActual = 0.5;
                blackActual = 0.5;
                break;
        }
        // Calculate rating changes
        const whiteChange = Math.round(whiteK * (whiteActual - whiteExpected));
        const blackChange = Math.round(blackK * (blackActual - blackExpected));
        // Calculate new ratings (minimum rating is 100)
        const whiteNewRating = Math.max(100, whiteRating + whiteChange);
        const blackNewRating = Math.max(100, blackRating + blackChange);
        return {
            whiteNewRating,
            blackNewRating,
            whiteChange,
            blackChange,
        };
    }
    /**
     * Calculate rating change for a single player
     * Useful for displaying expected gain/loss before a game
     */
    calculateExpectedChange(playerRating, opponentRating, gamesPlayed = 100) {
        const k = this.getKFactor(playerRating, gamesPlayed);
        const expected = this.calculateExpectedScore(playerRating, opponentRating);
        return {
            winChange: Math.round(k * (1 - expected)),
            lossChange: Math.round(k * (0 - expected)),
            drawChange: Math.round(k * (0.5 - expected)),
        };
    }
    /**
     * Get rating category name
     */
    getRatingCategory(rating) {
        if (rating < 800)
            return 'Beginner';
        if (rating < 1000)
            return 'Novice';
        if (rating < 1200)
            return 'Intermediate';
        if (rating < 1400)
            return 'Advanced';
        if (rating < 1600)
            return 'Expert';
        if (rating < 1800)
            return 'Class A';
        if (rating < 2000)
            return 'Candidate Master';
        if (rating < 2200)
            return 'FIDE Master';
        if (rating < 2400)
            return 'International Master';
        if (rating < 2500)
            return 'Grandmaster';
        return 'Super Grandmaster';
    }
}
exports.eloService = new EloService();
exports.default = EloService;
