import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { MemberRole } from '../../services/familyService';
import { SheetManager } from 'react-native-actions-sheet';

interface Member {
  uid: string;
  displayName: string;
  email: string | null;
  role: MemberRole;
}

export default function MyFamilyScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const currentUid = auth().currentUser?.uid;

  useEffect(() => {
    if (!family) { return; }
    const unsub = firestore()
      .collection('users')
      .where('familyId', '==', family.id)
      .onSnapshot(snap => {
        if (!snap) {
          setLoading(false);
          return;
        }
        const list: Member[] = snap.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            displayName: data.displayName ?? 'Unknown',
            email: data.email ?? null,
            role: (data.role ?? 'parent') as MemberRole,
          };
        });
        const roleOrder: Record<MemberRole, number> = { admin: 0, parent: 1, guardian: 2, child: 3 };
        list.sort((a, b) => {
          const diff = roleOrder[a.role] - roleOrder[b.role];
          return diff !== 0 ? diff : a.displayName.localeCompare(b.displayName);
        });
        setMembers(list);
        setIsAdmin(list.some(m => m.uid === currentUid && m.role === 'admin'));
        setLoading(false);
      }, () => { setLoading(false); });
    return unsub;
  }, [family]);

  function openRoleSheet(member: Member) {
    const onSelect = async (role: MemberRole) => {
      if (!family) { return; }
      await firestore().collection('users').doc(member.uid).update({ role });
    };
    const onRemove = async () => {
      if (!family) { return; }
      await firestore()
        .collection('families')
        .doc(family.id)
        .update({ members: firestore.FieldValue.arrayRemove(member.uid) });
      await firestore()
        .collection('users')
        .doc(member.uid)
        .update({ familyId: null, role: null });
    };
    SheetManager.show('change-role', {
      payload: { memberName: member.displayName, currentRole: member.role, onSelect, onRemove },
    });
  }

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Family header */}
        <View style={[styles.familyCard, { backgroundColor: colors.primary }]}>
          <Text style={styles.familyCardName}>{family?.name}</Text>
          <Text style={styles.familyCardCount}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Members list */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          MEMBERS
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {members.map((member, index) => (
              <View
                key={member.uid}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  index === members.length - 1 && styles.rowLast,
                ]}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.displayName}
                    {member.uid === currentUid ? ' (you)' : ''}
                  </Text>
                  {member.email ? (
                    <Text style={[styles.memberEmail, { color: colors.textSecondary }]}>
                      {member.email}
                    </Text>
                  ) : null}
                </View>

                {/* Role badge */}
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor:
                        member.role === 'admin' ? colors.primaryLight
                        : member.role === 'parent' ? '#e8f5e9'
                        : member.role === 'guardian' ? '#fff3e0'
                        : '#f3e8ff',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.roleText,
                      {
                        color:
                          member.role === 'admin' ? colors.primary
                          : member.role === 'parent' ? '#2e7d32'
                          : member.role === 'guardian' ? '#e65100'
                          : '#7c3aed',
                      },
                    ]}
                  >
                    {member.role === 'admin' ? 'Admin'
                      : member.role === 'parent' ? 'Parent'
                      : member.role === 'guardian' ? 'Guardian'
                      : 'Child'}
                  </Text>
                </View>

                {/* Admin actions */}
                {isAdmin && member.uid !== currentUid && (
                  <TouchableOpacity
                    style={styles.moreBtn}
                    onPress={() => openRoleSheet(member)}
                  >
                    <Text style={[styles.moreBtnText, { color: colors.textTertiary }]}>
                      •••
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  familyCard: { borderRadius: 18, padding: 20, marginBottom: 24 },
  familyCardName: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  familyCardCount: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  card: { borderRadius: 18, overflow: 'hidden' },
  loader: { marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 17, fontWeight: '700' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600' },
  memberEmail: { fontSize: 12, marginTop: 1 },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  roleText: { fontSize: 11, fontWeight: '700' },
  moreBtn: { paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 },
  moreBtnText: { fontSize: 16, letterSpacing: 1 },
});
