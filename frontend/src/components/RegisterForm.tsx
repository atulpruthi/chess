import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuthStore } from '../store/authStore';
import { OTPInput } from './OTPInput';
import { Recaptcha } from './Recaptcha';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [step, setStep] = useState<1 | 2>(1); // 1: registration form, 2: OTP verification
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [useEmailAsUsername, setUseEmailAsUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [emailMessage, setEmailMessage] = useState<string>('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showEmailExistsModal, setShowEmailExistsModal] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  
  const { sendOTP, verifyOTP, checkUsername, checkEmail, isLoading, error, clearError } = useAuthStore();

  const handleUsernameBlur = async () => {
    if (!username || useEmailAsUsername) return;

    // Validate username length
    if (username.length < 5) {
      setUsernameError('Username must be at least 5 characters');
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
      return;
    }

    // Clear error if username is valid length
    setUsernameError('');

    setCheckingUsername(true);
    try {
      const result = await checkUsername(username);
      setUsernameAvailable(result.available);
      setUsernameSuggestions(result.suggestions);
    } catch (err) {
      console.error('Failed to check username:', err);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleEmailBlur = async () => {
    if (!email) return;

    setCheckingEmail(true);
    try {
      const result = await checkEmail(email);
      setEmailValid(result.valid);
      setEmailExists(result.exists);
      setEmailMessage(result.message);
      
      // Show modal if email already exists
      if (result.exists) {
        console.log('Email exists, showing modal');
        setShowEmailExistsModal(true);
        // Clear email field
        setEmail('');
        setEmailValid(null);
        setEmailExists(null);
      }
    } catch (err) {
      console.error('Failed to check email:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric characters
    const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, '');
    setUsername(alphanumericValue);
    setUsernameAvailable(null);
    setUsernameSuggestions([]);
    setUsernameError(''); // Clear error on change
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setEmailValid(null);
    setEmailExists(null);
    setEmailMessage('');
    setShowEmailExistsModal(false); // Close modal if user starts typing again
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
    setUsernameAvailable(true);
    setUsernameSuggestions([]);
  };

  const handleUseEmailAsUsername = (checked: boolean) => {
    setUseEmailAsUsername(checked);
    if (checked && email) {
      const emailUsername = email.split('@')[0];
      setUsername(emailUsername);
      setUsernameAvailable(null);
      setUsernameSuggestions([]);
    } else if (!checked) {
      setUsername('');
      setUsernameAvailable(null);
    }
  };

  React.useEffect(() => {
    if (useEmailAsUsername && email) {
      const emailUsername = email.split('@')[0];
      setUsername(emailUsername);
    }
  }, [email, useEmailAsUsername]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setValidationError(null);

    // Check CAPTCHA
    if (!recaptchaToken) {
      setValidationError('Please complete the CAPTCHA verification.');
      return;
    }

    // Username validation
    if (username.length < 5) {
      setValidationError('Username must be at least 5 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      setValidationError('Username must contain only letters and numbers.');
      return;
    }

    // Check username availability
    if (usernameAvailable === false) {
      setValidationError('Please choose an available username.');
      return;
    }

    // Check email validity and availability
    if (emailValid === false) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (emailExists === true) {
      setValidationError('Email already registered. Please login instead.');
      return;
    }

    // Validation
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setValidationError('Password must contain uppercase, lowercase, and number.');
      return;
    }

    try {
      await sendOTP(username, email, password, recaptchaToken);
      setStep(2); // Move to OTP verification step
    } catch (err) {
      // Error is handled in store
      // Reset CAPTCHA after failed attempt
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    }
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleOTPComplete = async (otp: string) => {
    try {
      await verifyOTP(email, otp);
      onSuccess?.();
    } catch (err) {
      // Error is handled in store
    }
  };

  const handleResendOTP = async () => {
    clearError();
    
    // Check if we have a valid recaptcha token
    if (!recaptchaToken) {
      setValidationError('Please complete the CAPTCHA verification before resending.');
      return;
    }
    
    try {
      await sendOTP(username, email, password, recaptchaToken);
    } catch (err) {
      // Error is handled in store
      // Reset CAPTCHA after failed attempt
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
      }
    }
  };

  const handleBackToForm = () => {
    setStep(1);
    clearError();
  };

  // Step 2: OTP Verification
  if (step === 2) {
    return (
      <>
        <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
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
              onClick={handleBackToForm}
              className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to registration
            </button>
          </div>
        </div>
      </>
    );
  }

  // Step 1: Registration Form
  return (
    <>
      <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Create account</h2>
        <p className="text-gray-600 text-sm">Join the community in seconds</p>
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

      <form onSubmit={handleSubmit} className="space-y-[10px]">
        {/* Username Field */}
        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              onBlur={handleUsernameBlur}
              className={`w-full h-[30px] pl-12 pr-10 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                usernameError || usernameAvailable === false
                  ? 'ring-2 ring-red-300 focus:ring-red-400'
                  : usernameAvailable === true
                  ? 'ring-2 ring-green-300 focus:ring-green-400'
                  : 'focus:ring-[#7fa650]/30'
              }`}
              placeholder="Username"
              aria-label="Username"
              required
              minLength={5}
              pattern="[a-zA-Z0-9]+"
              title="Username must be at least 5 alphanumeric characters"
              disabled={isLoading || useEmailAsUsername}
            />
            {checkingUsername && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {!checkingUsername && usernameAvailable === true && !usernameError && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {!checkingUsername && (usernameAvailable === false || usernameError) && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Username validation error */}
          {usernameError && (
            <p className="text-red-600 text-xs mt-1.5 ml-1">
              ⚠ {usernameError}
            </p>
          )}
          
          {/* Username taken message with suggestions */}
          {usernameAvailable === false && usernameSuggestions.length > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium mb-2">Username is already taken. Try these:</p>
              <div className="flex flex-wrap gap-2">
                {usernameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 text-xs font-medium text-amber-700 bg-white border border-amber-300 rounded-md hover:bg-amber-100 hover:border-amber-400 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Use email as username option */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="useEmailAsUsername"
              checked={useEmailAsUsername}
              onChange={(e) => handleUseEmailAsUsername(e.target.checked)}
              className="w-4 h-4 text-[#7fa650] bg-gray-100 border-gray-300 rounded focus:ring-[#7fa650] focus:ring-2"
              disabled={isLoading}
            />
            <label htmlFor="useEmailAsUsername" className="text-xs text-gray-600 cursor-pointer select-none">
              Use email as username
            </label>
          </div>
        </div>

        {/* Email Field */}
        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              className={`w-full h-[30px] pl-12 pr-10 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                emailValid === false || emailExists === true
                  ? 'ring-2 ring-red-300 focus:ring-red-400'
                  : emailValid === true && emailExists === false
                  ? 'ring-2 ring-green-300 focus:ring-green-400'
                  : 'focus:ring-[#7fa650]/30'
              }`}
              placeholder="Email Address"
              aria-label="Email Address"
              required
              disabled={isLoading}
            />
            {checkingEmail && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            {!checkingEmail && emailValid === true && emailExists === false && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {!checkingEmail && (emailValid === false || emailExists === true) && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          {/* Email validation messages - only show format errors inline */}
          {emailMessage && emailValid === false && !emailExists && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-800 font-medium">
                {emailMessage}
              </p>
            </div>
          )}
        </div>

        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
              placeholder="Password"
              aria-label="Password"
              required
              minLength={8}
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
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
              placeholder="Confirm Password"
              aria-label="Confirm Password"
              required
              minLength={8}
              disabled={isLoading}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 px-1">
            Password must be at least 8 characters with uppercase, lowercase, and number
          </p>
        </div>

        <Recaptcha 
          ref={recaptchaRef}
          onChange={handleRecaptchaChange}
          onExpired={() => setRecaptchaToken(null)}
          onError={() => setRecaptchaToken(null)}
        />

        <div className="flex justify-center mt-6">
          <button
            type="submit"
            disabled={isLoading || !email || usernameAvailable === false || emailValid === false || emailExists === true || !recaptchaToken || !!usernameError || !!validationError}
            className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
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

      {onSwitchToLogin && (
        <div className="mt-7 pt-6 border-t border-black/10">
          <p className="text-center text-gray-600 text-sm mb-3">
            Already have an account?
          </p>
          <div className="flex justify-center">
            <button
              onClick={onSwitchToLogin}
              className="btn-secondary px-6"
            >
              Sign in instead
            </button>
          </div>
        </div>
      )}
    </div>

    {/* Email Already Exists Modal */}
    {showEmailExistsModal && (
      <div 
        className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={() => setShowEmailExistsModal(false)}
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all animate-fadeIn" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Email Already Registered</h3>
            <p className="text-gray-600 mb-6">
              This email address is already associated with an account. Please login to continue.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowEmailExistsModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              {onSwitchToLogin && (
                <button
                  onClick={() => {
                    setShowEmailExistsModal(false);
                    onSwitchToLogin();
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#7fa650] hover:bg-[#6b8f44] text-white font-medium rounded-lg transition-colors shadow-md"
                >
                  Go to Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
  </>
);
};
