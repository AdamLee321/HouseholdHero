import { create } from 'zustand';
import { Family, UserProfile } from '../services/familyService';
import { TileAccess, DEFAULT_TILE_ACCESS } from '../services/tileAccessService';

interface FamilyState {
  family: Family | null;
  profile: UserProfile | null;
  tileAccess: TileAccess;
  loading: boolean;
  setFamily: (family: Family | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setTileAccess: (access: TileAccess) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useFamilyStore = create<FamilyState>(set => ({
  family: null,
  profile: null,
  tileAccess: DEFAULT_TILE_ACCESS,
  loading: false,
  setFamily: family => set({ family }),
  setProfile: profile => set({ profile }),
  setTileAccess: tileAccess => set({ tileAccess }),
  setLoading: loading => set({ loading }),
  reset: () => set({ family: null, profile: null, tileAccess: DEFAULT_TILE_ACCESS, loading: false }),
}));
