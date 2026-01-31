import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Validation
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await register(username, email, password);
      onSuccess?.();
    } catch (err) {
      // Error is handled in store
    }
  };

  return (
    <div className="max-w-sm mx-auto p-8 sm:p-10 bg-white/[0.03] backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] border border-white/[0.08] transition-all duration-300 hover:shadow-[0_8px_48px_0_rgba(0,0,0,0.48)] hover:border-white/[0.12] overflow-hidden">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-5 bg-gradient-to-br from-emerald-500 via-green-600 to-blue-600 rounded-2xl shadow-lg shadow-emerald-500/50 transform transition-transform duration-300 hover:scale-110">
          <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h2 className="text-4xl font-bold text-white mb-3 tracking-tight">Create Account</h2>
        <p className="text-gray-400 text-base font-medium">Join the chess community today</p>
      </div>
      
      {error && (
        <div className="mb-7 p-4 bg-red-500/15 backdrop-blur-sm border border-red-400/40 rounded-2xl text-red-100 text-sm flex items-start gap-3 animate-shake">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="min-w-0">
          <label htmlFor="username" className="block text-sm font-semibold text-gray-200 mb-2.5">
            Username
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full min-h-24 pl-12 pr-4 py-14 bg-slate-800/60 border border-slate-600/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-slate-800/80 transition-all duration-200 hover:border-slate-500"
              placeholder="Choose a username"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="email" className="block text-sm font-semibold text-gray-200 mb-2.5">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-24 pl-12 pr-4 py-14 bg-slate-800/60 border border-slate-600/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-slate-800/80 transition-all duration-200 hover:border-slate-500"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="password" className="block text-sm font-semibold text-gray-200 mb-2.5">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-24 pl-12 pr-4 py-14 bg-slate-800/60 border border-slate-600/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-slate-800/80 transition-all duration-200 hover:border-slate-500"
              placeholder="At least 6 characters"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="min-w-0">
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-200 mb-2.5">
            Confirm Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 group-focus-within:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full min-h-24 pl-12 pr-4 py-14 bg-slate-800/60 border border-slate-600/50 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 focus:bg-slate-800/80 transition-all duration-200 hover:border-slate-500"
              placeholder="Re-enter your password"
              required
              minLength={6}
              disabled={isLoading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-7 py-4 bg-gradient-to-r from-emerald-600 via-green-500 to-blue-600 text-white font-bold text-base rounded-2xl hover:from-emerald-700 hover:via-green-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_4px_16px_0_rgba(16,185,129,0.4)] hover:shadow-[0_6px_24px_0_rgba(16,185,129,0.5)] hover:scale-[1.01] active:scale-[0.99]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2.5">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Creating Account...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Create Account
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          )}
        </button>
      </form>

      {onSwitchToLogin && (
        <div className="mt-8 pt-7 border-t border-slate-700/50">
          <p className="text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition-colors inline-flex items-center gap-1"
            >
              Sign in instead
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
          </p>
        </div>
      )}
    </div>
  );
};
