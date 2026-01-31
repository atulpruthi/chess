"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const botController_1 = require("../controllers/botController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All bot routes require authentication
router.post('/create', authMiddleware_1.authMiddleware, botController_1.createBotGame);
router.post('/:gameId/move', authMiddleware_1.authMiddleware, botController_1.makeBotMove);
router.get('/:gameId', authMiddleware_1.authMiddleware, botController_1.getBotGame);
exports.default = router;
