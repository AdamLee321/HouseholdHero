import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import { regenerateInviteCode } from '../../services/familyService';
import auth from '@react-native-firebase/auth';

type InviteRole = 'parent' | 'guardian' | 'child';

interface InviteCardProps {
  label: string;
  description: string;
  code: string;
  role: InviteRole;
  isAdmin: boolean;
  regenerating: InviteRole | null;
  onCopy: () => void;
  onRegenerate: () => void;
  colors: ReturnType<typeof import('../../theme/useTheme').useTheme>['colors'];
}

function InviteCard({
  label,
  description,
  code,
  isAdmin,
  regenerating,
  role,
  onCopy,
  onRegenerate,
  colors,
}: InviteCardProps) {
  const isRegenerating = regenerating === role;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleGroup}>
          <Text style={[styles.cardLabel, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>

      <View style={[styles.codeBox, { backgroundColor: colors.surfaceSecondary }]}>
        <Text style={[styles.codeText, { color: colors.primary }]}>{code}</Text>
        <View style={styles.codeActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={onCopy}>
            <LucideIcon name="copy" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onRegenerate}
              disabled={isRegenerating}>
              {isRegenerating ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <LucideIcon name="refresh-cw" size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function InviteScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, setFamily } = useFamilyStore();
  const [regenerating, setRegenerating] = useState<InviteRole | null>(null);
  const isAdmin = auth().currentUser?.uid === family?.createdBy;

  async function handleRegenerate(role: InviteRole) {
    if (!family) { return; }
    Alert.alert(
      'Regenerate Code',
      `The old ${role} invite code will stop working immediately. Anyone with the old code won't be able to join.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            setRegenerating(role);
            try {
              const newCode = await regenerateInviteCode(family.id, role);
              setFamily({
                ...family,
                parentInviteCode: role === 'parent' ? newCode : family.parentInviteCode,
                guardianInviteCode: role === 'guardian' ? newCode : family.guardianInviteCode,
                childInviteCode: role === 'child' ? newCode : family.childInviteCode,
              });
            } finally {
              setRegenerating(null);
            }
          },
        },
      ],
    );
  }

  function handleCopy(code: string, label: string) {
    Clipboard.setString(code);
    Alert.alert('Copied', `${label} invite code copied to clipboard.`);
  }

  if (!family) { return null; }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 40 },
      ]}>
      <Text style={[styles.intro, { color: colors.textSecondary }]}>
        Share the appropriate code with each person joining your family. Their
        role is set automatically based on the code they use.
      </Text>

      {isAdmin && (
        <View style={[styles.adminNote, { backgroundColor: colors.primaryLight }]}>
          <LucideIcon name="shield" size={14} color={colors.primary} />
          <Text style={[styles.adminNoteText, { color: colors.primary }]}>
            Only you can regenerate codes
          </Text>
        </View>
      )}

      <InviteCard
        label="Parent"
        description="Full access to all family features"
        code={family.parentInviteCode}
        role="parent"
        isAdmin={isAdmin}
        regenerating={regenerating}
        onCopy={() => handleCopy(family.parentInviteCode, 'Parent')}
        onRegenerate={() => handleRegenerate('parent')}
        colors={colors}
      />

      <InviteCard
        label="Guardian"
        description="For nannies, grandparents, babysitters, etc."
        code={family.guardianInviteCode}
        role="guardian"
        isAdmin={isAdmin}
        regenerating={regenerating}
        onCopy={() => handleCopy(family.guardianInviteCode, 'Guardian')}
        onRegenerate={() => handleRegenerate('guardian')}
        colors={colors}
      />

      <InviteCard
        label="Child"
        description="For children in the family"
        code={family.childInviteCode}
        role="child"
        isAdmin={isAdmin}
        regenerating={regenerating}
        onCopy={() => handleCopy(family.childInviteCode, 'Child')}
        onRegenerate={() => handleRegenerate('child')}
        colors={colors}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  intro: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 16,
  },
  adminNoteText: { fontSize: 13, fontWeight: '600' },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleGroup: { flex: 1 },
  cardLabel: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  cardDesc: { fontSize: 13 },
  codeBox: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeText: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 8,
  },
  codeActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 6 },
});
