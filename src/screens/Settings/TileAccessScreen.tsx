import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  TileKey,
  NonAdminRole,
  ALL_TILES,
  DEFAULT_TILE_ACCESS,
  saveTileAccess,
} from '../../services/tileAccessService';

const TILE_LABELS: Record<TileKey, string> = {
  Shopping:  'Shopping',
  Todos:     'To-Do Lists',
  Chores:    'Chores',
  Calendar:  'Calendar',
  Messages:  'Messages',
  Contacts:  'Emergency Contacts',
  Location:  'Map',
  Documents: 'Documents',
  MyFamily:  'My Family',
  Budget:    'Budget',
  Gallery:   'Gallery',
  Recipes:   'Recipes',
  Activity:  'Activity Feed',
};

const ROLES: { role: NonAdminRole; label: string; color: string }[] = [
  { role: 'parent',   label: 'Parent',   color: '#2e7d32' },
  { role: 'guardian', label: 'Guardian', color: '#e65100' },
  { role: 'child',    label: 'Child',    color: '#7c3aed' },
];

export default function TileAccessScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, tileAccess } = useFamilyStore();
  const [selectedRole, setSelectedRole] = useState<NonAdminRole>('child');
  const [saving, setSaving] = useState(false);

  // Merge store value with defaults so missing/null keys never cause crashes
  const mergedAccess: TileAccess = {
    parent:   tileAccess?.parent   ?? DEFAULT_TILE_ACCESS.parent,
    guardian: tileAccess?.guardian ?? DEFAULT_TILE_ACCESS.guardian,
    child:    tileAccess?.child    ?? DEFAULT_TILE_ACCESS.child,
  };

  const allowed = mergedAccess[selectedRole];

  async function toggle(tile: TileKey) {
    if (!family) { return; }
    setSaving(true);
    const current = mergedAccess[selectedRole];
    const updated = current.includes(tile)
      ? current.filter(t => t !== tile)
      : [...current, tile];
    await saveTileAccess(family.id, { ...mergedAccess, [selectedRole]: updated });
    setSaving(false);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      {/* Role picker */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SELECT ROLE</Text>
      <View style={styles.rolePicker}>
        {ROLES.map(r => {
          const active = selectedRole === r.role;
          return (
            <TouchableOpacity
              key={r.role}
              style={[
                styles.roleChip,
                {
                  backgroundColor: active ? r.color : colors.surface,
                  borderColor: r.color,
                },
              ]}
              onPress={() => setSelectedRole(r.role)}
            >
              <Text style={[styles.roleChipText, { color: active ? '#fff' : r.color }]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tile toggles */}
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TILE ACCESS</Text>
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        {ALL_TILES.map((tile, index) => {
          const enabled = allowed.includes(tile);
          const roleColor = ROLES.find(r => r.role === selectedRole)?.color ?? colors.primary;
          return (
            <View
              key={tile}
              style={[
                styles.row,
                { borderBottomColor: colors.border },
                index === ALL_TILES.length - 1 && styles.rowLast,
              ]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                {TILE_LABELS[tile]}
              </Text>
              <Switch
                value={enabled}
                onValueChange={() => toggle(tile)}
                trackColor={{ false: colors.border, true: roleColor }}
                thumbColor="#fff"
                disabled={saving}
              />
            </View>
          );
        })}
      </View>

      {saving && <ActivityIndicator color={colors.primary} style={styles.saving} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 8,
  },
  rolePicker: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  roleChipText: { fontSize: 14, fontWeight: '700' },
  card: { borderRadius: 18, overflow: 'hidden', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 16 },
  saving: { marginTop: 8 },
});
