import React, { useState, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput as RNTextInput,
} from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import LucideIcon from '@react-native-vector-icons/lucide';
import Text from '../components/Text';
import { useTheme } from '../theme/useTheme';
import { setMealSlot, MEAL_LABELS, MEAL_EMOJIS, DAY_LABELS } from '../services/mealPlanService';

export default function AssignMealSheet(props: SheetProps<'assign-meal'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.mealPlanner.icon;
  const { familyId, weekStart, day, mealType, current, recipes } = props.payload!;

  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) { return recipes; }
    const q = query.toLowerCase();
    return recipes.filter(r => r.title.toLowerCase().includes(q));
  }, [query, recipes]);

  const showFreeText = query.trim() && !recipes.find(r => r.title.toLowerCase() === query.trim().toLowerCase());

  async function handleSelect(name: string, recipeId?: string) {
    setSaving(true);
    try {
      await setMealSlot(familyId, weekStart, day, mealType, { name, recipeId });
      await SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      await setMealSlot(familyId, weekStart, day, mealType, null);
      await SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  const title = `${DAY_LABELS[day]} • ${MEAL_EMOJIS[mealType]} ${MEAL_LABELS[mealType]}`;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled={!saving}
      containerStyle={{ backgroundColor: colors.surface }}
    >
      <View style={styles.content}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

        {/* Search / type input */}
        <View style={[styles.searchBox, { backgroundColor: colors.background }]}>
          <LucideIcon name="search" size={16} color={colors.textTertiary} />
          <RNTextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Search recipes or type a meal…"
            placeholderTextColor={colors.textTertiary}
            autoFocus
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <LucideIcon name="x" size={14} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <>
              {/* Free-text option */}
              {showFreeText && (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelect(query.trim())}
                  disabled={saving}
                >
                  <LucideIcon name="pencil" size={16} color={ACCENT} />
                  <Text style={[styles.rowName, { color: colors.text }]}>
                    Add as: <Text style={{ color: ACCENT, fontWeight: '700' }}>"{query.trim()}"</Text>
                  </Text>
                </TouchableOpacity>
              )}
              {/* Clear option */}
              {current && !query && (
                <TouchableOpacity
                  style={[styles.row, { borderBottomColor: colors.border }]}
                  onPress={handleClear}
                  disabled={saving}
                >
                  <LucideIcon name="x-circle" size={16} color={colors.danger} />
                  <Text style={[styles.rowName, { color: colors.danger }]}>Remove meal</Text>
                </TouchableOpacity>
              )}
            </>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, { borderBottomColor: colors.border }]}
              onPress={() => handleSelect(item.title, item.id)}
              disabled={saving}
            >
              <Text style={styles.rowEmoji}>🍳</Text>
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: colors.text }]}>{item.title}</Text>
                {item.tags?.length > 0 && (
                  <Text style={[styles.rowTags, { color: colors.textTertiary }]}>
                    {item.tags.slice(0, 3).join(' · ')}
                  </Text>
                )}
              </View>
              {current?.recipeId === item.id && (
                <LucideIcon name="check" size={16} color={ACCENT} />
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !showFreeText ? (
              <View style={styles.empty}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {query ? 'No matching recipes' : 'No recipes yet'}
                </Text>
                {!query && (
                  <Text style={[styles.emptyHint, { color: colors.textTertiary }]}>
                    Add recipes in the Recipes section, or type a meal name above
                  </Text>
                )}
              </View>
            ) : null
          }
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 32 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 14 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },

  list: { maxHeight: 360 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '500' },
  rowTags: { fontSize: 12, marginTop: 2 },

  empty: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptyHint: { fontSize: 13, textAlign: 'center' },
});
