import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { useAuthStore } from '../store/authStore';

export const AuthPage: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const { isAuthenticated, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot') => {
    clearError();
    setMode(newMode);
  };

  const handleLoginSuccess = (loggedInUser: any) => {
    // Redirect based on user role
    if (loggedInUser?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/lobby');
    }
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
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => handleModeChange('register')}
            onForgotPassword={() => handleModeChange('forgot')}
          />
        ) : mode === 'register' ? (
          <RegisterForm
            onSuccess={() => navigate('/lobby')}
            onSwitchToLogin={() => handleModeChange('login')}
          />
        ) : (
          <ForgotPasswordForm
            onSuccess={() => navigate('/lobby')}
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
