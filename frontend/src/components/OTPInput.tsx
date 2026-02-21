import React, { useState, useRef } from 'react';
import type { KeyboardEvent, ClipboardEvent } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onResend: () => void;
  email: string;
  resendCooldown?: number; // in seconds
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onResend,
  email,
  resendCooldown = 60
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [countdown, setCountdown] = useState<number>(resendCooldown);
  const [canResend, setCanResend] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start countdown timer
  React.useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];
      
      if (otp[index]) {
        // Clear current field
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous field and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }

    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    
    if (!/^\d+$/.test(pastedData)) return; // Only allow numbers

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < length) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);

    // Focus last filled input or last input
    const lastFilledIndex = Math.min(pastedData.length, length - 1);
    inputRefs.current[lastFilledIndex]?.focus();

    // Check if OTP is complete
    if (newOtp.every(digit => digit !== '')) {
      onComplete(newOtp.join(''));
    }
  };

  const handleResend = () => {
    if (!canResend) return;
    
    setOtp(Array(length).fill(''));
    setCountdown(resendCooldown);
    setCanResend(false);
    onResend();
    inputRefs.current[0]?.focus();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Verify Your Email</h3>
        <p className="text-gray-600 text-sm">
          We've sent a 6-digit code to <span className="text-gray-900 font-medium">{email}</span>
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={(e) => handlePaste(e)}
            className="w-[38px] sm:w-[44px] md:w-[50px] h-11 sm:h-12 md:h-14 text-center text-lg sm:text-xl md:text-2xl font-semibold bg-white border-2 border-gray-300 rounded-lg sm:rounded-xl text-gray-900 focus:border-[#7fa650] focus:ring-2 focus:ring-[#7fa650]/20 focus:outline-none transition-all"
            autoFocus={index === 0}
          />
        ))}
      </div>

      <div className="text-center space-y-3">
        {!canResend ? (
          <p className="text-gray-600 text-sm">
            Resend code in <span className="text-gray-900 font-semibold">{formatTime(countdown)}</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-[#7fa650] hover:text-[#588c2c] text-sm font-semibold transition-colors"
          >
            Resend OTP
          </button>
        )}

        <p className="text-gray-500 text-xs">
          The code will expire in 5 minutes
        </p>
      </div>
    </div>
  );
};
