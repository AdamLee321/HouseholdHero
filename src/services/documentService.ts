import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export type FolderVisibility = 'private' | 'everyone' | 'members';

export interface DocumentFolder {
  id: string;
  name: string;
  color: string;
  emoji: string;
  isDefault: boolean;
  visibility: FolderVisibility;
  visibleTo: string[]; // uids, only used when visibility === 'members'
  createdBy: string;
  createdAt: number;
}

export interface FamilyDocument {
  id: string;
  folderId: string;
  name: string;
  size: number;
  mimeType: string;
  downloadURL: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: number;
}

export interface DocMember {
  uid: string;
  displayName: string;
  role: string;
}

export const FOLDER_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E',
  '#10B981', '#06B6D4', '#3B82F6', '#8B5CF6',
  '#EC4899', '#6B7280',
];

function foldersRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('documentFolders');
}

function documentsRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('documents');
}

// ── Seeding ───────────────────────────────────────────────────────────────────

const SHARED_DEFAULTS = [
  {name: 'Family', color: '#F59E0B', emoji: '👨‍👩‍👧‍👦'},
  {name: 'House', color: '#10B981', emoji: '🏠'},
  {name: 'Education', color: '#3B82F6', emoji: '📚'},
];

/** Creates the three shared default folders if they haven't been created yet. */
export async function seedSharedFolders(familyId: string, uid: string) {
  const snap = await foldersRef(familyId).get();
  const hasShared = snap.docs.some(d => {
    const data = d.data();
    return data.isDefault === true && data.visibility === 'everyone';
  });
  if (hasShared) {
    return;
  }
  const batch = firestore().batch();
  const now = Date.now();
  for (const cfg of SHARED_DEFAULTS) {
    const ref = foldersRef(familyId).doc();
    batch.set(ref, {
      ...cfg,
      isDefault: true,
      visibility: 'everyone',
      visibleTo: [],
      createdBy: uid,
      createdAt: now,
    });
  }
  await batch.commit();
}

/** Ensures the current user has a Private folder. Safe to call on every mount. */
export async function ensurePrivateFolder(familyId: string, uid: string) {
  const snap = await foldersRef(familyId).get();
  const hasPrivate = snap.docs.some(d => {
    const data = d.data();
    return data.visibility === 'private' && data.createdBy === uid;
  });
  if (hasPrivate) {
    return;
  }
  await foldersRef(familyId).add({
    name: 'Private',
    color: '#8B5CF6',
    emoji: '🔒',
    isDefault: true,
    visibility: 'private',
    visibleTo: [],
    createdBy: uid,
    createdAt: Date.now(),
  });
}

// ── Folders ───────────────────────────────────────────────────────────────────

export function subscribeToFolders(
  familyId: string,
  uid: string,
  role: string,
  onUpdate: (folders: DocumentFolder[]) => void,
) {
  return foldersRef(familyId).onSnapshot(snap => {
    if (!snap) {
      return;
    }
    const folders = snap.docs
      .map(d => ({id: d.id, ...(d.data() as Omit<DocumentFolder, 'id'>)}))
      .filter(f => {
        if (f.visibility === 'private') {
          if (role === 'child') {
            return false;
          }
          return f.createdBy === uid;
        }
        if (f.visibility === 'members') {
          return f.visibleTo.includes(uid);
        }
        return true; // 'everyone'
      })
      .sort((a, b) => a.createdAt - b.createdAt);
    onUpdate(folders);
  });
}

export async function addFolder(
  familyId: string,
  uid: string,
  data: Pick<DocumentFolder, 'name' | 'color' | 'emoji' | 'visibility' | 'visibleTo'>,
) {
  await foldersRef(familyId).add({
    ...data,
    isDefault: false,
    createdBy: uid,
    createdAt: Date.now(),
  });
}

export async function updateFolder(
  familyId: string,
  folderId: string,
  data: Partial<Pick<DocumentFolder, 'name' | 'color' | 'emoji' | 'visibility' | 'visibleTo'>>,
) {
  await foldersRef(familyId).doc(folderId).update(data);
}

export async function deleteFolder(familyId: string, folderId: string) {
  const docs = await documentsRef(familyId)
    .where('folderId', '==', folderId)
    .get();
  const batch = firestore().batch();
  for (const doc of docs.docs) {
    try {
      await storage()
        .ref((doc.data() as FamilyDocument).storagePath)
        .delete();
    } catch {}
    batch.delete(doc.ref);
  }
  await batch.commit();
  await foldersRef(familyId).doc(folderId).delete();
}

// ── Documents ─────────────────────────────────────────────────────────────────

export function subscribeToDocumentsInFolder(
  familyId: string,
  folderId: string,
  onUpdate: (docs: FamilyDocument[]) => void,
) {
  return documentsRef(familyId)
    .where('folderId', '==', folderId)
    .onSnapshot(snap => {
      const docs = (snap?.docs ?? [])
        .map(d => ({id: d.id, ...(d.data() as Omit<FamilyDocument, 'id'>)}))
        .sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(docs);
    });
}

export function subscribeToDocumentCounts(
  familyId: string,
  onUpdate: (counts: Record<string, number>) => void,
) {
  return documentsRef(familyId).onSnapshot(snap => {
    const counts: Record<string, number> = {};
    (snap?.docs ?? []).forEach(d => {
      const fid = (d.data() as FamilyDocument).folderId;
      counts[fid] = (counts[fid] ?? 0) + 1;
    });
    onUpdate(counts);
  });
}

export async function uploadDocument(
  familyId: string,
  folderId: string,
  uid: string,
  userName: string,
  file: {uri: string; name: string; size: number; type: string},
  onProgress?: (pct: number) => void,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `families/${familyId}/documents/${folderId}/${Date.now()}_${safeName}`;
  const ref = storage().ref(storagePath);
  const task = ref.putFile(file.uri);
  if (onProgress) {
    task.on('state_changed', snapshot => {
      onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
    });
  }
  await task;
  const downloadURL = await ref.getDownloadURL();
  await documentsRef(familyId).add({
    folderId,
    name: file.name,
    size: file.size,
    mimeType: file.type,
    downloadURL,
    storagePath,
    uploadedBy: uid,
    uploadedByName: userName,
    createdAt: Date.now(),
  });
}

export async function deleteDocument(
  familyId: string,
  docId: string,
  storagePath: string,
) {
  await storage().ref(storagePath).delete();
  await documentsRef(familyId).doc(docId).delete();
}

export async function getFamilyMembers(familyId: string): Promise<DocMember[]> {
  const snap = await firestore()
    .collection('users')
    .where('familyId', '==', familyId)
    .get();
  return snap.docs.map(d => ({
    uid: d.id,
    displayName: d.data().displayName ?? 'Unknown',
    role: d.data().role ?? 'parent',
  }));
}
