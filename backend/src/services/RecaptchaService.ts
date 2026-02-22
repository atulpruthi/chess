import axios from 'axios';

class RecaptchaService {
  private secretKey: string;

  constructor() {
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '';
    
    // In production, require a real recaptcha key
    if (process.env.NODE_ENV === 'production' && !process.env.RECAPTCHA_SECRET_KEY) {
      console.warn('WARNING: RECAPTCHA_SECRET_KEY not set in production. Recaptcha verification will fail.');
    }
    
    // For development, allow test key but log warning
    if (!this.secretKey) {
      console.warn('WARNING: Using development mode without Recaptcha. Set RECAPTCHA_SECRET_KEY for production.');
      this.secretKey = '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe'; // Google test key for dev only
    }
  }

  async verifyToken(token: string): Promise<boolean> {
    if (!token) {
      return false;
    }

    try {
      const response = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: this.secretKey,
            response: token
          }
        }
      );

      return response.data.success === true;
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return false;
    }
  }
}

export const recaptchaService = new RecaptchaService();
