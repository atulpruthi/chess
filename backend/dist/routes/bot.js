"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const botController_1 = require("../controllers/botController");
const optionalAuthMiddleware_1 = require("../middleware/optionalAuthMiddleware");
const router = express_1.default.Router();
// Bot routes support both authenticated and guest users
router.post('/create', optionalAuthMiddleware_1.optionalAuthMiddleware, botController_1.createBotGame);
router.post('/:gameId/move', optionalAuthMiddleware_1.optionalAuthMiddleware, botController_1.makeBotMove);
router.post('/:gameId/end', optionalAuthMiddleware_1.optionalAuthMiddleware, botController_1.endBotGame);
router.get('/:gameId', optionalAuthMiddleware_1.optionalAuthMiddleware, botController_1.getBotGame);
exports.default = router;
