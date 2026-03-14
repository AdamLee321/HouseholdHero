import firestore from '@react-native-firebase/firestore';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
  type: 'shared' | 'personal';
  locked: boolean; // shared contacts only — cannot be deleted
  ownerId: string | null; // personal contacts only
  ownerName: string | null; // personal contacts only
  addedBy: string;
  createdAt: number;
}

export function subscribeToContacts(
  familyId: string,
  uid: string,
  onUpdate: (contacts: EmergencyContact[]) => void,
) {
  // Subscribe to all shared contacts + this user's personal contacts
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('emergencyContacts')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      const all: EmergencyContact[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<EmergencyContact, 'id'>),
      }));
      // Filter: all shared + only own personal
      const visible = all.filter(
        c => c.type === 'shared' || c.ownerId === uid,
      );
      onUpdate(visible);
    });
}

export async function addContact(
  familyId: string,
  contact: Omit<EmergencyContact, 'id' | 'createdAt'>,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('emergencyContacts')
    .add({
      ...contact,
      createdAt: Date.now(),
    });
}

export async function updateContact(
  familyId: string,
  contactId: string,
  fields: Partial<Pick<EmergencyContact, 'name' | 'phone' | 'relation' | 'locked'>>,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('emergencyContacts')
    .doc(contactId)
    .update(fields);
}

export async function deleteContact(familyId: string, contactId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('emergencyContacts')
    .doc(contactId)
    .delete();
}

export async function toggleLock(
  familyId: string,
  contactId: string,
  locked: boolean,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('emergencyContacts')
    .doc(contactId)
    .update({locked: !locked});
}
