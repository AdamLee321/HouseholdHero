import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput as RNTextInput,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps, ScrollView} from 'react-native-actions-sheet';
import Text from '../../components/Text';
import { useNavigation } from '@react-navigation/native';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  deleteChat,
  updateChatName,
  removeChatMember,
  reassignChatAdmin,
} from '../../services/chatService';

export default function ChatInfoSheet(props: SheetProps<'chat-info'>) {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { family } = useFamilyStore();

  const { chat, currentUid, isAdmin, isFamilyAdmin } = props.payload!;

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(chat.name ?? '');

  const canManage = chat.type === 'family' ? isFamilyAdmin : isAdmin;
  const canLeave = chat.type !== 'family';
  const canDelete = chat.type !== 'family' && isAdmin;

  async function handleSaveName() {
    if (!family || !nameValue.trim()) { return; }
    await updateChatName(family.id, chat.id, nameValue);
    setEditingName(false);
  }

  async function handleRemoveMember(uid: string, name: string) {
    if (!family) { return; }
    Alert.alert('Remove Member', `Remove ${name} from this chat?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => { await removeChatMember(family.id, chat.id, uid); },
      },
    ]);
  }

  async function handleMakeAdmin(uid: string, name: string) {
    if (!family) { return; }
    Alert.alert('Make Admin', `Make ${name} an admin of this chat?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => { await reassignChatAdmin(family.id, chat.id, uid); },
      },
    ]);
  }

  async function handleLeave() {
    if (!family) { return; }
    Alert.alert('Leave Chat', 'Are you sure you want to leave this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive',
        onPress: async () => {
          await removeChatMember(family.id, chat.id, currentUid);
          SheetManager.hide(props.sheetId);
          navigation.goBack();
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!family) { return; }
    Alert.alert('Delete Chat', 'Delete this chat and all its messages? This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteChat(family.id, chat.id);
          SheetManager.hide(props.sheetId);
          navigation.goBack();
        },
      },
    ]);
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
        <Text style={[styles.title, { color: colors.text }]}>
          {chat.type === 'family' ? 'Family Chat' : chat.type === 'group' ? 'Group Info' : 'Chat Info'}
        </Text>
        <TouchableOpacity onPress={() => SheetManager.hide(props.sheetId)}>
          <LucideIcon name="x" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Chat name */}
        {chat.type !== 'direct' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CHAT NAME</Text>
            <View style={[styles.card, { backgroundColor: colors.background }]}>
              {editingName ? (
                <View style={styles.nameEditRow}>
                  <RNTextInput
                    style={[styles.nameInput, { color: colors.text, borderColor: colors.border }]}
                    value={nameValue}
                    onChangeText={setNameValue}
                    autoFocus
                  />
                  <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                    <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.nameRow}>
                  <Text style={[styles.chatName, { color: colors.text }]}>{chat.name}</Text>
                  {canManage && (
                    <TouchableOpacity onPress={() => { setNameValue(chat.name ?? ''); setEditingName(true); }}>
                      <LucideIcon name="pencil" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* Members */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          MEMBERS ({chat.members.length})
        </Text>
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          {chat.members.map((memberUid, index) => {
            const name = chat.memberNames[memberUid] ?? memberUid;
            const memberIsAdmin = chat.adminUids.includes(memberUid);
            const isLast = index === chat.members.length - 1;
            return (
              <View
                key={memberUid}
                style={[
                  styles.memberRow,
                  { borderBottomColor: colors.border },
                  isLast && styles.memberRowLast,
                ]}
              >
                <View style={[styles.memberAvatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.memberAvatarText, { color: colors.primary }]}>
                    {name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {name}{memberUid === currentUid ? ' (you)' : ''}
                  </Text>
                  {memberIsAdmin && (
                    <Text style={[styles.adminBadge, { color: colors.primary }]}>Admin</Text>
                  )}
                </View>
                {canManage && memberUid !== currentUid && (
                  <View style={styles.memberActions}>
                    {!memberIsAdmin && (
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => handleMakeAdmin(memberUid, name)}
                      >
                        <LucideIcon name="shield" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                    {chat.type !== 'family' && (
                      <TouchableOpacity
                        style={styles.memberActionBtn}
                        onPress={() => handleRemoveMember(memberUid, name)}
                      >
                        <LucideIcon name="user-minus" size={16} color={colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Actions */}
        {(canLeave || canDelete) && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ACTIONS</Text>
            <View style={[styles.card, { backgroundColor: colors.background }]}>
              {canLeave && !canDelete && (
                <TouchableOpacity style={styles.actionRow} onPress={handleLeave}>
                  <LucideIcon name="log-out" size={18} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Leave Chat</Text>
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity style={styles.actionRow} onPress={handleDelete}>
                  <LucideIcon name="trash-2" size={18} color={colors.danger} />
                  <Text style={[styles.actionText, { color: colors.danger }]}>Delete Chat</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },
  card: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  nameEditRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  nameInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15 },
  saveBtn: { paddingHorizontal: 8 },
  saveBtnText: { fontWeight: '700', fontSize: 15 },
  chatName: { fontSize: 16, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  memberRowLast: { borderBottomWidth: 0 },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 15, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '500' },
  adminBadge: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  memberActions: { flexDirection: 'row', gap: 8 },
  memberActionBtn: { padding: 4 },
  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  actionText: { fontSize: 16, fontWeight: '600' },
});
