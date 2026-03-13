import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export interface GalleryPhoto {
  id: string;
  downloadURL: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: number;
}

function photosRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('photos');
}

export function subscribeToPhotos(
  familyId: string,
  onUpdate: (photos: GalleryPhoto[]) => void,
) {
  return photosRef(familyId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      onUpdate(
        (snap?.docs ?? []).map(d => ({
          id: d.id,
          ...(d.data() as Omit<GalleryPhoto, 'id'>),
        })),
      );
    });
}

export async function uploadPhoto(
  familyId: string,
  uid: string,
  userName: string,
  imageUri: string,
  onProgress?: (pct: number) => void,
) {
  const ext = imageUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const storagePath = `families/${familyId}/gallery/${Date.now()}.${ext}`;
  const ref = storage().ref(storagePath);

  const task = ref.putFile(imageUri);

  if (onProgress) {
    task.on('state_changed', snapshot => {
      onProgress(snapshot.bytesTransferred / snapshot.totalBytes);
    });
  }

  await task;
  const downloadURL = await ref.getDownloadURL();

  await photosRef(familyId).add({
    downloadURL,
    storagePath,
    uploadedBy: uid,
    uploadedByName: userName,
    createdAt: Date.now(),
  });
}

export async function deletePhoto(
  familyId: string,
  photoId: string,
  storagePath: string,
) {
  await storage().ref(storagePath).delete();
  await photosRef(familyId).doc(photoId).delete();
}
