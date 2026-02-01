import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className="w-[min(92vw,420px)] lg:w-[25vw] lg:min-w-[360px] lg:max-w-[420px] mx-auto p-8 sm:p-9 bg-white rounded-2xl shadow-[0_10px_28px_rgba(0,0,0,0.12)] transition-colors duration-300 overflow-hidden">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 mb-4 bg-[#7fa650] rounded-2xl shadow-[0_8px_20px_rgba(127,166,80,0.35)]">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome back</h2>
        <p className="text-gray-600 text-sm">Sign in to continue</p>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-[10px]">
        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-[#588c2c] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-[30px] pl-12 pr-4 text-[15px] leading-[30px] font-medium bg-white rounded-xl text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#7fa650]/30 transition-colors"
              placeholder="Email Address"
              aria-label="Email Address"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
        </div>

        <div className="min-w-0 px-[5px]">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors">
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
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="flex justify-center mt-7">
          <button
            type="submit"
            disabled={isLoading}
            className="h-[30px] w-fit px-4 bg-blue-600 text-white text-[15px] font-bold rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_6px_18px_rgba(37,99,235,0.35)]"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2.5">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Signing In...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>
        </div>
      </form>

      {onSwitchToRegister && (
        <div className="mt-7 pt-6 border-t border-black/10">
          <p className="text-center text-gray-600 text-sm">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="inline-flex items-center gap-1 h-[26px] px-3 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors"
            >
              Create one now
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </p>
        </div>
      )}
    </div>
  );
};
