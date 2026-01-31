"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const statsController_1 = require("../controllers/statsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/users/:userId/stats', statsController_1.getUserStats);
router.get('/users/:userId/history', statsController_1.getGameHistory);
router.get('/users/:userId/rank', statsController_1.getUserRank);
router.get('/users/:userId/achievements', statsController_1.getUserAchievements);
router.get('/leaderboard', statsController_1.getLeaderboard);
// Protected routes
router.post('/games/:gameId/bookmark', authMiddleware_1.authMiddleware, statsController_1.bookmarkGame);
router.get('/bookmarks', authMiddleware_1.authMiddleware, statsController_1.getBookmarkedGames);
exports.default = router;
