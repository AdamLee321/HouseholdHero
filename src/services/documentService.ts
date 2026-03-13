import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export interface FamilyDocument {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  downloadURL: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: number;
}

export function subscribeToDocuments(
  familyId: string,
  onUpdate: (docs: FamilyDocument[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('documents')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const docs: FamilyDocument[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<FamilyDocument, 'id'>),
      }));
      onUpdate(docs);
    });
}

export async function uploadDocument(
  familyId: string,
  uid: string,
  userName: string,
  file: {uri: string; name: string; size: number; type: string},
  onProgress?: (pct: number) => void,
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `families/${familyId}/documents/${Date.now()}_${safeName}`;
  const ref = storage().ref(storagePath);

  const task = ref.putFile(file.uri);

  if (onProgress) {
    task.on('state_changed', snapshot => {
      const pct =
        snapshot.bytesTransferred / snapshot.totalBytes;
      onProgress(pct);
    });
  }

  await task;
  const downloadURL = await ref.getDownloadURL();

  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('documents')
    .add({
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
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('documents')
    .doc(docId)
    .delete();
}
