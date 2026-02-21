// Track login and password reset attempts by IP address
interface AttemptData {
  count: number;
  firstAttempt: Date;
  lastAttempt: Date;
}

class RateLimitService {
  private loginAttempts: Map<string, AttemptData> = new Map();
  private passwordResetAttempts: Map<string, AttemptData> = new Map();
  
  // Clear attempts older than 1 hour
  private readonly ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour
  private readonly MAX_ATTEMPTS = 5;

  constructor() {
    // Clean up old attempts every 10 minutes
    setInterval(() => {
      this.cleanupOldAttempts();
    }, 10 * 60 * 1000);
  }

  private cleanupOldAttempts() {
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

  recordLoginAttempt(ip: string): void {
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
      } else {
        // Increment counter
        existing.count++;
        existing.lastAttempt = now;
      }
    } else {
      this.loginAttempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    }
  }

  recordPasswordResetAttempt(ip: string): void {
    const now = new Date();
    const existing = this.passwordResetAttempts.get(ip);

    if (existing) {
      if (now.getTime() - existing.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
        this.passwordResetAttempts.set(ip, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      } else {
        existing.count++;
        existing.lastAttempt = now;
      }
    } else {
      this.passwordResetAttempts.set(ip, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    }
  }

  requiresCaptchaForLogin(ip: string): boolean {
    const attempts = this.loginAttempts.get(ip);
    if (!attempts) return false;
    
    const now = new Date();
    if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
      return false;
    }
    
    return attempts.count >= this.MAX_ATTEMPTS;
  }

  requiresCaptchaForPasswordReset(ip: string): boolean {
    const attempts = this.passwordResetAttempts.get(ip);
    if (!attempts) return false;
    
    const now = new Date();
    if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
      return false;
    }
    
    return attempts.count >= this.MAX_ATTEMPTS;
  }

  clearLoginAttempts(ip: string): void {
    this.loginAttempts.delete(ip);
  }

  clearPasswordResetAttempts(ip: string): void {
    this.passwordResetAttempts.delete(ip);
  }

  getLoginAttemptCount(ip: string): number {
    const attempts = this.loginAttempts.get(ip);
    if (!attempts) return 0;
    
    const now = new Date();
    if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
      return 0;
    }
    
    return attempts.count;
  }

  getPasswordResetAttemptCount(ip: string): number {
    const attempts = this.passwordResetAttempts.get(ip);
    if (!attempts) return 0;
    
    const now = new Date();
    if (now.getTime() - attempts.firstAttempt.getTime() > this.ATTEMPT_WINDOW) {
      return 0;
    }
    
    return attempts.count;
  }
}

export const rateLimitService = new RateLimitService();
