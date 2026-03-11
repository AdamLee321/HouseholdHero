import { create } from 'zustand';

type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>(set => ({
  preference: 'system',
  setPreference: preference => set({ preference }),
}));
