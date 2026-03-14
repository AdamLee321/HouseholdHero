import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps, ScrollView} from 'react-native-actions-sheet';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { createDirectChat, createGroupChat } from '../../services/chatService';

interface Member {
  uid: string;
  displayName: string;
  role: string;
}

export default function NewChatSheet(props: SheetProps<'new-chat'>) {
  const { colors } = useTheme();
  const { family } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const currentName = auth().currentUser?.displayName ?? 'Unknown';

  const { chats, onChatCreated } = props.payload!;

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!family) { return; }
    setSelected(new Set());
    setGroupName('');
    setMode('direct');

    firestore()
      .collection('users')
      .where('familyId', '==', family.id)
      .get()
      .then(snap => {
        const list: Member[] = snap.docs
          .map(d => ({ uid: d.id, displayName: d.data().displayName ?? 'Unknown', role: d.data().role ?? 'parent' }))
          .filter(m => m.uid !== uid);
        setMembers(list);
        setMembersLoading(false);
      })
      .catch(() => setMembersLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleMember(memberId: string) {
    if (mode === 'direct') {
      setSelected(new Set([memberId]));
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(memberId) ? next.delete(memberId) : next.add(memberId);
        return next;
      });
    }
  }

  async function handleCreate() {
    if (!family || selected.size === 0) { return; }
    if (mode === 'group' && !groupName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for the group.');
      return;
    }
    setLoading(true);
    try {
      let chatId: string;
      if (mode === 'direct') {
        const otherUid = [...selected][0];
        const other = members.find(m => m.uid === otherUid);
        chatId = await createDirectChat(
          family.id, uid, currentName, otherUid, other?.displayName ?? 'Unknown', chats,
        );
        onChatCreated(chatId, 'direct');
      } else {
        const memberUids = [...selected];
        const memberNames: Record<string, string> = { [uid]: currentName };
        for (const m of members) {
          if (selected.has(m.uid)) { memberNames[m.uid] = m.displayName; }
        }
        chatId = await createGroupChat(family.id, uid, groupName, memberUids, memberNames);
        onChatCreated(chatId, 'group');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        maxHeight: '80%',
      }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>New Message</Text>
        <TouchableOpacity onPress={() => SheetManager.hide(props.sheetId)}>
          <LucideIcon name="x" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Mode toggle */}
      <View style={[styles.modeToggle, { backgroundColor: colors.background }]}>
        {(['direct', 'group'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && { backgroundColor: colors.primary }]}
            onPress={() => { setMode(m); setSelected(new Set()); }}
          >
            <Text style={[styles.modeBtnText, { color: mode === m ? '#fff' : colors.textSecondary }]}>
              {m === 'direct' ? 'Direct Message' : 'Group Chat'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Group name input */}
      {mode === 'group' && (
        <TextInput
          style={[styles.groupNameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Group name..."
          placeholderTextColor={colors.textTertiary}
          value={groupName}
          onChangeText={setGroupName}
        />
      )}

      {/* Member list */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {mode === 'direct' ? 'SELECT MEMBER' : 'ADD MEMBERS'}
      </Text>
      {membersLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
      ) : (
        <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
          {members.map(member => {
            const isSelected = selected.has(member.uid);
            return (
              <TouchableOpacity
                key={member.uid}
                style={[styles.memberRow, { borderBottomColor: colors.border }]}
                onPress={() => toggleMember(member.uid)}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
                <View style={[
                  styles.checkbox,
                  { borderColor: isSelected ? colors.primary : colors.border },
                  isSelected && { backgroundColor: colors.primary },
                ]}>
                  {isSelected && <LucideIcon name="check" size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Create button */}
      <TouchableOpacity
        style={[
          styles.createBtn,
          { backgroundColor: selected.size > 0 ? colors.primary : colors.border },
        ]}
        onPress={handleCreate}
        disabled={selected.size === 0 || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.createBtnText}>
              {mode === 'direct' ? 'Open Chat' : `Create Group (${selected.size + 1})`}
            </Text>
        }
      </TouchableOpacity>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' },
  modeToggle: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 16 },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  modeBtnText: { fontSize: 14, fontWeight: '600' },
  groupNameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  memberList: { maxHeight: 280 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 16, fontWeight: '700' },
  memberName: { flex: 1, fontSize: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  createBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
