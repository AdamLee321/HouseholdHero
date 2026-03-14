import firestore from '@react-native-firebase/firestore';

export type ChoreFrequency = 'daily' | 'weekly' | 'monthly';
export type ChoreEffort = 'easy' | 'medium' | 'hard';
export type ChoreStatus = 'pending' | 'in_progress' | 'done';

export const EFFORT_POINTS: Record<ChoreEffort, number> = {
  easy: 1,
  medium: 3,
  hard: 5,
};

export interface Room {
  id: string;
  name: string;
  createdAt: number;
}

export interface Chore {
  id: string;
  name: string;
  roomId: string;
  roomName: string;
  assignedTo: string | null;
  assignedToName: string | null;
  frequency: ChoreFrequency;
  status: ChoreStatus;
  effort: ChoreEffort;
  note: string;
  lastCompletedAt: number | null;
  completedBy: string | null;
  completedByName: string | null;
  createdAt: number;
}

export interface ChorePoints {
  uid: string;
  displayName: string;
  points: number;
  completedCount: number;
}

function isDue(chore: Chore): boolean {
  if (!chore.lastCompletedAt) {
    return true;
  }
  const now = Date.now();
  const last = chore.lastCompletedAt;
  if (chore.frequency === 'daily') {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return last < todayStart.getTime();
  }
  if (chore.frequency === 'weekly') {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return last < monday.getTime();
  }
  if (chore.frequency === 'monthly') {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return last < monthStart.getTime();
  }
  return true;
}

export { isDue };

export function subscribeToRooms(
  familyId: string,
  onUpdate: (rooms: Room[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('rooms')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Room)));
    });
}

export function subscribeToChores(
  familyId: string,
  onUpdate: (chores: Chore[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('chores')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      onUpdate(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chore)));
    });
}

export function subscribeToLeaderboard(
  familyId: string,
  onUpdate: (board: ChorePoints[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('chorePoints')
    .orderBy('points', 'desc')
    .onSnapshot(snap => {
      onUpdate(snap.docs.map(d => ({ uid: d.id, ...d.data() } as ChorePoints)));
    });
}

export async function createRoom(familyId: string, name: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('rooms')
    .add({ name: name.trim(), createdAt: Date.now() });
}

export async function createChore(
  familyId: string,
  data: {
    name: string;
    roomId: string;
    roomName: string;
    assignedTo: string | null;
    assignedToName: string | null;
    frequency: ChoreFrequency;
    effort: ChoreEffort;
    note: string;
  },
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('chores')
    .add({
      ...data,
      name: data.name.trim(),
      note: data.note.trim(),
      status: 'pending',
      lastCompletedAt: null,
      completedBy: null,
      completedByName: null,
      createdAt: Date.now(),
    });
}

export async function updateChoreStatus(
  familyId: string,
  chore: Chore,
  newStatus: ChoreStatus,
  uid: string,
  displayName: string,
) {
  const update: Partial<Chore> = { status: newStatus };

  if (newStatus === 'done') {
    update.lastCompletedAt = Date.now();
    update.completedBy = uid;
    update.completedByName = displayName;

    // Award points
    const pointsRef = firestore()
      .collection('families')
      .doc(familyId)
      .collection('chorePoints')
      .doc(uid);
    const snap = await pointsRef.get();
    const snapExists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
    if (snapExists) {
      await pointsRef.update({
        points: firestore.FieldValue.increment(EFFORT_POINTS[chore.effort]),
        completedCount: firestore.FieldValue.increment(1),
      });
    } else {
      await pointsRef.set({
        displayName,
        points: EFFORT_POINTS[chore.effort],
        completedCount: 1,
      });
    }
  }

  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('chores')
    .doc(chore.id)
    .update(update);
}

export async function deleteChore(familyId: string, choreId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('chores')
    .doc(choreId)
    .delete();
}

export async function deleteRoom(familyId: string, roomId: string) {
  // Delete all chores in this room
  const chores = await firestore()
    .collection('families')
    .doc(familyId)
    .collection('chores')
    .where('roomId', '==', roomId)
    .get();
  const batch = firestore().batch();
  chores.docs.forEach(d => batch.delete(d.ref));
  batch.delete(
    firestore()
      .collection('families')
      .doc(familyId)
      .collection('rooms')
      .doc(roomId),
  );
  await batch.commit();
}
