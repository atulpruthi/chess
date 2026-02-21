import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  rating: number;
  role?: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiresCaptchaForLogin: boolean;
  requiresCaptchaForPasswordReset: boolean;
  
  // Actions
  login: (email: string, password: string, recaptchaToken?: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  sendOTP: (username: string, email: string, password: string, recaptchaToken?: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  checkUsername: (username: string) => Promise<{ available: boolean; suggestions: string[] }>;
  checkEmail: (email: string) => Promise<{ valid: boolean; exists: boolean; message: string }>;
  sendPasswordResetOTP: (email: string, recaptchaToken?: string) => Promise<void>;
  verifyPasswordResetOTP: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      requiresCaptchaForLogin: false,
      requiresCaptchaForPasswordReset: false,

      login: async (email: string, password: string, recaptchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, recaptchaToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            // Update CAPTCHA requirement status
            if (data.requiresCaptcha !== undefined) {
              set({ requiresCaptchaForLogin: data.requiresCaptcha });
            }
            throw new Error(data.error || 'Login failed');
          }

          // Clear CAPTCHA requirement on successful login
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresCaptchaForLogin: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      sendOTP: async (username: string, email: string, password: string, recaptchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/register/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, recaptchaToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to send OTP');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to send OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyOTP: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/register/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'OTP verification failed');
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'OTP verification failed',
            isLoading: false,
          });
          throw error;
        }
      },

      checkUsername: async (username: string) => {
        try {
          const response = await fetch(
            `http://localhost:5001/api/auth/check-username?username=${encodeURIComponent(username)}`,
            { method: 'GET' }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to check username');
          }

          return {
            available: data.available,
            suggestions: data.suggestions || [],
          };
        } catch (error) {
          console.error('Check username error:', error);
          return {
            available: true,
            suggestions: [],
          };
        }
      },

      checkEmail: async (email: string) => {
        try {
          const response = await fetch(
            `http://localhost:5001/api/auth/check-email?email=${encodeURIComponent(email)}`,
            { method: 'GET' }
          );

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to check email');
          }

          return {
            valid: data.valid,
            exists: data.exists,
            message: data.message || '',
          };
        } catch (error) {
          console.error('Check email error:', error);
          return {
            valid: true,
            exists: false,
            message: '',
          };
        }
      },

      sendPasswordResetOTP: async (email: string, recaptchaToken?: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/forgot-password/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, recaptchaToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            // Update CAPTCHA requirement status
            if (data.requiresCaptcha !== undefined) {
              set({ requiresCaptchaForPasswordReset: data.requiresCaptcha });
            }
            throw new Error(data.error || 'Failed to send OTP');
          }

          // Update CAPTCHA requirement status from successful response
          if (data.requiresCaptcha !== undefined) {
            set({ requiresCaptchaForPasswordReset: data.requiresCaptcha });
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to send OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyPasswordResetOTP: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/forgot-password/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Invalid OTP');
          }

          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Invalid OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      resetPassword: async (email: string, otp: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/forgot-password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, newPassword }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to reset password');
          }

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to reset password',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        // Clear old localStorage token if it exists
        localStorage.removeItem('token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      updateProfile: async (data: Partial<User>) => {
        const { token } = get();
        if (!token) throw new Error('Not authenticated');

        set({ isLoading: true, error: null });
        try {
          const response = await fetch('http://localhost:5001/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Update failed');
          }

          set({
            user: result.user,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Update failed',
            isLoading: false,
          });
          throw error;
        }
      },

      clearError: () => set({ error: null }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
