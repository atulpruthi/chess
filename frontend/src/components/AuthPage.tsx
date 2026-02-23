import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useAuthStore } from '../store/authStore';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const { isAuthenticated, clearError, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const resolveReturnTo = (state: unknown): string | null => {
    if (!state || typeof state !== 'object') return null;
    const maybeState = state as { from?: unknown };
    const from = maybeState.from;

    if (!from) return null;
    if (typeof from === 'string') return from;
    if (typeof from === 'object') {
      const fromLoc = from as { pathname?: unknown; search?: unknown; hash?: unknown };
      if (typeof fromLoc.pathname !== 'string') return null;
      const search = typeof fromLoc.search === 'string' ? fromLoc.search : '';
      const hash = typeof fromLoc.hash === 'string' ? fromLoc.hash : '';
      return `${fromLoc.pathname}${search}${hash}`;
    }

    return null;
  };

  const returnTo = useMemo(() => {
    return resolveReturnTo(location.state) ?? sessionStorage.getItem('auth:returnTo');
  }, [location.state]);

  useEffect(() => {
    const fromState = resolveReturnTo(location.state);
    if (fromState && !fromState.startsWith('/auth')) {
      sessionStorage.setItem('auth:returnTo', fromState);
    }
  }, [location.state]);

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot') => {
    clearError();
    setMode(newMode);
  };

  const handleAuthSuccess = (loggedInUser?: any) => {
    if (returnTo && !returnTo.startsWith('/auth')) {
      navigate(returnTo, { replace: true });
      return;
    }

    const role = loggedInUser?.role ?? user?.role;
    navigate(role === 'admin' ? '/admin' : '/lobby', { replace: true });
  };

  if (isAuthenticated) {
    return null; // Will be handled by routing
  }

  return (
    <div className="lobby-shell min-h-screen flex items-center justify-center p-6 sm:p-8 md:p-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.40),transparent_55%)]" />
      </div>
      
      <div className="w-full relative z-10 flex flex-col items-center">
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => handleModeChange('register')}
            onForgotPassword={() => handleModeChange('forgot')}
          />
        ) : mode === 'register' ? (
          <RegisterForm
            onSuccess={() => handleAuthSuccess()}
            onSwitchToLogin={() => handleModeChange('login')}
          />
        ) : (
          <ForgotPasswordForm
            onSuccess={() => handleAuthSuccess()}
            onBackToLogin={() => handleModeChange('login')}
          />
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-3 w-full">
          <p className="text-white/50 text-sm font-medium">© 2026 Chess Platform</p>
          <div className="flex items-center justify-center gap-4 text-xs text-white/40">
            <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-white/60 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};
