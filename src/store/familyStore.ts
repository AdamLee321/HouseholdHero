import { create } from 'zustand';
import { Family, UserProfile } from '../services/familyService';

interface FamilyState {
  family: Family | null;
  profile: UserProfile | null;
  loading: boolean;
  setFamily: (family: Family | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useFamilyStore = create<FamilyState>(set => ({
  family: null,
  profile: null,
  loading: false,
  setFamily: family => set({ family }),
  setProfile: profile => set({ profile }),
  setLoading: loading => set({ loading }),
  reset: () => set({ family: null, profile: null, loading: false }),
}));
