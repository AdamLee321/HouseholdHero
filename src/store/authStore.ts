import { create } from 'zustand';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

interface AuthState {
  user: FirebaseAuthTypes.User | null;
  initialising: boolean;
  setUser: (user: FirebaseAuthTypes.User | null) => void;
  setInitialising: (value: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  initialising: true,
  setUser: user => set({ user }),
  setInitialising: value => set({ initialising: value }),
  signOut: async () => {
    await auth().signOut();
    set({ user: null });
  },
}));
