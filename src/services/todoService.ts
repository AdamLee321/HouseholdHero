import firestore from '@react-native-firebase/firestore';

export interface TodoList {
  id: string;
  title: string;
  type: 'shared' | 'personal';
  createdBy: string;
  createdByName: string;
  itemCount: number;
  createdAt: number;
}

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  createdAt: number;
}

export function subscribeToTodoLists(
  familyId: string,
  uid: string,
  onUpdate: (lists: TodoList[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      const lists: TodoList[] = snap.docs
        .map(doc => ({id: doc.id, ...(doc.data() as Omit<TodoList, 'id'>)}))
        // Show shared lists to everyone, personal only to creator
        .filter(l => l.type === 'shared' || l.createdBy === uid);
      onUpdate(lists);
    });
}

export function subscribeToTodoItems(
  familyId: string,
  listId: string,
  onUpdate: (items: TodoItem[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId)
    .collection('items')
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      const items: TodoItem[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<TodoItem, 'id'>),
      }));
      onUpdate(items);
    });
}

export async function createTodoList(
  familyId: string,
  title: string,
  type: 'shared' | 'personal',
  uid: string,
  displayName: string,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .add({
      title: title.trim(),
      type,
      createdBy: uid,
      createdByName: displayName,
      itemCount: 0,
      createdAt: Date.now(),
    });
}

export async function deleteTodoList(familyId: string, listId: string) {
  // Delete all items first
  const items = await firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId)
    .collection('items')
    .get();

  const batch = firestore().batch();
  items.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(
    firestore().collection('families').doc(familyId).collection('todos').doc(listId),
  );
  await batch.commit();
}

export async function addTodoItem(familyId: string, listId: string, text: string) {
  const ref = firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId);

  await ref.collection('items').add({
    text: text.trim(),
    checked: false,
    createdAt: Date.now(),
  });

  await ref.update({itemCount: firestore.FieldValue.increment(1)});
}

export async function toggleTodoItem(
  familyId: string,
  listId: string,
  itemId: string,
  checked: boolean,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId)
    .collection('items')
    .doc(itemId)
    .update({checked: !checked});
}

export async function deleteTodoItem(familyId: string, listId: string, itemId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId)
    .collection('items')
    .doc(itemId)
    .delete();

  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('todos')
    .doc(listId)
    .update({itemCount: firestore.FieldValue.increment(-1)});
}
