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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        
        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-500/[0.08] rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/[0.08] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
      </div>
      
      <div className="max-w-sm px-4 relative z-10">
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
        <div className="mt-10 text-center space-y-3">
          <p className="text-gray-500 text-sm font-medium">
            © 2026 Chess Platform. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
            <span>•</span>
            <a href="#" className="hover:text-gray-400 transition-colors">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};
