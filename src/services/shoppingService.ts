import firestore from '@react-native-firebase/firestore';
import { logActivity } from './activityService';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
  createdBy: string;
  itemCount: number;
  uncheckedCount: number;
  lastAddedBy?: string;
  lastAddedByName?: string;
  lastAddedItemName?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  category: string;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

export interface ShoppingCategory {
  id: string;
  name: string;
  emoji: string;
  order: number;
  isDefault: boolean;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: Omit<ShoppingCategory, 'id'>[] = [
  { name: 'Fruit & Veg',     emoji: '🥦', order: 0,  isDefault: true },
  { name: 'Meat & Fish',     emoji: '🥩', order: 1,  isDefault: true },
  { name: 'Dairy',           emoji: '🥛', order: 2,  isDefault: true },
  { name: 'Bakery',          emoji: '🍞', order: 3,  isDefault: true },
  { name: 'Pasta & Rice',    emoji: '🍝', order: 4,  isDefault: true },
  { name: 'Tins & Jars',     emoji: '🥫', order: 5,  isDefault: true },
  { name: 'Frozen',          emoji: '🧊', order: 6,  isDefault: true },
  { name: 'Condiments',      emoji: '🧂', order: 7,  isDefault: true },
  { name: 'Snacks & Drinks', emoji: '🍫', order: 8,  isDefault: true },
  { name: 'Household',       emoji: '🧴', order: 9,  isDefault: true },
  { name: 'Health & Beauty', emoji: '💄', order: 10, isDefault: true },
  { name: 'Pets',            emoji: '🐾', order: 11, isDefault: true },
  { name: 'Garden',          emoji: '🌱', order: 12, isDefault: true },
  { name: 'Other',           emoji: '📦', order: 13, isDefault: true },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function listsRef(familyId: string) {
  return firestore().collection('families').doc(familyId).collection('shoppingLists');
}

function itemsRef(familyId: string, listId: string) {
  return listsRef(familyId).doc(listId).collection('items');
}

function categoriesRef(familyId: string) {
  return firestore().collection('families').doc(familyId).collection('shoppingCategories');
}

function historyRef(familyId: string) {
  return firestore().collection('families').doc(familyId).collection('shoppingHistory');
}

// ── Categories ─────────────────────────────────────────────────────────────────

export function subscribeToCategories(
  familyId: string,
  onUpdate: (cats: ShoppingCategory[]) => void,
) {
  return categoriesRef(familyId)
    .orderBy('order', 'asc')
    .onSnapshot(async snap => {
      if (snap.empty) {
        // Seed defaults on first use
        await seedDefaultCategories(familyId);
        return;
      }
      const cats: ShoppingCategory[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ShoppingCategory, 'id'>),
      }));
      onUpdate(cats);
    });
}

async function seedDefaultCategories(familyId: string) {
  const batch = firestore().batch();
  DEFAULT_CATEGORIES.forEach(cat => {
    const ref = categoriesRef(familyId).doc();
    batch.set(ref, cat);
  });
  await batch.commit();
}

export async function addCategory(
  familyId: string,
  name: string,
  emoji: string,
  currentCount: number,
) {
  await categoriesRef(familyId).add({
    name: name.trim(),
    emoji,
    order: currentCount,
    isDefault: false,
  });
}

export async function reorderCategories(
  familyId: string,
  orderedIds: string[],
) {
  const batch = firestore().batch();
  orderedIds.forEach((id, index) => {
    batch.update(categoriesRef(familyId).doc(id), { order: index });
  });
  await batch.commit();
}

export async function deleteCategory(familyId: string, catId: string) {
  await categoriesRef(familyId).doc(catId).delete();
}

// ── Shopping history ───────────────────────────────────────────────────────────

export interface ShoppingHistoryItem {
  name: string;
  category: string;
  count: number;
  lastAdded: number;
}

export async function fetchShoppingHistory(familyId: string): Promise<ShoppingHistoryItem[]> {
  const snap = await historyRef(familyId)
    .orderBy('count', 'desc')
    .limit(200)
    .get();
  return snap.docs.map(doc => doc.data() as ShoppingHistoryItem);
}

export function saveShoppingHistory(familyId: string, name: string, category: string) {
  const docId = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  historyRef(familyId).doc(docId).set(
    {
      name,
      category,
      count: firestore.FieldValue.increment(1),
      lastAdded: Date.now(),
    },
    { merge: true },
  );
}

// ── Lists ──────────────────────────────────────────────────────────────────────

export function subscribeToShoppingLists(
  familyId: string,
  onUpdate: (lists: ShoppingList[]) => void,
) {
  return listsRef(familyId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      snap => {
        const lists: ShoppingList[] = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<ShoppingList, 'id'>),
        }));
        onUpdate(lists);
      },
      () => onUpdate([]),
    );
}

export async function createShoppingList(
  familyId: string,
  name: string,
  uid: string,
) {
  const ref = await listsRef(familyId).add({
    name: name.trim(),
    createdAt: Date.now(),
    createdBy: uid,
    itemCount: 0,
    uncheckedCount: 0,
  });
  return ref.id;
}

export async function renameShoppingList(
  familyId: string,
  listId: string,
  name: string,
) {
  await listsRef(familyId).doc(listId).update({ name: name.trim() });
}

