import firestore from '@react-native-firebase/firestore';

export interface NotificationPrefs {
  choresDue: boolean;
  choresOverdue: boolean;
  badgeEarned: boolean;
  calendarReminders: boolean;
  chatMessages: boolean;
  shoppingListUpdates: boolean;
  budgetLimitWarning: boolean;
  activityFeed: boolean;
  galleryUploads: boolean;
  emergencyContactsUpdates: boolean;
  locationUpdates: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  choresDue: true,
  choresOverdue: true,
  badgeEarned: true,
  calendarReminders: true,
  chatMessages: true,
  shoppingListUpdates: false,
  budgetLimitWarning: true,
  activityFeed: false,
  galleryUploads: true,
  emergencyContactsUpdates: true,
  locationUpdates: false,
};

function docRef(uid: string) {
  return firestore()
    .collection('users')
    .doc(uid)
    .collection('prefs')
    .doc('notifications');
}

export function subscribeToNotificationPrefs(
  uid: string,
  onUpdate: (prefs: NotificationPrefs) => void,
): () => void {
  return docRef(uid).onSnapshot(snap => {
    const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
    if (exists) {
      onUpdate({ ...DEFAULT_NOTIFICATION_PREFS, ...(snap.data() as Partial<NotificationPrefs>) });
    } else {
      onUpdate(DEFAULT_NOTIFICATION_PREFS);
    }
  });
}

export async function saveNotificationPrefs(
  uid: string,
  prefs: NotificationPrefs,
): Promise<void> {
  await docRef(uid).set(prefs);
}
