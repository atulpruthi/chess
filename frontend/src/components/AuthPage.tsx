import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { useAuthStore } from '../store/authStore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return null; // Will be handled by routing
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 sm:p-8 md:p-12 relative overflow-hidden bg-[#3a3a3a] [background-image:conic-gradient(from_90deg,_#2f2f2f_0_25%,_#4a4a4a_0_50%,_#2f2f2f_0_75%,_#4a4a4a_0)] [background-size:25%_25%]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(0,0,0,0.40),transparent_55%)]" />
      </div>
      
      <div className="w-full relative z-10 flex flex-col items-center">
        {isLogin ? (
          <LoginForm
            onSuccess={() => window.location.reload()}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={() => window.location.reload()}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}

        {/* Footer */}
        <div className="mt-8 text-center space-y-3 w-full">
          <p className="text-gray-600 text-sm font-medium">© 2026 Chess Platform</p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
            <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};
