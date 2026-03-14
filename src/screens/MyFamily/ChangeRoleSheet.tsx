import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps} from 'react-native-actions-sheet';
import Text from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { MemberRole } from '../../services/familyService';

const ROLES: { role: MemberRole; label: string; description: string; color: string; bg: string }[] = [
  { role: 'admin',    label: 'Admin',    description: 'Full family management access',    color: '#4F6EF7', bg: '#EEF1FE' },
  { role: 'parent',   label: 'Parent',   description: 'Full access to all features',      color: '#2e7d32', bg: '#e8f5e9' },
  { role: 'guardian', label: 'Guardian', description: 'For nannies, grandparents, etc.',  color: '#e65100', bg: '#fff3e0' },
  { role: 'child',    label: 'Child',    description: 'For children in the family',       color: '#7c3aed', bg: '#f3e8ff' },
];

export default function ChangeRoleSheet(props: SheetProps<'change-role'>) {
  const { colors } = useTheme();
  const [saving, setSaving] = useState<MemberRole | null>(null);

  const { memberName, currentRole, onSelect, onRemove } = props.payload!;

  async function handleSelect(role: MemberRole) {
    if (role === currentRole || saving) { return; }
    setSaving(role);
    try {
      await onSelect(role);
      SheetManager.hide(props.sheetId);
    } finally {
      setSaving(null);
    }
  }

  function handleRemove() {
    SheetManager.hide(props.sheetId);
    setTimeout(() => {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${memberName} from the family? They will lose access to all shared data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: onRemove },
        ],
      );
    }, 300);
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
        paddingHorizontal: 20,
        paddingBottom: 36,
        paddingTop: 12,
      }}>
      <Text style={[styles.title, { color: colors.text }]}>{memberName}</Text>

      {/* Remove */}
      <TouchableOpacity
        style={[styles.removeBtn, { borderColor: colors.danger + '40', backgroundColor: colors.danger + '12' }]}
        onPress={handleRemove}>
        <Text style={[styles.removeText, { color: colors.danger }]}>
          Remove from Family
        </Text>
      </TouchableOpacity>

      {/* Role list */}
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        CHANGE ROLE
      </Text>
      <View style={[styles.list, { borderColor: colors.border }]}>
        {ROLES.map((item, index) => {
          const isSelected = item.role === currentRole;
          const isLoading = saving === item.role;
          return (
            <TouchableOpacity
              key={item.role}
              style={[
                styles.row,
                { borderTopColor: colors.border },
                index === 0 && styles.rowFirst,
                isSelected && { backgroundColor: item.bg + '80' },
              ]}
              onPress={() => handleSelect(item.role)}
              disabled={!!saving}>
              <View style={[styles.roleIcon, { backgroundColor: item.bg }]}>
                <Text style={[styles.roleIconText, { color: item.color }]}>
                  {item.label.charAt(0)}
                </Text>
              </View>
              <View style={styles.roleInfo}>
                <Text style={[styles.roleLabel, { color: colors.text, fontWeight: isSelected ? '700' : '600' }]}>
                  {item.label}
                </Text>
                <Text style={[styles.roleDesc, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
              </View>
              {isLoading ? (
                <ActivityIndicator size="small" color={item.color} />
              ) : isSelected ? (
                <View style={[styles.selectedDot, { backgroundColor: item.color }]} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.cancelBtn, { borderColor: colors.border }]}
        onPress={() => SheetManager.hide(props.sheetId)}>
        <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
      </TouchableOpacity>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  removeBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  removeText: { fontSize: 15, fontWeight: '700' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  list: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowFirst: { borderTopWidth: 0 },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleIconText: { fontSize: 16, fontWeight: '700' },
  roleInfo: { flex: 1 },
  roleLabel: { fontSize: 15 },
  roleDesc: { fontSize: 12, marginTop: 1 },
  selectedDot: { width: 10, height: 10, borderRadius: 5 },
  cancelBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
});
