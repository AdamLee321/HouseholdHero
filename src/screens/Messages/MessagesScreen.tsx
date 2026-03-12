import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import {useTheme} from '../../theme/useTheme';
import {useFamilyStore} from '../../store/familyStore';
import {
  Message,
  subscribeToMessages,
  sendMessage,
  deleteMessage,
} from '../../services/messageService';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDay(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return 'Today';
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Returns a stable colour based on name so each family member gets a consistent avatar colour
const AVATAR_COLORS = [
  '#4F6EF7',
  '#34C759',
  '#FF9500',
  '#AF52DE',
  '#00C7BE',
  '#FF3B30',
  '#5856D6',
  '#FF2D9B',
  '#FF6B35',
];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface BubbleProps {
  item: Message;
  isOwn: boolean;
  showName: boolean;
  showTime: boolean;
  onLongPress: () => void;
}

function Bubble({item, isOwn, showName, showTime, onLongPress}: BubbleProps) {
  const {colors} = useTheme();
  const ac = avatarColor(item.senderName);

  return (
    <View
      style={[
        styles.bubbleWrapper,
        isOwn ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
      ]}>
      {/* Avatar (others only, first in group) */}
      {!isOwn && (
        <View
          style={[
            styles.avatar,
            {backgroundColor: showName ? ac : 'transparent'},
          ]}>
          {showName && (
            <Text style={styles.avatarText}>{initials(item.senderName)}</Text>
          )}
        </View>
      )}

      <View style={isOwn ? styles.bubbleColRight : styles.bubbleColLeft}>
        {/* Sender name (others, first in group) */}
        {!isOwn && showName && (
          <Text style={[styles.senderName, {color: ac}]}>
            {item.senderName}
          </Text>
        )}

        {/* Bubble */}
        <TouchableOpacity
          activeOpacity={0.85}
          onLongPress={onLongPress}
          style={[
            styles.bubble,
            isOwn
              ? [styles.bubbleOwn, {backgroundColor: colors.primary}]
              : [styles.bubbleOther, {backgroundColor: colors.surface}],
          ]}>
          <Text
            style={[
              styles.bubbleText,
              {color: isOwn ? '#fff' : colors.text},
            ]}>
            {item.text}
          </Text>
        </TouchableOpacity>

        {/* Timestamp (last in group) */}
        {showTime && (
          <Text
            style={[
              styles.timestamp,
              {
                color: colors.textTertiary,
                textAlign: isOwn ? 'right' : 'left',
              },
            ]}>
            {formatTime(item.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

// Day separator shown between messages from different days (list is inverted so logic inverted)
function DaySeparator({label}: {label: string}) {
  const {colors} = useTheme();
  return (
    <View style={styles.daySep}>
      <View style={[styles.daySepLine, {backgroundColor: colors.border}]} />
      <Text style={[styles.daySepText, {color: colors.textTertiary}]}>
        {label}
      </Text>
      <View style={[styles.daySepLine, {backgroundColor: colors.border}]} />
    </View>
  );
}

export default function MessagesScreen() {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family, profile} = useFamilyStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const uid = auth().currentUser?.uid ?? '';
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToMessages(family.id, msgs => {
      setMessages(msgs);
      setLoading(false);
    });
    return unsub;
  }, [family]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending || !family) {
      return;
    }
    setSending(true);
    setText('');
    try {
      await sendMessage(
        family.id,
        trimmed,
        uid,
        profile?.displayName ?? 'Unknown',
      );
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(msgId: string) {
    if (!family) {
      return;
    }
    await deleteMessage(family.id, msgId);
  }

  // Build list items — messages are newest-first for the inverted FlatList.
  // We inject day separators between messages from different days.
  type ListItem =
    | {type: 'message'; data: Message; showName: boolean; showTime: boolean}
    | {type: 'day'; label: string; key: string};

  const listItems: ListItem[] = [];

  messages.forEach((msg, index) => {
    const prev = messages[index - 1]; // previous in array = newer message
    const next = messages[index + 1]; // next in array = older message

    // In inverted list: "next" is rendered above (older), "prev" is rendered below (newer)
    const showName =
      !prev || prev.senderId !== msg.senderId; // first of group going upward (newest in group)
    const showTime =
      !next || next.senderId !== msg.senderId; // last of group going upward (oldest in group)

    listItems.push({type: 'message', data: msg, showName, showTime});

    // Day separator when the next (older) message is from a different day
    if (
      next &&
      new Date(msg.createdAt).toDateString() !==
        new Date(next.createdAt).toDateString()
    ) {
      listItems.push({
        type: 'day',
        label: formatDay(next.createdAt),
        key: `day-${next.createdAt}`,
      });
    }

    // Separator before the oldest message
    if (!next) {
      listItems.push({
        type: 'day',
        label: formatDay(msg.createdAt),
        key: `day-first-${msg.createdAt}`,
      });
    }
  });

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: colors.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      {loading ? (
        <ActivityIndicator
          style={{flex: 1}}
          color={colors.primary}
          size="large"
        />
      ) : messages.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={[styles.emptyTitle, {color: colors.text}]}>
            No messages yet
          </Text>
          <Text style={[styles.emptyHint, {color: colors.textSecondary}]}>
            Say hello to your family!
          </Text>
        </View>
      ) : (
        <FlatList
          data={listItems}
          keyExtractor={(item, i) =>
            item.type === 'message' ? item.data.id : item.key ?? String(i)
          }
          inverted
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 8},
          ]}
          renderItem={({item}) => {
            if (item.type === 'day') {
              return <DaySeparator label={item.label} />;
            }
            return (
              <Bubble
                item={item.data}
                isOwn={item.data.senderId === uid}
                showName={item.showName}
                showTime={item.showTime}
                onLongPress={() => {
                  if (item.data.senderId === uid) {
                    handleDelete(item.data.id);
                  }
                }}
              />
            );
          }}
        />
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || 12,
          },
        ]}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Message your family..."
          placeholderTextColor={colors.textTertiary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                text.trim() && !sending ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}>
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  listContent: {paddingTop: 12, paddingHorizontal: 12},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 17, fontWeight: '600'},
  emptyHint: {fontSize: 14, marginTop: 4},

  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 2,
    alignItems: 'flex-end',
  },
  bubbleWrapperLeft: {justifyContent: 'flex-start'},
  bubbleWrapperRight: {justifyContent: 'flex-end'},

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  avatarText: {color: '#fff', fontSize: 11, fontWeight: '700'},

  bubbleColLeft: {maxWidth: '75%', alignItems: 'flex-start'},
  bubbleColRight: {maxWidth: '75%', alignItems: 'flex-end'},

  senderName: {fontSize: 11, fontWeight: '600', marginBottom: 2, marginLeft: 2},

  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  bubbleOwn: {borderBottomRightRadius: 4},
  bubbleOther: {borderBottomLeftRadius: 4},
  bubbleText: {fontSize: 15, lineHeight: 20},

  timestamp: {fontSize: 10, marginTop: 2, marginHorizontal: 2},

  daySep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  daySepLine: {flex: 1, height: StyleSheet.hairlineWidth},
  daySepText: {fontSize: 11, fontWeight: '600', marginHorizontal: 10},

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendIcon: {color: '#fff', fontSize: 18, fontWeight: '700'},
});
