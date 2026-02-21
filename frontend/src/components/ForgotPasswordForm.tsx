import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuthStore } from '../store/authStore';
import { OTPInput } from './OTPInput';
import { Recaptcha } from './Recaptcha';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess, onBackToLogin }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: email, 2: OTP, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  const { sendPasswordResetOTP, verifyPasswordResetOTP, resetPassword, isLoading, error, clearError, requiresCaptchaForPasswordReset } = useAuthStore();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (!email) {
      setValidationError('Please enter your email address.');
      return;
    }

    try {
      await sendPasswordResetOTP(email, recaptchaToken || undefined);
      setStep(2);
    } catch (err) {
      // Error is handled in store
      // Reset CAPTCHA after failed attempt if CAPTCHA is required
      if (requiresCaptchaForPasswordReset && recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleOTPComplete = async (otpValue: string) => {
    setOtp(otpValue);
    try {
      await verifyPasswordResetOTP(email, otpValue);
      setStep(3);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleResendOTP = async () => {
    clearError();
    try {
      await sendPasswordResetOTP(email, recaptchaToken || undefined);
    } catch (err) {
      // Error is handled in store
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    if (newPassword !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    try {
      await resetPassword(email, otp, newPassword);
      onSuccess?.();
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleBackToEmail = () => {
    setStep(1);
    setOtp('');
    clearError();
  };

  // Step 3: New Password
  if (step === 3) {
    return (
      <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Reset Password</h2>
          <p className="text-gray-600 text-sm">Enter your new password</p>
        </div>

        {validationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-medium">⚠ {validationError}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-medium">⚠ {error}</span>
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-[10px]">
          <div className="min-w-0 px-[5px]">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
                placeholder="New Password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="min-w-0 px-[5px]">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
                placeholder="Confirm Password"
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex justify-center mt-7">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary px-6"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Resetting...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Reset Password
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 flex justify-center">
          <button
            onClick={onBackToLogin}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Verify OTP</h2>
          <p className="text-gray-600 text-sm">Enter the code sent to {email}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <span className="font-medium">⚠ {error}</span>
          </div>
        )}

        <OTPInput
          email={email}
          onComplete={handleOTPComplete}
          onResend={handleResendOTP}
        />

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleBackToEmail}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Change email
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Email Input
  return (
    <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Forgot Password?</h2>
        <p className="text-gray-600 text-sm">Enter your email to reset your password</p>
      </div>

      <form onSubmit={handleEmailSubmit} className="space-y-[10px]">
        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
              placeholder="Email Address"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {(error || validationError) && (
            <p className="text-red-600 text-xs mt-1.5 ml-1">
              ⚠ {error || validationError}
            </p>
          )}
        </div>

        {requiresCaptchaForPasswordReset && (
          <Recaptcha 
            ref={recaptchaRef}
            onChange={handleRecaptchaChange}
            onExpired={() => setRecaptchaToken(null)}
            onError={() => setRecaptchaToken(null)}
          />
        )}

        <div className="flex justify-center mt-7">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary px-6"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending OTP...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send OTP
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </form>

      {onBackToLogin && (
        <div className="mt-7 pt-6 border-t border-black/10">
          <p className="text-center text-gray-600 text-sm mb-3">
            Remember your password?
          </p>
          <div className="flex justify-center">
            <button
              onClick={onBackToLogin}
              className="btn-secondary px-6"
            >
              Back to login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
