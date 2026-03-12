import firestore from '@react-native-firebase/firestore';

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
}

export function subscribeToMessages(
  familyId: string,
  onUpdate: (messages: Message[]) => void,
) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(200)
    .onSnapshot(snap => {
      const messages: Message[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Message, 'id'>),
      }));
      onUpdate(messages);
    });
}

export async function sendMessage(
  familyId: string,
  text: string,
  senderId: string,
  senderName: string,
) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('messages')
    .add({
      text: text.trim(),
      senderId,
      senderName,
      createdAt: Date.now(),
    });
}

export async function deleteMessage(familyId: string, messageId: string) {
  await firestore()
    .collection('families')
    .doc(familyId)
    .collection('messages')
    .doc(messageId)
    .delete();
}
