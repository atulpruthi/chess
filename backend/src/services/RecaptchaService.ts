import axios from 'axios';

class RecaptchaService {
  private secretKey: string;

  constructor() {
    // For development, using test keys. Replace with real keys in production
    this.secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';
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
