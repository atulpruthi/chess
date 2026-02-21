interface OTPData {
  otp: string;
  email: string;
  username?: string;
  password?: string;
  type: 'registration' | 'password_reset';
  expiresAt: number;
}

class OTPService {
  private otpStore: Map<string, OTPData> = new Map();
  private readonly OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  storeOTP(email: string, username: string, password: string): string {
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

  storePasswordResetOTP(email: string): string {
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

  verifyOTP(email: string, otp: string): { valid: boolean; data?: OTPData } {
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

  deleteOTP(email: string): void {
    this.otpStore.delete(email);
  }

  private cleanupExpiredOTPs(): void {
    const now = Date.now();
    for (const [email, data] of this.otpStore.entries()) {
      if (now > data.expiresAt) {
        this.otpStore.delete(email);
      }
    }
  }

  // For development/testing - log OTP to console
  logOTP(email: string, otp: string): void {
    console.log(`\n=== OTP for ${email} ===`);
    console.log(`OTP: ${otp}`);
    console.log(`Valid for 5 minutes`);
    console.log(`========================\n`);
  }
}

export const otpService = new OTPService();
