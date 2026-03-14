import firestore from '@react-native-firebase/firestore';

export type ChatType = 'family' | 'direct' | 'group';

export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  members: string[];
  adminUids: string[];
  memberNames: Record<string, string>;
  createdBy: string;
  createdAt: number;
  lastMessage: string | null;
  lastMessageAt: number | null;
  lastMessageSenderName: string | null;
  readBy: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt: number;
}

function chatsRef(familyId: string) {
  return firestore().collection('families').doc(familyId).collection('chats');
}

function messagesRef(familyId: string, chatId: string) {
  return chatsRef(familyId).doc(chatId).collection('messages');
}

// ── Subscriptions ────────────────────────────────────────────────────────────

export function subscribeToChats(
  familyId: string,
  uid: string,
  onChange: (chats: Chat[]) => void,
): () => void {
  return chatsRef(familyId)
    .where('members', 'array-contains', uid)
    .onSnapshot(
      snap => {
        if (!snap) {
          onChange([]);
          return;
        }
        console.log('[subscribeToChats] received', snap.docs.length, 'chats');
        const chats: Chat[] = snap.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as Chat),
        );
        chats.sort((a, b) => {
          if (a.type === 'family') {
            return -1;
          }
          if (b.type === 'family') {
            return 1;
          }
          return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
        });
        onChange(chats);
      },
      e => {
        console.warn('[subscribeToChats] error:', e);
        onChange([]);
      },
    );
}

export function subscribeToChatMessages(
  familyId: string,
  chatId: string,
  onChange: (messages: ChatMessage[]) => void,
): () => void {
  return messagesRef(familyId, chatId)
    .orderBy('createdAt', 'desc')
    .limit(200)
    .onSnapshot(
      snap => {
        if (!snap) {
          onChange([]);
          return;
        }
        onChange(
          snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)),
        );
      },
      () => onChange([]),
    );
}

// ── Send / delete ────────────────────────────────────────────────────────────

export async function sendChatMessage(
  familyId: string,
  chatId: string,
  text: string,
  senderId: string,
  senderName: string,
): Promise<void> {
  const now = Date.now();
  const batch = firestore().batch();

  const msgRef = messagesRef(familyId, chatId).doc();
  batch.set(msgRef, {
    text: text.trim(),
    senderId,
    senderName,
    createdAt: now,
  });

  const chatDocRef = chatsRef(familyId).doc(chatId);
  batch.update(chatDocRef, {
    lastMessage: text.trim(),
    lastMessageAt: now,
    lastMessageSenderName: senderName,
    [`readBy.${senderId}`]: now,
  });

  await batch.commit();
}

export async function deleteChatMessage(
  familyId: string,
  chatId: string,
  messageId: string,
): Promise<void> {
  await messagesRef(familyId, chatId).doc(messageId).delete();
}

// ── Read receipts ────────────────────────────────────────────────────────────

export async function markChatAsRead(
  familyId: string,
  chatId: string,
  uid: string,
): Promise<void> {
  await chatsRef(familyId)
    .doc(chatId)
    .update({ [`readBy.${uid}`]: Date.now() });
}

// ── Create chats ─────────────────────────────────────────────────────────────

export async function createDirectChat(
  familyId: string,
  currentUid: string,
  currentName: string,
  otherUid: string,
  otherName: string,
  existingChats: Chat[],
): Promise<string> {
  const existing = existingChats.find(
    c =>
      c.type === 'direct' &&
      c.members.includes(currentUid) &&
      c.members.includes(otherUid) &&
      c.members.length === 2,
  );
  if (existing) {
    return existing.id;
  }

  const ref = chatsRef(familyId).doc();
  await ref.set({
    type: 'direct',
    name: null,
    members: [currentUid, otherUid],
    adminUids: [currentUid],
    memberNames: { [currentUid]: currentName, [otherUid]: otherName },
    createdBy: currentUid,
    createdAt: Date.now(),
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSenderName: null,
    readBy: {},
  });
  return ref.id;
}

