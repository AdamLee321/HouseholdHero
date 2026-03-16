import firestore from '@react-native-firebase/firestore';

// ── Types ──────────────────────────────────────────────────────────────────────

export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealSlot {
  name: string;
  recipeId?: string;
}

export type DayPlan = Partial<Record<MealType, MealSlot | null>>;
export type WeekPlan = Partial<Record<DayOfWeek, DayPlan>>;

export interface MealPlanUpdate {
  uid: string;
  displayName: string;
  day: DayOfWeek;
  mealType: MealType;
  slotName: string | null; // null = removed
  updatedAt: number;
}

export interface MealPlan {
  weekStart: string; // "YYYY-MM-DD" of the Monday
  days: WeekPlan;
  lastUpdate?: MealPlanUpdate;
}

// ── Constants ──────────────────────────────────────────────────────────────────

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

// ── Date helpers ───────────────────────────────────────────────────────────────

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toWeekKey(monday: Date): string {
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startStr = monday.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const endStr = sunday.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export function getDayDate(monday: Date, dayIndex: number): Date {
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIndex);
  return d;
}

// ── Firestore ──────────────────────────────────────────────────────────────────

function planRef(familyId: string, weekStart: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('mealPlan')
    .doc(weekStart);
}

export function subscribeMealPlan(
  familyId: string,
  weekStart: string,
  onUpdate: (plan: MealPlan) => void,
) {
  return planRef(familyId, weekStart).onSnapshot(
    snap => {
      const data = snap?.data() as Partial<MealPlan> | undefined;
      onUpdate({ weekStart, days: data?.days ?? {} });
    },
    () => onUpdate({ weekStart, days: {} }),
  );
}

export async function setMealSlot(
  familyId: string,
  weekStart: string,
  day: DayOfWeek,
  mealType: MealType,
  slot: MealSlot | null,
  updatedBy?: { uid: string; displayName: string },
) {
  const lastUpdate: MealPlanUpdate | undefined = updatedBy
    ? {
        uid: updatedBy.uid,
        displayName: updatedBy.displayName,
        day,
        mealType,
        slotName: slot?.name ?? null,
        updatedAt: Date.now(),
      }
    : undefined;

  await planRef(familyId, weekStart).set(
    {
      days: { [day]: { [mealType]: slot ?? firestore.FieldValue.delete() } },
      ...(lastUpdate ? { lastUpdate } : {}),
    },
    { merge: true },
  );
}

export async function clearWeek(familyId: string, weekStart: string) {
  await planRef(familyId, weekStart).delete();
}
