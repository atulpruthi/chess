"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitService = void 0;
class RateLimitService {
    constructor() {
        this.loginAttempts = new Map();
        this.passwordResetAttempts = new Map();
        // Clear attempts older than 1 hour
        this.ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour
        this.MAX_ATTEMPTS = 5;
        // Clean up old attempts every 10 minutes
        setInterval(() => {
            this.cleanupOldAttempts();
        }, 10 * 60 * 1000);
    }
    cleanupOldAttempts() {
        const now = new Date();
        // Clean login attempts
        for (const [ip, data] of this.loginAttempts.entries()) {
            if (now.getTime() - data.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
                this.loginAttempts.delete(ip);
            }
        }
        // Clean password reset attempts
        for (const [ip, data] of this.passwordResetAttempts.entries()) {
            if (now.getTime() - data.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
                this.passwordResetAttempts.delete(ip);
            }
        }
    }
    recordLoginAttempt(ip) {
        const now = new Date();
        const existing = this.loginAttempts.get(ip);
        if (existing) {
            // Check if window expired
            if (now.getTime() - existing.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
                // Reset counter
                this.loginAttempts.set(ip, {
                    count: 1,
                    firstAttempt: now,
                    lastAttempt: now
                });
            }
            else {
                // Increment counter
                existing.count++;
                existing.lastAttempt = now;
            }
        }
        else {
            this.loginAttempts.set(ip, {
                count: 1,
                firstAttempt: now,
                lastAttempt: now
            });
        }
    }
    recordPasswordResetAttempt(ip) {
        const now = new Date();
        const existing = this.passwordResetAttempts.get(ip);
        if (existing) {
            if (now.getTime() - existing.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
                this.passwordResetAttempts.set(ip, {
                    count: 1,
                    firstAttempt: now,
                    lastAttempt: now
                });
            }
            else {
                existing.count++;
                existing.lastAttempt = now;
            }
        }
        else {
            this.passwordResetAttempts.set(ip, {
                count: 1,
                firstAttempt: now,
                lastAttempt: now
            });
        }
    }
    requiresCaptchaForLogin(ip) {
        const attempts = this.loginAttempts.get(ip);
        if (!attempts)
            return false;
        const now = new Date();
        if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
            return false;
        }
        return attempts.count >= this.MAX_ATTEMPTS;
    }
    requiresCaptchaForPasswordReset(ip) {
        const attempts = this.passwordResetAttempts.get(ip);
        if (!attempts)
            return false;
        const now = new Date();
        if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
            return false;
        }
        return attempts.count >= this.MAX_ATTEMPTS;
    }
    clearLoginAttempts(ip) {
        this.loginAttempts.delete(ip);
    }
    clearPasswordResetAttempts(ip) {
        this.passwordResetAttempts.delete(ip);
    }
    getLoginAttemptCount(ip) {
        const attempts = this.loginAttempts.get(ip);
        if (!attempts)
            return 0;
        const now = new Date();
        if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
            return 0;
        }
        return attempts.count;
    }
    getPasswordResetAttemptCount(ip) {
        const attempts = this.passwordResetAttempts.get(ip);
        if (!attempts)
            return 0;
        const now = new Date();
        if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
            return 0;
        }
        return attempts.count;
    }
}
exports.rateLimitService = new RateLimitService();