export async function deleteShoppingList(familyId: string, listId: string) {
  // Delete all items first
  const snap = await itemsRef(familyId, listId).get();
  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(listsRef(familyId).doc(listId));
  await batch.commit();
}

// ── Items ──────────────────────────────────────────────────────────────────────

export function subscribeToShoppingItems(
  familyId: string,
  listId: string,
  onUpdate: (items: ShoppingItem[]) => void,
) {
  return itemsRef(familyId, listId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      snap => {
        const items: ShoppingItem[] = snap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<ShoppingItem, 'id'>),
        }));
        onUpdate(items);
      },
      () => onUpdate([]),
    );
}

export async function addShoppingItem(
  familyId: string,
  listId: string,
  name: string,
  quantity: string,
  category: string,
  uid: string,
  displayName: string,
) {
  const batch = firestore().batch();
  const itemRef = itemsRef(familyId, listId).doc();
  batch.set(itemRef, {
    name: name.trim(),
    quantity: quantity.trim(),
    category,
    checked: false,
    addedBy: uid,
    addedByName: displayName,
    createdAt: Date.now(),
  });
  const listRef = listsRef(familyId).doc(listId);
  batch.update(listRef, {
    itemCount: firestore.FieldValue.increment(1),
    uncheckedCount: firestore.FieldValue.increment(1),
    lastAddedBy: uid,
    lastAddedByName: displayName,
    lastAddedItemName: name.trim(),
  });
  await batch.commit();
  // Save to family shopping history (fire-and-forget)
  saveShoppingHistory(familyId, name.trim(), category);
  logActivity(familyId, 'shopping_added', uid, displayName, { itemName: name.trim() });
}

export async function toggleShoppingItem(
  familyId: string,
  listId: string,
  itemId: string,
  checked: boolean,
) {
  const batch = firestore().batch();
  batch.update(itemsRef(familyId, listId).doc(itemId), { checked: !checked });
  batch.update(listsRef(familyId).doc(listId), {
    uncheckedCount: firestore.FieldValue.increment(checked ? 1 : -1),
  });
  await batch.commit();
}

export async function deleteShoppingItem(
  familyId: string,
  listId: string,
  itemId: string,
  checked: boolean,
) {
  const batch = firestore().batch();
  batch.delete(itemsRef(familyId, listId).doc(itemId));
  const updates: Record<string, any> = {
    itemCount: firestore.FieldValue.increment(-1),
  };
  if (!checked) {
    updates.uncheckedCount = firestore.FieldValue.increment(-1);
  }
  batch.update(listsRef(familyId).doc(listId), updates);
  await batch.commit();
}

function mergeQuantity(existing: string, incoming: string): string {
  const a = existing.trim();
  const b = incoming.trim();
  if (!b) { return a; }
  if (!a) { return b; }
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB)) { return String(numA + numB); }
  return `${a} + ${b}`;
}

export async function batchAddShoppingItems(
  familyId: string,
  listId: string,
  items: Array<{ name: string; quantity: string; category: string }>,
  uid: string,
  displayName: string,
) {
  if (items.length === 0) { return; }

  // Fetch existing items to detect duplicates
  const existingSnap = await itemsRef(familyId, listId).get();
  const existing = existingSnap.docs.map(doc => ({
    id: doc.id,
    ...(doc.data() as Omit<ShoppingItem, 'id'>),
  }));

  const batch = firestore().batch();
  const now = Date.now();
  let newCount = 0;
  let lastName = '';

  items.forEach((item, i) => {
    const nameLower = item.name.toLowerCase().trim();
    const match = existing.find(e => e.name.toLowerCase().trim() === nameLower);
    if (match) {
      const merged = mergeQuantity(match.quantity, item.quantity);
      if (merged !== match.quantity) {
        batch.update(itemsRef(familyId, listId).doc(match.id), { quantity: merged });
      }
    } else {
      batch.set(itemsRef(familyId, listId).doc(), {
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        checked: false,
        addedBy: uid,
        addedByName: displayName,
        createdAt: now + i,
      });
      newCount++;
      lastName = item.name;
    }
  });

  const listUpdates: Record<string, any> = {
    lastAddedBy: uid,
    lastAddedByName: displayName,
    lastAddedItemName: lastName || items[items.length - 1].name,
  };
  if (newCount > 0) {
    listUpdates.itemCount = firestore.FieldValue.increment(newCount);
    listUpdates.uncheckedCount = firestore.FieldValue.increment(newCount);
  }
  batch.update(listsRef(familyId).doc(listId), listUpdates);

  await batch.commit();
  (globalThis as any).__shoppingNotifySelfAdd?.(listId);
}

export async function toggleAllShoppingItems(
  familyId: string,
  listId: string,
  checkAll: boolean,
) {
  const snap = await itemsRef(familyId, listId).get();
  if (snap.empty) { return; }
  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.update(doc.ref, { checked: checkAll }));
  batch.update(listsRef(familyId).doc(listId), {
    uncheckedCount: checkAll ? 0 : snap.size,
  });
  await batch.commit();
}

export async function clearCheckedItems(familyId: string, listId: string) {
  const snap = await itemsRef(familyId, listId)
    .where('checked', '==', true)
    .get();
  if (snap.empty) { return; }
  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  batch.update(listsRef(familyId).doc(listId), {
    itemCount: firestore.FieldValue.increment(-snap.size),
  });
  await batch.commit();
}
