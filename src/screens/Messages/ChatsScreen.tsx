import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import LucideIcon from '@react-native-vector-icons/lucide';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { HomeStackParamList } from '../../types';
import {
  Chat,
  subscribeToChats,
  deleteChat,
  ensureFamilyChat,
  getChatDisplayName,
  isUnread,
} from '../../services/chatService';
import { SheetManager } from 'react-native-actions-sheet';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Messages'>;

const AVATAR_COLORS = [
  '#4F6EF7',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#00C7BE',
  '#FF3B30',
];
function avatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatChatTime(ts: number | null): string {
  if (!ts) {
    return '';
  }
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ChatRowProps {
  chat: Chat;
  uid: string;
  onPress: () => void;
  onDelete: () => void;
}

function ChatRow({ chat, uid, onPress, onDelete }: ChatRowProps) {
  const { colors } = useTheme();
  console.log('[ChatRow] chat:', chat);
  console.log('[ChatRow] uid:', uid);
  const name = getChatDisplayName(chat, uid);
  const unread = isUnread(chat, uid);
  const color = avatarColor(name);

  function handleLongPress() {
    if (chat.type === 'family') {
      return;
    }
    Alert.alert('Delete Chat', `Delete "${name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <TouchableOpacity
      style={[styles.chatRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: color }]}>
        {chat.type === 'family' ? (
          <LucideIcon name="users" size={20} color="#fff" />
        ) : chat.type === 'group' ? (
          <LucideIcon name="users" size={20} color="#fff" />
        ) : (
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        )}
      </View>

      {/* Content */}
      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text
            style={[
              styles.chatName,
              { color: colors.text },
              unread && styles.chatNameBold,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[
              styles.chatTime,
              { color: unread ? colors.primary : colors.textTertiary },
            ]}
          >
            {formatChatTime(chat.lastMessageAt)}
          </Text>
        </View>
        <View style={styles.chatPreviewRow}>
          <Text
            style={[
              styles.chatPreview,
              { color: unread ? colors.text : colors.textSecondary },
              unread && styles.chatPreviewBold,
            ]}
            numberOfLines={1}
          >
            {chat.lastMessage
              ? chat.type !== 'direct' && chat.lastMessageSenderName
                ? `${chat.lastMessageSenderName}: ${chat.lastMessage}`
                : chat.lastMessage
              : 'No messages yet'}
          </Text>
          {unread && (
            <View
              style={[styles.unreadDot, { backgroundColor: colors.primary }]}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { family } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';

  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const ensuredRef = useRef(false);

  useEffect(() => {
    if (!family) {
      return;
    }

    if (!ensuredRef.current) {
      ensuredRef.current = true;
      ensureFamilyChat(family.id, family.name, family.members).catch(() => {});
    }

    const unsub = subscribeToChats(family.id, uid, incoming => {
      setChats(incoming);
      setLoading(false);
    });
    return unsub;
  }, [family]);

  function handleOpenChat(chat: Chat) {
    navigation.navigate('Chat', {
      chatId: chat.id,
      chatType: chat.type,
    });
  }

  async function handleDelete(chat: Chat) {
    if (!family) {
      return;
    }
    await deleteChat(family.id, chat.id);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator
          style={{ flex: 1 }}
          color={colors.primary}
          size="large"
        />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={c => c.id}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No chats yet
              </Text>
              <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
                Tap + to start a conversation
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChatRow
              chat={item}
              uid={uid}
              onPress={() => handleOpenChat(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => SheetManager.show('new-chat', { payload: { chats, onChatCreated: (chatId, chatType) => { navigation.navigate('Chat', { chatId, chatType }); } } })}
      >
        <LucideIcon name="pencil" size={22} color="#fff" />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingTop: 8 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  chatContent: { flex: 1 },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 3,
  },
  chatName: { fontSize: 16, flex: 1, marginRight: 8 },
  chatNameBold: { fontWeight: '700' },
  chatTime: { fontSize: 12 },
  chatPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatPreview: { fontSize: 14, flex: 1 },
  chatPreviewBold: { fontWeight: '600' },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptyHint: { fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
