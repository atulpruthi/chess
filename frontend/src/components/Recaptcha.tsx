import { forwardRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

interface RecaptchaProps {
  onChange: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
}

// Get reCAPTCHA site key from environment variables
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';

export const Recaptcha = forwardRef<ReCAPTCHA, RecaptchaProps>(({ 
  onChange, 
  onExpired, 
  onError 
}, ref) => {
  return (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        ref={ref}
        sitekey={RECAPTCHA_SITE_KEY}
        onChange={onChange}
        onExpired={onExpired}
        onErrored={onError}
        theme="light"
      />
    </div>
  );
});
