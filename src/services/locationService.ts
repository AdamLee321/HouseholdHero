import firestore from '@react-native-firebase/firestore';

export interface MemberLocation {
  uid: string;
  displayName: string;
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: number;
  sharing: boolean;
}

export function subscribeToLocations(
  familyId: string,
  onUpdate: (locations: MemberLocation[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('locations')
    .onSnapshot(snap => {
      const locations: MemberLocation[] = snap.docs.map(doc => ({
        ...(doc.data() as MemberLocation),
      }));
      onUpdate(locations.filter(l => l.sharing));
    });
}

export async function updateLocation(
  familyId: string,
  uid: string,
  displayName: string,
  lat: number,
  lng: number,
  accuracy: number,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('locations')
    .doc(uid)
    .set(
      {
        uid,
        displayName,
        lat,
        lng,
        accuracy,
        updatedAt: Date.now(),
        sharing: true,
      },
      {merge: true},
    );
}

export async function stopSharing(familyId: string, uid: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('locations')
    .doc(uid)
    .set({uid, sharing: false}, {merge: true});
}
