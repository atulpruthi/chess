"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analysisController_1 = require("../controllers/analysisController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/games/:gameId/analysis', analysisController_1.getGameAnalysis);
router.get('/games/:gameId/commentaries', analysisController_1.getGameCommentaries);
// Protected routes
router.post('/games/:gameId/analyze', authMiddleware_1.authMiddleware, analysisController_1.analyzeGame);
router.get('/games/:gameId/critical', authMiddleware_1.authMiddleware, analysisController_1.getCriticalPositions);
router.post('/games/:gameId/commentary', authMiddleware_1.authMiddleware, analysisController_1.addCommentary);
router.post('/commentaries/:commentaryId/like', authMiddleware_1.authMiddleware, analysisController_1.likeCommentary);
router.post('/games/:gameId/bookmark-position', authMiddleware_1.authMiddleware, analysisController_1.bookmarkPosition);
router.get('/bookmarks/positions', authMiddleware_1.authMiddleware, analysisController_1.getUserBookmarks);
exports.default = router;
