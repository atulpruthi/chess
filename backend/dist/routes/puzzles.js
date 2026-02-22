"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const puzzleController_1 = require("../controllers/puzzleController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const optionalAuthMiddleware_1 = require("../middleware/optionalAuthMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/daily', puzzleController_1.getDailyPuzzle);
router.get('/themes', puzzleController_1.getPuzzleThemes);
// Routes with optional authentication (work for both guests and authenticated users)
router.get('/random', optionalAuthMiddleware_1.optionalAuthMiddleware, puzzleController_1.getRandomPuzzle);
router.get('/theme/:themeName', optionalAuthMiddleware_1.optionalAuthMiddleware, puzzleController_1.getPuzzlesByTheme);
router.get('/:puzzleId', optionalAuthMiddleware_1.optionalAuthMiddleware, puzzleController_1.getPuzzleById);
router.post('/:puzzleId/verify', optionalAuthMiddleware_1.optionalAuthMiddleware, puzzleController_1.verifyPuzzleSolution);
// Protected routes (require authentication)
router.get('/stats', authMiddleware_1.authMiddleware, puzzleController_1.getUserPuzzleStats);
router.post('/:puzzleId/attempt', authMiddleware_1.authMiddleware, puzzleController_1.submitPuzzleAttempt);
exports.default = router;
