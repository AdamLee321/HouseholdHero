import firestore from '@react-native-firebase/firestore';
import { logActivity } from './activityService';

export type TimetableReminderOption =
  | 'none'
  | '15min'
  | '30min'
  | '1hour'
  | '2hours'
  | '4hours'
  | '1day';

export type TimetableEventColor =
  | 'blue'
  | 'purple'
  | 'green'
  | 'orange'
  | 'red'
  | 'teal'
  | 'pink';

export interface TimetableEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;       // "HH:MM" 24h
  endTime: string;         // "HH:MM" 24h
  isRecurring: boolean;
  recurringDays: number[]; // 0=Sun … 6=Sat (when isRecurring=true)
  date: string | null;     // "YYYY-MM-DD" (when isRecurring=false)
  reminder: TimetableReminderOption;
  color: TimetableEventColor;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

export const REMINDER_LABELS: Record<TimetableReminderOption, string> = {
  none:    'No reminder',
  '15min': '15 minutes before',
  '30min': '30 minutes before',
  '1hour': '1 hour before',
  '2hours':'2 hours before',
  '4hours':'4 hours before',
  '1day':  '1 day before',
};

export const REMINDER_OFFSETS_MS: Record<TimetableReminderOption, number> = {
  none:    0,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '2hours':2 * 60 * 60 * 1000,
  '4hours':4 * 60 * 60 * 1000,
  '1day':  24 * 60 * 60 * 1000,
};

export const EVENT_COLORS: Record<
  TimetableEventColor,
  { light: string; dark: string; label: string }
> = {
  blue:   { light: '#4F6EF7', dark: '#6B8AFF', label: 'Blue' },
  purple: { light: '#AF52DE', dark: '#BF5AF2', label: 'Purple' },
  green:  { light: '#34C759', dark: '#32D74B', label: 'Green' },
  orange: { light: '#FF9500', dark: '#FF9F0A', label: 'Orange' },
  red:    { light: '#FF3B30', dark: '#FF453A', label: 'Red' },
  teal:   { light: '#00C7BE', dark: '#5AC8FA', label: 'Teal' },
  pink:   { light: '#FF2D9B', dark: '#FF375F', label: 'Pink' },
};

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Returns "YYYY-MM-DD" for a given Date. */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dy}`;
}

/** Returns "HH:MM" in 12h format, e.g. "9:30 AM". */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/** Checks whether an event occurs on the given Date. */
export function eventOccursOn(event: TimetableEvent, date: Date): boolean {
  if (event.isRecurring) {
    return event.recurringDays.includes(date.getDay());
  }
  return event.date === toDateString(date);
}

function colRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('timetableEvents');
}

export function subscribeToTimetableEvents(
  familyId: string,
  onUpdate: (events: TimetableEvent[]) => void,
): () => void {
  return colRef(familyId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      if (!snap) { return; }
      onUpdate(
        snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<TimetableEvent, 'id'>),
        })),
      );
    });
}

export async function addTimetableEvent(
  familyId: string,
  event: Omit<TimetableEvent, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await colRef(familyId).add({ ...event, createdAt: Date.now() });
  logActivity(familyId, 'timetable_event_added', event.addedBy, event.addedByName, {
    eventTitle: event.title,
  });
  return ref.id;
}

export async function updateTimetableEvent(
  familyId: string,
  eventId: string,
  updates: Partial<Omit<TimetableEvent, 'id' | 'createdAt' | 'addedBy' | 'addedByName'>>,
): Promise<void> {
  await colRef(familyId).doc(eventId).update(updates);
}

export async function deleteTimetableEvent(
  familyId: string,
  eventId: string,
): Promise<void> {
  // Notification cancellation is called from the screen before this
  await colRef(familyId).doc(eventId).delete();
}
