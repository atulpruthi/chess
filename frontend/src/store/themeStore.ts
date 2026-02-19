import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

export type BoardTheme = 'classic' | 'modern' | 'blue' | 'green' | 'purple';

interface ThemeState {
  mode: ThemeMode;
  boardTheme: BoardTheme;
  soundEnabled: boolean;
  animationsEnabled: boolean;
  
  // Actions
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setBoardTheme: (theme: BoardTheme) => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  toggleAnimations: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      boardTheme: 'classic',
      soundEnabled: true,
      animationsEnabled: true,

      setMode: (mode) => {
        set({ mode });
        // Update document class for Tailwind dark mode
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      toggleMode: () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark';
        get().setMode(newMode);
      },

      setBoardTheme: (boardTheme) => set({ boardTheme }),

      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),

      toggleAnimations: () => set((state) => ({ animationsEnabled: !state.animationsEnabled })),
    }),
    {
      name: 'chess-theme-storage',
      onRehydrateStorage: () => (state) => {
        // Apply theme on initial load
        if (state?.mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
    }
  )
);
