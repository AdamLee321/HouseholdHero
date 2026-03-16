import firestore from '@react-native-firebase/firestore';
import { logActivity } from './activityService';

export type SpecialDayType =
  | 'birthday'
  | 'anniversary'
  | 'memorial'
  | 'holiday'
  | 'other';

export type SpecialDayReminderOption =
  | 'none'
  | 'on_day'
  | '1day'
  | '3days'
  | '1week'
  | '2weeks';

export interface SpecialDay {
  id: string;
  title: string;
  type: SpecialDayType;
  day: number;           // 1–31
  month: number;         // 1–12
  year: number | null;   // null = repeats every year; number = one-time
  time: string | null;   // "HH:MM" 24h, null = all day (defaults to 09:00 for notifications)
  memberIds: string[];
  memberNames: string[];
  reminder: SpecialDayReminderOption;
  note: string;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

export const TYPE_META: Record<
  SpecialDayType,
  { label: string; emoji: string }
> = {
  birthday:    { label: 'Birthday',    emoji: '🎂' },
  anniversary: { label: 'Anniversary', emoji: '💍' },
  memorial:    { label: 'Memorial',    emoji: '🕯️' },
  holiday:     { label: 'Holiday',     emoji: '🌴' },
  other:       { label: 'Other',       emoji: '🎉' },
};

export const REMINDER_LABELS: Record<SpecialDayReminderOption, string> = {
  none:    'No reminder',
  on_day:  'On the day',
  '1day':  '1 day before',
  '3days': '3 days before',
  '1week': '1 week before',
  '2weeks':'2 weeks before',
};

export const REMINDER_OFFSETS_MS: Record<SpecialDayReminderOption, number> = {
  none:    0,
  on_day:  0,
  '1day':  1 * 24 * 60 * 60 * 1000,
  '3days': 3 * 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
  '2weeks':14 * 24 * 60 * 60 * 1000,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "15 Jun" or "15 Jun 1990" */
export function formatSpecialDate(day: number, month: number, year: number | null): string {
  const base = `${day} ${MONTH_NAMES[month - 1]}`;
  return year ? `${base} ${year}` : base;
}

/**
 * Returns the next Date when this special day occurs.
 * Uses `time` if provided, otherwise 9:00 AM.
 */
export function nextOccurrence(
  day: number,
  month: number,
  year: number | null,
  time: string | null = null,
): Date {
  const [h, m] = time ? time.split(':').map(Number) : [9, 0];
  const now = new Date();
  if (year !== null) {
    return new Date(year, month - 1, day, h, m, 0, 0);
  }
  const thisYear = new Date(now.getFullYear(), month - 1, day, h, m, 0, 0);
  if (thisYear.getTime() > Date.now()) {
    return thisYear;
  }
  return new Date(now.getFullYear() + 1, month - 1, day, h, m, 0, 0);
}

/** Returns whole days until next occurrence (0 = today). */
export function daysUntil(
  day: number,
  month: number,
  year: number | null,
  time: string | null = null,
): number {
  const target = nextOccurrence(day, month, year, time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDay = new Date(target);
  targetDay.setHours(0, 0, 0, 0);
  return Math.round((targetDay.getTime() - today.getTime()) / 86400000);
}

/** Milliseconds until the next occurrence (can be negative if in the past). */
export function msUntil(
  day: number,
  month: number,
  year: number | null,
  time: string | null = null,
): number {
  return nextOccurrence(day, month, year, time).getTime() - Date.now();
}

/** Live countdown string, e.g. "3d 4h 12m 5s" or "2h 5m 30s". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) { return 'Now! 🎉'; }
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) { return `${d}d ${h}h ${String(min).padStart(2, '0')}m`; }
  return `${h}h ${String(min).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export function countdownLabel(days: number): string {
  if (days === 0) { return 'Today! 🎉'; }
  if (days === 1) { return 'Tomorrow'; }
  return `In ${days} days`;
}

/** "9:30 AM" from "09:30" */
export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function colRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('specialDays');
}

export function subscribeToSpecialDays(
  familyId: string,
  onUpdate: (days: SpecialDay[]) => void,
): () => void {
  return colRef(familyId)
    .onSnapshot(snap => {
      if (!snap) { return; }
      const items = snap.docs
        .map(d => ({ id: d.id, ...(d.data() as Omit<SpecialDay, 'id'>) }))
        .sort((a, b) => a.createdAt - b.createdAt);
      onUpdate(items);
    });
}

export async function addSpecialDay(
  familyId: string,
  data: Omit<SpecialDay, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await colRef(familyId).add({ ...data, createdAt: Date.now() });
  logActivity(familyId, 'special_day_added', data.addedBy, data.addedByName, {
    title: data.title,
  });
  return ref.id;
}

export async function updateSpecialDay(
  familyId: string,
  id: string,
  updates: Partial<Omit<SpecialDay, 'id' | 'createdAt' | 'addedBy' | 'addedByName'>>,
): Promise<void> {
  await colRef(familyId).doc(id).update(updates);
}

export async function deleteSpecialDay(familyId: string, id: string): Promise<void> {
  await colRef(familyId).doc(id).delete();
}