export async function createGroupChat(
  familyId: string,
  currentUid: string,
  name: string,
  memberUids: string[],
  memberNames: Record<string, string>,
): Promise<string> {
  const allMembers = [...new Set([currentUid, ...memberUids])];
  const ref = chatsRef(familyId).doc();
  await ref.set({
    type: 'group',
    name: name.trim(),
    members: allMembers,
    adminUids: [currentUid],
    memberNames,
    createdBy: currentUid,
    createdAt: Date.now(),
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSenderName: null,
    readBy: {},
  });
  return ref.id;
}

// The family chat always uses the fixed doc ID 'family-chat' so we can
// do a single document get instead of a collection query (avoids Firestore
// security rule rejection on collection queries without members filter).
export async function ensureFamilyChat(
  familyId: string,
  familyName: string,
  members: string[],
): Promise<void> {
  console.log(
    '[ensureFamilyChat] called for family:',
    familyId,
    'members:',
    members.length,
  );
  const ref = chatsRef(familyId).doc('family-chat');
  const snap = await ref.get();
  const exists =
    typeof snap.exists === 'function' ? snap.exists() : snap.exists;
  console.log('[ensureFamilyChat] doc exists:', exists);

  if (exists) {
    await ref.update({ members, adminUids: members });
    console.log('[ensureFamilyChat] updated existing chat');
    return;
  }

  await ref.set({
    type: 'family',
    name: `${familyName} Family`,
    members,
    adminUids: members,
    memberNames: {},
    createdBy: members[0] ?? '',
    createdAt: Date.now(),
    lastMessage: null,
    lastMessageAt: null,
    lastMessageSenderName: null,
    readBy: {},
  });
  console.log('[ensureFamilyChat] created new family chat');
}

// ── Manage chats ─────────────────────────────────────────────────────────────

export async function deleteChat(
  familyId: string,
  chatId: string,
): Promise<void> {
  await chatsRef(familyId).doc(chatId).delete();
}

export async function updateChatName(
  familyId: string,
  chatId: string,
  name: string,
): Promise<void> {
  await chatsRef(familyId).doc(chatId).update({ name: name.trim() });
}

export async function addChatMembers(
  familyId: string,
  chatId: string,
  uids: string[],
  names: Record<string, string>,
): Promise<void> {
  const updates: Record<string, any> = {
    members: firestore.FieldValue.arrayUnion(...uids),
  };
  for (const [uid, name] of Object.entries(names)) {
    updates[`memberNames.${uid}`] = name;
  }
  await chatsRef(familyId).doc(chatId).update(updates);
}

export async function removeChatMember(
  familyId: string,
  chatId: string,
  uid: string,
): Promise<void> {
  await chatsRef(familyId)
    .doc(chatId)
    .update({
      members: firestore.FieldValue.arrayRemove(uid),
      adminUids: firestore.FieldValue.arrayRemove(uid),
    });
}

export async function reassignChatAdmin(
  familyId: string,
  chatId: string,
  newAdminUid: string,
): Promise<void> {
  await chatsRef(familyId)
    .doc(chatId)
    .update({
      adminUids: firestore.FieldValue.arrayUnion(newAdminUid),
    });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getChatDisplayName(chat: Chat, currentUid: string): string {
  if (chat.type === 'family' || chat.type === 'group') {
    return chat.name ?? 'Group Chat';
  }
  console.log('[getChatDisplayName] chat:', chat);
  // DM: show the other person's name
  const otherUid = chat.members.find(uid => uid !== currentUid);
  return otherUid
    ? chat.memberNames[otherUid] ?? 'Direct Message'
    : 'Direct Message';
}

export function isUnread(chat: Chat, uid: string): boolean {
  if (!chat.lastMessageAt) {
    return false;
  }
  const lastRead = chat.readBy?.[uid] ?? 0;
  return chat.lastMessageAt > lastRead;
}
