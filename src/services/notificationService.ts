import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance, TriggerType } from '@notifee/react-native';
import { getCurrentScreenName } from '../navigation/navigationRef';
import { NotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from './notificationPrefsService';

// ── Pref cache (updated by useBackgroundNotifications) ───────────────────────

let _prefs: NotificationPrefs = DEFAULT_NOTIFICATION_PREFS;

export function updateCachedPrefs(prefs: NotificationPrefs): void {
  _prefs = prefs;
}

export function getCachedPref<K extends keyof NotificationPrefs>(key: K): NotificationPrefs[K] {
  return _prefs[key];
}

// ── Permission ────────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true;
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

export async function bootstrapNotifications(): Promise<void> {
  await Promise.all([
    notifee.createChannel({ id: 'chores', name: 'Chores', importance: AndroidImportance.HIGH }),
    notifee.createChannel({ id: 'messages', name: 'Messages', importance: AndroidImportance.HIGH }),
    notifee.createChannel({ id: 'calendar', name: 'Calendar', importance: AndroidImportance.HIGH }),
    notifee.createChannel({ id: 'timetable', name: 'Timetable', importance: AndroidImportance.HIGH }),
    notifee.createChannel({ id: 'specialDays', name: 'Special Days', importance: AndroidImportance.HIGH }),
    notifee.createChannel({ id: 'general', name: 'General', importance: AndroidImportance.DEFAULT }),
  ]);
}

// ── FCM Token ─────────────────────────────────────────────────────────────────

export async function registerFCMToken(): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) { return; }
  try {
    const granted = await requestNotificationPermission();
    if (!granted) { return; }
    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    await saveFCMToken(uid, token);
    messaging().onTokenRefresh(newToken => saveFCMToken(uid, newToken));
  } catch (e) {
    console.warn('FCM registration failed:', e);
  }
}

