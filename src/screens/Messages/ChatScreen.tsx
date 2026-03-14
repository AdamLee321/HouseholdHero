import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import LucideIcon from '@react-native-vector-icons/lucide';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { HomeStackParamList } from '../../types';
import {
  Chat,
  ChatMessage,
  subscribeToChats,
  subscribeToChatMessages,
  sendChatMessage,
  deleteChatMessage,
  markChatAsRead,
  getChatDisplayName,
} from '../../services/chatService';
import { SheetManager } from 'react-native-actions-sheet';

type NavProp = import('@react-navigation/native-stack').NativeStackNavigationProp<HomeStackParamList, 'Chat'>;
type RoutePropType = RouteProp<HomeStackParamList, 'Chat'>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) { return 'Today'; }
  if (d.toDateString() === yesterday.toDateString()) { return 'Yesterday'; }
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#4F6EF7', '#34C759', '#FF9500', '#AF52DE', '#00C7BE', '#FF3B30', '#5856D6'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + ((hash << 5) - hash); }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Bubble ───────────────────────────────────────────────────────────────────

interface BubbleProps {
  item: ChatMessage;
  isOwn: boolean;
  showName: boolean;
  showTime: boolean;
  onLongPress: () => void;
}

function Bubble({ item, isOwn, showName, showTime, onLongPress }: BubbleProps) {
  const { colors } = useTheme();
  const ac = avatarColor(item.senderName);
  return (
    <View style={[styles.bubbleWrapper, isOwn ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft]}>
      {!isOwn && (
        <View style={[styles.avatar, { backgroundColor: showName ? ac : 'transparent' }]}>
          {showName && <Text style={styles.avatarText}>{initials(item.senderName)}</Text>}
        </View>
      )}
      <View style={isOwn ? styles.bubbleColRight : styles.bubbleColLeft}>
        {!isOwn && showName && (
          <Text style={[styles.senderName, { color: ac }]}>{item.senderName}</Text>
        )}
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={onLongPress}
          style={[
            styles.bubble,
            isOwn
              ? [styles.bubbleOwn, { backgroundColor: colors.primary }]
              : [styles.bubbleOther, { backgroundColor: colors.surface }],
          ]}
        >
          <Text style={[styles.bubbleText, { color: isOwn ? '#fff' : colors.text }]}>
            {item.text}
          </Text>
        </TouchableOpacity>
        {showTime && (
          <Text style={[styles.timestamp, { color: colors.textTertiary, textAlign: isOwn ? 'right' : 'left' }]}>
            {formatTime(item.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

function DaySeparator({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.daySep}>
      <View style={[styles.daySepLine, { backgroundColor: colors.border }]} />
      <Text style={[styles.daySepText, { color: colors.textTertiary }]}>{label}</Text>
      <View style={[styles.daySepLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RoutePropType>();
  const { chatId, chatType } = route.params;
  const { family, profile } = useFamilyStore();

  const uid = auth().currentUser?.uid ?? '';
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<any>(null);

  const chatName = chat ? getChatDisplayName(chat, uid) : '...';
  const isAdmin = chat ? chat.adminUids.includes(uid) || profile?.role === 'admin' : false;

  // Subscribe to the specific chat doc for live name/member updates
  useEffect(() => {
    if (!family) { return; }
    const unsub = subscribeToChats(family.id, uid, chats => {
      const found = chats.find(c => c.id === chatId);
      if (found) { setChat(found); }
    });
    return unsub;
  }, [family, chatId]);

  // Subscribe to messages
  useEffect(() => {
    if (!family) { return; }
    const unsub = subscribeToChatMessages(family.id, chatId, msgs => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [family, chatId]);

  // Mark as read on mount and when new messages arrive
  useEffect(() => {
    if (!family || !uid) { return; }
    markChatAsRead(family.id, chatId, uid).catch(() => {});
  }, [family, chatId, messages.length]);

  // Update header title dynamically
  useEffect(() => {
    navigation.setOptions({ title: chatName });
  }, [chatName]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !family) { return; }
    setSending(true);
    setText('');
    try {
      await sendChatMessage(family.id, chatId, trimmed, uid, profile?.displayName ?? 'Unknown');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(msgId: string) {
    if (!family) { return; }
    await deleteChatMessage(family.id, chatId, msgId);
  }

  type ListItem =
    | { type: 'message'; data: ChatMessage; showName: boolean; showTime: boolean }
    | { type: 'day'; label: string; key: string };

  const listItems: ListItem[] = [];
  messages.forEach((msg, index) => {
    const prev = messages[index - 1];
    const next = messages[index + 1];
    const showName = !prev || prev.senderId !== msg.senderId;
    const showTime = !next || next.senderId !== msg.senderId;
    listItems.push({ type: 'message', data: msg, showName, showTime });
    if (next && new Date(msg.createdAt).toDateString() !== new Date(next.createdAt).toDateString()) {
      listItems.push({ type: 'day', label: formatDay(next.createdAt), key: `day-${next.createdAt}` });
    }
    if (!next) {
      listItems.push({ type: 'day', label: formatDay(msg.createdAt), key: `day-first-${msg.createdAt}` });
    }
  });

  return (
    <>
      {/* Custom header info button */}
      <TouchableOpacity
        style={styles.infoBtn}
        onPress={() => chat && SheetManager.show('chat-info', { payload: { chat, currentUid: uid, isAdmin, isFamilyAdmin: profile?.role === 'admin' } })}
      >
        <LucideIcon name="info" size={22} color={colors.primary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={colors.primary} size="large" />
        ) : messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
            <Text style={[styles.emptyHint, { color: colors.textSecondary }]}>
              {chatType === 'direct' ? 'Say hello!' : 'Start the conversation!'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={(item, i) => item.type === 'message' ? item.data.id : item.key ?? String(i)}
            inverted
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 8 }]}
            renderItem={({ item }) => {
              if (item.type === 'day') { return <DaySeparator label={item.label} />; }
              return (
                <Bubble
                  item={item.data}
                  isOwn={item.data.senderId === uid}
                  showName={chatType !== 'direct' && item.showName}
                  showTime={item.showTime}
                  onLongPress={() => {
                    if (item.data.senderId === uid) { handleDelete(item.data.id); }
                  }}
                />
              );
            }}
          />
        )}

        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: insets.bottom || 12 }]}>
          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Message..."
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={1000}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: text.trim() && !sending ? colors.primary : colors.border }]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  infoBtn: { position: 'absolute', top: 0, right: 0, zIndex: 10, padding: 12 },
  listContent: { paddingTop: 12, paddingHorizontal: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 4 },
  bubbleWrapper: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end' },
  bubbleWrapperLeft: { justifyContent: 'flex-start' },
  bubbleWrapperRight: { justifyContent: 'flex-end' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 2 },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bubbleColLeft: { maxWidth: '75%', alignItems: 'flex-start' },
  bubbleColRight: { maxWidth: '75%', alignItems: 'flex-end' },
  senderName: { fontSize: 11, fontWeight: '600', marginBottom: 2, marginLeft: 2 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleOwn: { borderBottomRightRadius: 4 },
  bubbleOther: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  timestamp: { fontSize: 10, marginTop: 2, marginHorizontal: 2 },
  daySep: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, paddingHorizontal: 8 },
  daySepLine: { flex: 1, height: StyleSheet.hairlineWidth },
  daySepText: { fontSize: 11, fontWeight: '600', marginHorizontal: 10 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8 },
  input: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 8, fontSize: 15, maxHeight: 100 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
