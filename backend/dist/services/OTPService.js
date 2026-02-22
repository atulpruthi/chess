"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = void 0;
class OTPService {
    constructor() {
        this.otpStore = new Map();
        this.OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    }
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    storeOTP(email, username, password) {
        const otp = this.generateOTP();
        const expiresAt = Date.now() + this.OTP_EXPIRY_MS;
        this.otpStore.set(email, {
            otp,
            email,
            username,
            password,
            type: 'registration',
            expiresAt
        });
        // Clean up expired OTPs periodically
        this.cleanupExpiredOTPs();
        return otp;
    }
    storePasswordResetOTP(email) {
        const otp = this.generateOTP();
        const expiresAt = Date.now() + this.OTP_EXPIRY_MS;
        this.otpStore.set(email, {
            otp,
            email,
            type: 'password_reset',
            expiresAt
        });
        // Clean up expired OTPs periodically
        this.cleanupExpiredOTPs();
        return otp;
    }
    verifyOTP(email, otp) {
        const otpData = this.otpStore.get(email);
        if (!otpData) {
            return { valid: false };
        }
        if (Date.now() > otpData.expiresAt) {
            this.otpStore.delete(email);
            return { valid: false };
        }
        if (otpData.otp !== otp) {
            return { valid: false };
        }
        return { valid: true, data: otpData };
    }
    deleteOTP(email) {
        this.otpStore.delete(email);
    }
    cleanupExpiredOTPs() {
        const now = Date.now();
        for (const [email, data] of this.otpStore.entries()) {
            if (now > data.expiresAt) {
                this.otpStore.delete(email);
            }
        }
    }
    // For development/testing - log OTP to console
    logOTP(email, otp) {
        console.log(`\n=== OTP for ${email} ===`);
        console.log(`OTP: ${otp}`);
        console.log(`Valid for 5 minutes`);
        console.log(`========================\n`);
    }
}
exports.otpService = new OTPService();
