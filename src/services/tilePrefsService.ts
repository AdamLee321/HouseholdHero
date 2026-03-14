import firestore from '@react-native-firebase/firestore';
import { TilePref } from '../types';

export const DEFAULT_TILE_ORDER: string[] = [
  'Shopping', 'Todos', 'Chores', 'Calendar', 'Messages',
  'Contacts', 'Location', 'Documents', 'MyFamily', 'Budget',
  'Gallery', 'Recipes',
];

const DEFAULT_PREFS: TilePref = { order: DEFAULT_TILE_ORDER, hidden: [] };

function docRef(uid: string) {
  return firestore().collection('users').doc(uid).collection('prefs').doc('tiles');
}

export async function saveTilePrefs(uid: string, prefs: TilePref): Promise<void> {
  await docRef(uid).set(prefs);
}

export function subscribeTilePrefs(
  uid: string,
  onUpdate: (prefs: TilePref) => void,
): () => void {
  return docRef(uid).onSnapshot(snap => {
    const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
    if (!exists) {
      onUpdate(DEFAULT_PREFS);
    } else {
      onUpdate(snap.data() as TilePref);
    }
  });
}
