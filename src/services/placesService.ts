import firestore from '@react-native-firebase/firestore';
import { FamilyPlace, PlaceType } from '../types';

export interface PlaceConfig {
  emoji: string;
  color: string;
  label: string;
  priority: boolean;
}

export const PLACE_CONFIG: Record<PlaceType, PlaceConfig> = {
  home:     { emoji: '🏠', color: '#FF6B35', label: 'Home',     priority: true  },
  work:     { emoji: '💼', color: '#5856D6', label: 'Work',     priority: true  },
  school:   { emoji: '🏫', color: '#34C759', label: 'School',   priority: false },
  park:     { emoji: '🌳', color: '#30B050', label: 'Park',     priority: false },
  music:    { emoji: '🎵', color: '#AF52DE', label: 'Music',    priority: false },
  doctor:   { emoji: '🩺', color: '#00C7BE', label: 'Doctor',   priority: false },
  hospital: { emoji: '🏥', color: '#FF3B30', label: 'Hospital', priority: false },
  other:    { emoji: '📌', color: '#FF9500', label: 'Other',    priority: false },
};

function placesRef(familyId: string) {
  return firestore().collection('families').doc(familyId).collection('places');
}

export function subscribePlaces(
  familyId: string,
  onUpdate: (places: FamilyPlace[]) => void,
): () => void {
  return placesRef(familyId).onSnapshot(snap => {
    const places = snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<FamilyPlace, 'id'>) }));
    onUpdate(places);
  });
}

export async function addPlace(
  familyId: string,
  place: Omit<FamilyPlace, 'id'>,
): Promise<void> {
  const ref = placesRef(familyId).doc();
  await ref.set({ ...place, id: ref.id });
}

export async function updatePlace(
  familyId: string,
  placeId: string,
  updates: Partial<Omit<FamilyPlace, 'id'>>,
): Promise<void> {
  await placesRef(familyId).doc(placeId).update(updates);
}

export async function deletePlace(familyId: string, placeId: string): Promise<void> {
  await placesRef(familyId).doc(placeId).delete();
}
