import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const { WidgetDataModule } = NativeModules;

const isAndroid = Platform.OS === 'android';

export const WIDGET_SHOPPING_KEY = '@widget_shopping_list';

export interface WidgetShoppingData {
  familyId: string;
  listId: string;
  listName: string;
  uncheckedCount: number;
  items: Array<{ id: string; name: string; checked: boolean }>;
}

export interface WidgetChoreItem {
  id: string;
  name: string;
  roomName: string;
  status: string;
}

export interface WidgetChoresData {
  familyId: string;
  pendingCount: number;
  items: WidgetChoreItem[];
}

export interface WidgetData {
  shopping?: WidgetShoppingData;
  chores?: WidgetChoresData;
}

let cachedData: WidgetData = {};

function push() {
  if (!isAndroid || !WidgetDataModule?.update) { return; }
  try {
    WidgetDataModule.update(JSON.stringify(cachedData));
  } catch (_) {}
}

export function updateWidgetShopping(data: WidgetShoppingData) {
  cachedData = { ...cachedData, shopping: data };
  push();
}

export function updateWidgetChores(data: WidgetChoresData) {
  cachedData = { ...cachedData, chores: data };
  push();
}

/**
 * Save the user's preferred widget shopping list and immediately refresh the widget.
 */
export async function setWidgetShoppingList(familyId: string, listId: string) {
  if (!isAndroid) { return; }
  await AsyncStorage.setItem(WIDGET_SHOPPING_KEY, JSON.stringify({ familyId, listId }));
  refreshWidgetShoppingFromFirestore(familyId, listId);
}

/**
 * Fetch and push shopping data for an explicit list.
 */
export async function refreshWidgetShoppingFromFirestore(
  familyId: string,
  listId: string,
) {
  if (!isAndroid) { return; }
  try {
    const [listSnap, itemsSnap] = await Promise.all([
      firestore()
        .collection('families').doc(familyId)
        .collection('shoppingLists').doc(listId)
        .get(),
      firestore()
        .collection('families').doc(familyId)
        .collection('shoppingLists').doc(listId)
        .collection('items')
        .orderBy('createdAt', 'asc')
        .limit(5)
        .get(),
    ]);

    if (!listSnap.exists) { return; }
    const list = listSnap.data()!;

    const items = itemsSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name as string,
      checked: d.data().checked as boolean,
    }));

    updateWidgetShopping({
      familyId,
      listId,
      listName: list.name ?? 'Shopping',
      uncheckedCount: list.uncheckedCount ?? 0,
      items,
    });
  } catch (_) {}
}

/**
 * Refresh the shopping widget using the user's saved list preference.
 * Falls back to fallbackListId (e.g. the first list) if no preference is stored.
 */
export async function refreshWidgetShoppingPreferred(
  familyId: string,
  fallbackListId: string,
) {
  if (!isAndroid) { return; }
  let listId = fallbackListId;
  try {
    const saved = await AsyncStorage.getItem(WIDGET_SHOPPING_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      if (p.familyId === familyId && p.listId) {
        listId = p.listId;
      }
    }
  } catch (_) {}
  refreshWidgetShoppingFromFirestore(familyId, listId);
}

// ── isDue logic inlined to avoid circular dependency with choreService ─────

function isChoreCurrentlyDue(chore: {
  frequency: string;
  lastCompletedAt: number | null;
}): boolean {
  if (!chore.lastCompletedAt) { return true; }
  const last = chore.lastCompletedAt;
  if (chore.frequency === 'daily') {
    const s = new Date(); s.setHours(0, 0, 0, 0);
    return last < s.getTime();
  }
  if (chore.frequency === 'weekly') {
    const m = new Date(); m.setHours(0, 0, 0, 0);
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return last < m.getTime();
  }
  if (chore.frequency === 'monthly') {
    const m = new Date(); m.setDate(1); m.setHours(0, 0, 0, 0);
    return last < m.getTime();
  }
  return true;
}

/**
 * Fetch all chores, filter to "today's" ones (due or completed today), and push to widget.
 */
export async function refreshWidgetChoresFromFirestore(familyId: string) {
  if (!isAndroid) { return; }
  try {
    const snap = await firestore()
      .collection('families').doc(familyId)
      .collection('chores')
      .get();

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const all = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: (data.name as string) ?? '',
        roomName: (data.roomName as string) ?? '',
        status: (data.status as string) ?? 'pending',
        frequency: (data.frequency as string) ?? 'daily',
        lastCompletedAt: (data.lastCompletedAt as number) ?? null,
      };
    });

    // Include chores that are currently due (need doing) or completed today
    const todaysChores = all.filter(c => {
      if (isChoreCurrentlyDue(c)) { return true; }
      return c.status === 'done' && c.lastCompletedAt != null && c.lastCompletedAt >= todayStartMs;
    });

    const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, done: 2 };
    todaysChores.sort((a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0));

    const pendingCount = todaysChores.filter(c => c.status !== 'done').length;

    updateWidgetChores({
      familyId,
      pendingCount,
      items: todaysChores.slice(0, 5).map(c => ({
        id: c.id,
        name: c.name,
        roomName: c.roomName,
        status: c.status,
      })),
    });
  } catch (_) {}
}
