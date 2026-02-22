"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const gameController_1 = require("../controllers/gameController");
const router = express_1.default.Router();
router.get('/:gameId', gameController_1.getGameById);
router.get('/user/:userId/history', gameController_1.getMatchHistory);
router.get('/user/:userId/recent', gameController_1.getRecentGames);
exports.default = router;
