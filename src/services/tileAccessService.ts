import firestore from '@react-native-firebase/firestore';

export type TileKey =
  | 'Shopping' | 'Todos' | 'Chores' | 'Calendar' | 'Messages'
  | 'Contacts' | 'Location' | 'Documents' | 'MyFamily' | 'Budget'
  | 'Gallery' | 'Recipes';

export type NonAdminRole = 'parent' | 'guardian' | 'child';

export interface TileAccess {
  parent: TileKey[];
  guardian: TileKey[];
  child: TileKey[];
}

export const ALL_TILES: TileKey[] = [
  'Shopping', 'Todos', 'Chores', 'Calendar', 'Messages',
  'Contacts', 'Location', 'Documents', 'MyFamily', 'Budget',
  'Gallery', 'Recipes',
];

export const DEFAULT_TILE_ACCESS: TileAccess = {
  parent:   ['Shopping', 'Todos', 'Chores', 'Calendar', 'Messages', 'Contacts', 'Location', 'Documents', 'MyFamily', 'Budget', 'Gallery', 'Recipes'],
  guardian: ['Shopping', 'Todos', 'Chores', 'Calendar', 'Messages', 'Contacts', 'Location', 'Documents', 'Gallery', 'Recipes'],
  child:    ['Shopping', 'Todos', 'Chores', 'Calendar', 'Messages', 'Gallery', 'Recipes'],
};

function docRef(familyId: string) {
  return firestore()
    .collection('families').doc(familyId)
    .collection('settings').doc('tileAccess');
}

export function subscribeTileAccess(
  familyId: string,
  onChange: (access: TileAccess) => void,
): () => void {
  return docRef(familyId).onSnapshot(
    snap => {
      if (!snap) { onChange(DEFAULT_TILE_ACCESS); return; }
      if (snap.exists) {
        onChange(snap.data() as TileAccess);
      } else {
        onChange(DEFAULT_TILE_ACCESS);
      }
    },
    () => onChange(DEFAULT_TILE_ACCESS),
  );
}

export async function saveTileAccess(familyId: string, access: TileAccess): Promise<void> {
  await docRef(familyId).set(access);
}
