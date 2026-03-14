import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export type MemberRole = 'admin' | 'parent' | 'guardian';

export interface FamilyMember {
  uid: string;
  displayName: string;
  email: string | null;
  role: MemberRole;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  members: string[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string | null;
  familyId: string | null;
  role?: MemberRole;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createFamily(
  familyName: string,
  displayName: string,
): Promise<Family> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const inviteCode = generateInviteCode();
  const familyRef = firestore().collection('families').doc();

  const family: Omit<Family, 'id'> = {
    name: familyName.trim(),
    inviteCode,
    createdBy: user.uid,
    members: [user.uid],
  };

  await familyRef.set(family);

  await firestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        displayName: displayName.trim(),
        email: user.email ?? null,
        familyId: familyRef.id,
        role: 'admin',
      },
      { merge: true },
    );

  return { id: familyRef.id, ...family };
}

export async function joinFamily(
  inviteCode: string,
  displayName: string,
  role: 'parent' | 'guardian' = 'parent',
): Promise<Family> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const snapshot = await firestore()
    .collection('families')
    .where('inviteCode', '==', inviteCode.trim().toUpperCase())
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  const doc = snapshot.docs[0];
  const family = { id: doc.id, ...doc.data() } as Family;

  await doc.ref.update({
    members: firestore.FieldValue.arrayUnion(user.uid),
  });

  await firestore()
    .collection('users')
    .doc(user.uid)
    .set(
      {
        uid: user.uid,
        displayName: displayName.trim(),
        email: user.email ?? null,
        familyId: doc.id,
        role,
      },
      { merge: true },
    );

  return family;
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const user = auth().currentUser;
  if (!user) {
    return null;
  }

  const doc = await firestore().collection('users').doc(user.uid).get();
  if (!doc.exists) {
    return null;
  }

  return doc.data() as UserProfile;
}

export async function loadFamily(familyId: string): Promise<Family | null> {
  const doc = await firestore().collection('families').doc(familyId).get();
  if (!doc.exists) {
    return null;
  }
  return { id: doc.id, ...doc.data() } as Family;
}
