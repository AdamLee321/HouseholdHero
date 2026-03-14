import firestore from '@react-native-firebase/firestore';
import { logActivity } from './activityService';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

export function subscribeToShoppingList(
  familyId: string,
  onUpdate: (items: ShoppingItem[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('shoppingList')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      const items: ShoppingItem[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ShoppingItem, 'id'>),
      }));
      onUpdate(items);
    });
}

export async function addShoppingItem(
  familyId: string,
  name: string,
  quantity: string,
  uid: string,
  displayName: string,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('shoppingList')
    .add({
      name: name.trim(),
      quantity: quantity.trim(),
      checked: false,
      addedBy: uid,
      addedByName: displayName,
      createdAt: Date.now(),
    });
  logActivity(familyId, 'shopping_added', uid, displayName, { itemName: name.trim() });
}

export async function toggleShoppingItem(familyId: string, itemId: string, checked: boolean) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('shoppingList')
    .doc(itemId)
    .update({checked: !checked});
}

export async function deleteShoppingItem(familyId: string, itemId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('shoppingList')
    .doc(itemId)
    .delete();
}

export async function clearCheckedItems(familyId: string) {
  const snap = await firestore()
    .collection('families')
    .doc(familyId)
    .collection('shoppingList')
    .where('checked', '==', true)
    .get();

  const batch = firestore().batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
}
