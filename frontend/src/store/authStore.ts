import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

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
  login: (email: string, password: string, recaptchaToken?: string) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<void>;
  sendOTP: (username: string, email: string, password: string, recaptchaToken: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  checkUsername: (username: string) => Promise<{ available: boolean; suggestions: string[] }>;
  checkEmail: (email: string) => Promise<{ valid: boolean; exists: boolean; message: string }>;
  sendPasswordResetOTP: (email: string, recaptchaToken?: string) => Promise<void>;
  verifyPasswordResetOTP: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
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
          const { data } = await api.post('/api/auth/login', { email, password, recaptchaToken });

          // Handle CAPTCHA requirement status from error responses
          // This will be caught in the catch block if status is not 2xx

          // Clear CAPTCHA requirement on successful login
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresCaptchaForLogin: false,
          });
          
          return data.user;
        } catch (error: any) {
          // Handle CAPTCHA requirement from error response
          if (error.response?.data?.requiresCaptcha !== undefined) {
            set({ requiresCaptchaForLogin: error.response.data.requiresCaptcha });
          }
          set({
            error: error.response?.data?.error || error.message || 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/api/auth/register', { username, email, password });

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      sendOTP: async (username: string, email: string, password: string, recaptchaToken: string) => {
        set({ isLoading: true, error: null });
        try {
          await api.post('/api/auth/register/send-otp', { username, email, password, recaptchaToken });

          set({ isLoading: false, error: null });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Failed to send OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      verifyOTP: async (email: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/api/auth/register/verify', { email, otp });

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
          const { data } = await api.get(`/api/auth/check-username?username=${encodeURIComponent(username)}`);

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
          const { data } = await api.get(`/api/auth/check-email?email=${encodeURIComponent(email)}`);

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
          const { data } = await api.post('/api/auth/forgot-password/send-otp', { email, recaptchaToken });

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
          await api.post('/api/auth/forgot-password/verify-otp', { email, otp });

          set({ isLoading: false, error: null });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Invalid OTP',
            isLoading: false,
          });
          throw error;
        }
      },

      resetPassword: async (email: string, otp: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await api.post('/api/auth/forgot-password/reset', { email, otp, newPassword });

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Failed to reset password',
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
          const { data: result } = await api.put('/api/auth/profile', data);

          set({
            user: result.user,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Update failed',
            isLoading: false,
          });
          throw error;
        }
      },

      uploadAvatar: async (file: File) => {
        const { token } = get();
        if (!token) throw new Error('Not authenticated');

        set({ isLoading: true, error: null });
        try {
          const formData = new FormData();
          formData.append('avatar', file);

          const { data: result } = await api.post('/api/auth/profile/avatar', formData);

          set({
            user: result.user,
            isLoading: false,
            error: null,
          });

          return result.user?.avatarUrl;
        } catch (error: any) {
          set({
            error: error.response?.data?.error || error.message || 'Avatar upload failed',
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