export function setupForegroundNotifications(): () => void {
  return messaging().onMessage(async remoteMessage => {
    const type = remoteMessage.data?.type as string | undefined;
    const screen = getCurrentScreenName();
    if (type === 'new_message' && (screen === 'Messages' || screen === 'Chat')) { return; }
    const title = remoteMessage.notification?.title ?? (remoteMessage.data?.title as string | undefined);
    const body = remoteMessage.notification?.body ?? (remoteMessage.data?.body as string | undefined);
    if (!title && !body) { return; }
    try {
      await notifee.displayNotification({
        title,
        body,
        android: { channelId: 'general', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      });
    } catch (e) {
      console.warn('Notifee foreground display failed:', e);
    }
  });
}

async function saveFCMToken(uid: string, token: string): Promise<void> {
  await firestore().collection('users').doc(uid).update({ fcmToken: token });
}

// ── Display notifications ─────────────────────────────────────────────────────

export async function showBadgeNotification(badgeName: string, badgeEmoji: string): Promise<void> {
  try {
    await notifee.displayNotification({
      id: `badge_${Date.now()}`,
      title: `${badgeEmoji} Badge Earned!`,
      body: `You earned the "${badgeName}" badge. Keep it up!`,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showBadgeNotification failed:', e);
  }
}

export async function showMessageNotification(
  senderName: string,
  chatName: string,
  text: string,
): Promise<void> {
  try {
    await notifee.displayNotification({
      id: `msg_${Date.now()}`,
      title: `💬 ${senderName}`,
      body: chatName ? `${chatName}: ${text}` : text,
      android: { channelId: 'messages', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showMessageNotification failed:', e);
  }
}

export async function showShoppingNotification(
  addedByName: string,
  itemName: string,
): Promise<void> {
  try {
    await notifee.displayNotification({
      id: 'shopping',
      title: '🛒 Shopping List Updated',
      body: `${addedByName} added "${itemName}" to the shopping list`,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showShoppingNotification failed:', e);
  }
}

export async function showGalleryNotification(uploaderName: string): Promise<void> {
  try {
    await notifee.displayNotification({
      id: 'gallery',
      title: '📷 New Photo Added',
      body: `${uploaderName} added a new photo to the family gallery`,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showGalleryNotification failed:', e);
  }
}

export async function showContactsNotification(contactName: string): Promise<void> {
  try {
    await notifee.displayNotification({
      id: 'contacts',
      title: '🚨 Emergency Contacts Updated',
      body: `"${contactName}" was added to the emergency contacts`,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showContactsNotification failed:', e);
  }
}

export async function showActivityNotification(body: string): Promise<void> {
  try {
    await notifee.displayNotification({
      id: 'activity',
      title: '📋 Family Activity',
      body,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showActivityNotification failed:', e);
  }
}

export async function showMealPlannerNotification(
  updatedByName: string,
  action: 'added' | 'changed' | 'removed',
  mealName: string,
  dayLabel: string,
  mealLabel: string,
): Promise<void> {
  const actionText = action === 'added' ? 'added' : action === 'changed' ? 'updated' : 'removed';
  const body = action === 'removed'
    ? `${updatedByName} removed ${mealLabel} on ${dayLabel}`
    : `${updatedByName} ${actionText} "${mealName}" for ${mealLabel} on ${dayLabel}`;
  try {
    await notifee.displayNotification({
      id: 'meal_planner',
      title: '🍽️ Meal Plan Updated',
      body,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showMealPlannerNotification failed:', e);
  }
}

export async function showLocationNotification(memberName: string): Promise<void> {
  try {
    await notifee.displayNotification({
      id: `location_${memberName}`,
      title: '📍 Location Sharing',
      body: `${memberName} started sharing their location`,
      android: { channelId: 'general', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    });
  } catch (e) {
    console.warn('showLocationNotification failed:', e);
  }
}

// ── Scheduled notifications ───────────────────────────────────────────────────

type ChoreFrequency = 'daily' | 'weekly' | 'monthly';

function nextChoreReminderTime(frequency: ChoreFrequency): number {
  const now = new Date();
  const next = new Date(now);
  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
    next.setHours(9, 0, 0, 0);
  } else if (frequency === 'weekly') {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    next.setDate(next.getDate() + daysUntilMonday);
    next.setHours(9, 0, 0, 0);
  } else {
    next.setMonth(next.getMonth() + 1, 1);
    next.setHours(9, 0, 0, 0);
  }
  return next.getTime();
}

export async function scheduleChoreReminder(
  choreId: string,
  choreName: string,
  frequency: ChoreFrequency,
): Promise<void> {
  try {
    await notifee.createTriggerNotification(
      {
        id: `chore_${choreId}`,
        title: '🧹 Chore Reminder',
        body: `"${choreName}" is due`,
        android: { channelId: 'chores', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      },
      { type: TriggerType.TIMESTAMP, timestamp: nextChoreReminderTime(frequency) },
    );
  } catch (e) {
    console.warn('scheduleChoreReminder failed:', e);
  }
}

export async function cancelChoreReminder(choreId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`chore_${choreId}`);
  } catch (e) {
    console.warn('cancelChoreReminder failed:', e);
  }
}

export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startDate: number,
): Promise<void> {
  const reminderTime = startDate - 60 * 60 * 1000;
  if (reminderTime <= Date.now()) { return; }
  try {
    await notifee.createTriggerNotification(
      {
        id: `event_${eventId}`,
        title: '🗓 Event Reminder',
        body: `"${eventTitle}" starts in 1 hour`,
        android: { channelId: 'calendar', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      },
      { type: TriggerType.TIMESTAMP, timestamp: reminderTime },
    );
  } catch (e) {
    console.warn('scheduleEventReminder failed:', e);
  }
}

export async function cancelEventReminder(eventId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`event_${eventId}`);
  } catch (e) {
    console.warn('cancelEventReminder failed:', e);
  }
}

// ── Timetable notifications ───────────────────────────────────────────────────

type TimetableReminderOption = 'none' | '15min' | '30min' | '1hour' | '2hours' | '4hours' | '1day';

const REMINDER_OFFSETS_MS: Record<TimetableReminderOption, number> = {
  none:    0,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '2hours':2 * 60 * 60 * 1000,
  '4hours':4 * 60 * 60 * 1000,
  '1day':  24 * 60 * 60 * 1000,
};

function nextTimetableOccurrence(
  startTime: string,
  isRecurring: boolean,
  recurringDays: number[],
  date: string | null,
): number | null {
  const [hours, minutes] = startTime.split(':').map(Number);
  const now = Date.now();

  if (!isRecurring && date) {
    const [y, mo, d] = date.split('-').map(Number);
    const t = new Date(y, mo - 1, d, hours, minutes, 0, 0).getTime();
    return t > now ? t : null;
  }

  if (isRecurring && recurringDays.length > 0) {
    for (let offset = 0; offset <= 7; offset++) {
      const candidate = new Date();
      candidate.setDate(candidate.getDate() + offset);
      candidate.setHours(hours, minutes, 0, 0);
      if (recurringDays.includes(candidate.getDay()) && candidate.getTime() > now) {
        return candidate.getTime();
      }
    }
  }

  return null;
}

export async function scheduleTimetableReminder(
  eventId: string,
  eventTitle: string,
  startTime: string,
  isRecurring: boolean,
  recurringDays: number[],
  date: string | null,
  reminder: TimetableReminderOption,
): Promise<void> {
  if (reminder === 'none') { return; }
  const eventTime = nextTimetableOccurrence(startTime, isRecurring, recurringDays, date);
  if (!eventTime) { return; }
  const reminderTime = eventTime - REMINDER_OFFSETS_MS[reminder];
  if (reminderTime <= Date.now()) { return; }
  try {
    await notifee.createTriggerNotification(
      {
        id: `timetable_${eventId}`,
        title: '🗓 Timetable Reminder',
        body: `"${eventTitle}" starts soon`,
        android: { channelId: 'timetable', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      },
      { type: TriggerType.TIMESTAMP, timestamp: reminderTime },
    );
  } catch (e) {
    console.warn('scheduleTimetableReminder failed:', e);
  }
}

export async function cancelTimetableReminder(eventId: string): Promise<void> {
  try {
    await notifee.cancelNotification(`timetable_${eventId}`);
  } catch (e) {
    console.warn('cancelTimetableReminder failed:', e);
  }
}

// ── Special Days notifications ────────────────────────────────────────────────

type SpecialDayReminderOption = 'none' | 'on_day' | '1day' | '3days' | '1week' | '2weeks';

const SPECIAL_DAY_OFFSETS_MS: Record<SpecialDayReminderOption, number> = {
  none:    0,
  on_day:  0,
  '1day':  1 * 24 * 60 * 60 * 1000,
  '3days': 3 * 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
  '2weeks':14 * 24 * 60 * 60 * 1000,
};

function nextSpecialDayOccurrence(
  day: number,
  month: number,
  year: number | null,
): Date {
  const now = new Date();
  if (year !== null) {
    return new Date(year, month - 1, day, 9, 0, 0, 0);
  }
  const thisYear = new Date(now.getFullYear(), month - 1, day, 9, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (thisYear.getTime() >= today.getTime()) {
    return thisYear;
  }
  return new Date(now.getFullYear() + 1, month - 1, day, 9, 0, 0, 0);
}

export async function scheduleSpecialDayReminder(
  id: string,
  title: string,
  day: number,
  month: number,
  year: number | null,
  time: string | null,
  reminder: SpecialDayReminderOption,
): Promise<void> {
  if (reminder === 'none') { return; }
  const [evtH, evtM] = time ? time.split(':').map(Number) : [9, 0];
  const occurrence = nextSpecialDayOccurrence(day, month, year);
  occurrence.setHours(evtH, evtM, 0, 0);
  const occurrenceMs = occurrence.getTime();
  const offset = SPECIAL_DAY_OFFSETS_MS[reminder];
  const reminderTime = occurrenceMs - offset;
  if (reminderTime <= Date.now()) { return; }

  const isOnDay = reminder === 'on_day';
  const body = isOnDay
    ? `Today is ${title}! 🎉`
    : `${title} is coming up soon`;

  try {
    await notifee.createTriggerNotification(
      {
        id: `special_${id}`,
        title: isOnDay ? `🎉 ${title}` : `🗓 Upcoming: ${title}`,
        body,
        android: { channelId: 'specialDays', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      },
      { type: TriggerType.TIMESTAMP, timestamp: reminderTime },
    );
  } catch (e) {
    console.warn('scheduleSpecialDayReminder failed:', e);
  }
}

export async function cancelSpecialDayReminder(id: string): Promise<void> {
  try {
    await notifee.cancelNotification(`special_${id}`);
  } catch (e) {
    console.warn('cancelSpecialDayReminder failed:', e);
  }
}
