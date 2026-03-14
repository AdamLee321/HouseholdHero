import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { ensureFamilyChat } from './chatService';

export type MemberRole = 'admin' | 'parent' | 'guardian' | 'child';

export interface FamilyMember {
  uid: string;
  displayName: string;
  email: string | null;
  role: MemberRole;
}

export interface Family {
  id: string;
  name: string;
  parentInviteCode: string;
  guardianInviteCode: string;
  childInviteCode: string;
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

  const familyRef = firestore().collection('families').doc();

  const family: Omit<Family, 'id'> = {
    name: familyName.trim(),
    parentInviteCode: generateInviteCode(),
    guardianInviteCode: generateInviteCode(),
    childInviteCode: generateInviteCode(),
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

  // Create the default family group chat immediately
  await ensureFamilyChat(familyRef.id, familyName.trim(), [user.uid]);

  return { id: familyRef.id, ...family };
}

export async function joinFamily(
  inviteCode: string,
  displayName: string,
): Promise<Family> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const code = inviteCode.trim().toUpperCase();

  // Check parent → guardian → child codes in order
  let role: 'parent' | 'guardian' | 'child' = 'parent';
  let snap = await firestore()
    .collection('families')
    .where('parentInviteCode', '==', code)
    .limit(1)
    .get();

  if (snap.empty) {
    snap = await firestore()
      .collection('families')
      .where('guardianInviteCode', '==', code)
      .limit(1)
      .get();
    if (!snap.empty) {
      role = 'guardian';
    }
  }

  if (snap.empty) {
    snap = await firestore()
      .collection('families')
      .where('childInviteCode', '==', code)
      .limit(1)
      .get();
    if (!snap.empty) {
      role = 'child';
    }
  }

  if (snap.empty) {
    throw new Error('Invalid invite code. Please check and try again.');
  }

  const doc = snap.docs[0];
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

  // Add the new member to the family chat
  await ensureFamilyChat(family.id, family.name, [...family.members, user.uid]);

  return family;
}

export async function regenerateInviteCode(
  familyId: string,
  role: 'parent' | 'guardian' | 'child',
): Promise<string> {
  const newCode = generateInviteCode();
  const field =
    role === 'parent' ? 'parentInviteCode' :
    role === 'guardian' ? 'guardianInviteCode' : 'childInviteCode';
  await firestore().collection('families').doc(familyId).update({
    [field]: newCode,
  });
  return newCode;
}

export async function loadUserProfile(): Promise<UserProfile | null> {
  const user = auth().currentUser;
  if (!user) {
    return null;
  }

  const doc = await firestore().collection('users').doc(user.uid).get();
  const docExists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;
  if (!docExists) {
    return null;
  }

  return { uid: user.uid, ...doc.data() } as UserProfile;
}

export async function loadFamily(familyId: string): Promise<Family | null> {
  const doc = await firestore().collection('families').doc(familyId).get();
  const docExists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;
  if (!docExists) {
    return null;
  }

  const data = doc.data()!;
  const updates: Partial<Record<string, string>> = {};

  if (!data.parentInviteCode) { updates.parentInviteCode = generateInviteCode(); }
  if (!data.guardianInviteCode) { updates.guardianInviteCode = generateInviteCode(); }
  if (!data.childInviteCode) { updates.childInviteCode = generateInviteCode(); }

  if (Object.keys(updates).length > 0) {
    await doc.ref.update(updates);
    Object.assign(data, updates);
  }

  const family = { id: doc.id, ...data } as Family;
  // Ensure the family group chat exists (idempotent)
  ensureFamilyChat(family.id, family.name, family.members).catch(e => console.warn('[ensureFamilyChat] failed:', e));
  return family;
}
