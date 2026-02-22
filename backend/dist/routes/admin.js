"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const statsController_1 = require("../controllers/statsController");
const adminMiddleware_1 = require("../middleware/adminMiddleware");
const router = express_1.default.Router();
// Dashboard stats (moderators can view)
router.get('/stats', adminMiddleware_1.moderatorMiddleware, adminController_1.getDashboardStats);
// User management
router.get('/users', adminMiddleware_1.moderatorMiddleware, adminController_1.getAllUsers);
router.put('/users/:userId/role', adminMiddleware_1.adminMiddleware, adminController_1.updateUserRole);
router.post('/users/:userId/ban', adminMiddleware_1.moderatorMiddleware, adminController_1.banUser);
router.delete('/users/:userId/ban', adminMiddleware_1.moderatorMiddleware, adminController_1.unbanUser);
router.delete('/users/:userId', adminMiddleware_1.adminMiddleware, adminController_1.deleteUser);
// Game management
router.get('/games', adminMiddleware_1.moderatorMiddleware, adminController_1.getAllGames);
router.delete('/games/:gameId', adminMiddleware_1.adminMiddleware, adminController_1.deleteGame);
// Admin logs (admin only)
router.get('/logs', adminMiddleware_1.adminMiddleware, adminController_1.getAdminLogs);
// Achievement management (admin only)
router.post('/achievements/sync-all', adminMiddleware_1.adminMiddleware, statsController_1.syncAllAchievements);
exports.default = router;
