import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActionSheet, {SheetManager, SheetProps} from 'react-native-actions-sheet';
import Text from '../components/Text';
import { useTheme } from '../theme/useTheme';

type SortBy = 'az' | 'za' | 'newest' | 'oldest';
type ViewMode = 'grid' | 'list';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'az', label: 'A → Z' },
  { key: 'za', label: 'Z → A' },
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
];

export default function DocumentOptionsSheet(props: SheetProps<'doc-options'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.documents.icon;

  const { sortBy, viewMode, onSortChange, onViewChange } = props.payload!;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 20,
      }}>
      {/* View mode */}
      <Text
        style={[styles.optionsSection, { color: colors.textSecondary }]}
      >
        View
      </Text>
      <View style={styles.viewToggleRow}>
        {(['grid', 'list'] as ViewMode[]).map(v => (
          <TouchableOpacity
            key={v}
            style={[
              styles.viewToggleBtn,
              {
                backgroundColor:
                  viewMode === v ? ACCENT : colors.surfaceSecondary,
                borderColor: viewMode === v ? ACCENT : colors.border,
              },
            ]}
            onPress={() => {
              onViewChange(v);
              AsyncStorage.setItem('docs_view_mode', v);
              SheetManager.hide(props.sheetId);
            }}
          >
            <Text style={styles.viewToggleEmoji}>
              {v === 'grid' ? '⊞' : '≡'}
            </Text>
            <Text
              style={[
                styles.viewToggleLabel,
                { color: viewMode === v ? '#fff' : colors.text },
              ]}
            >
              {v === 'grid' ? 'Grid' : 'List'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sort */}
      <Text
        style={[styles.optionsSection, { color: colors.textSecondary }]}
      >
        Sort by
      </Text>
      {SORT_OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.key}
          style={[styles.optionRow, { borderBottomColor: colors.border }]}
          onPress={() => {
            onSortChange(opt.key);
            AsyncStorage.setItem('docs_sort_by', opt.key);
            SheetManager.hide(props.sheetId);
          }}
        >
          <Text style={[styles.optionLabel, { color: colors.text }]}>
            {opt.label}
          </Text>
          {sortBy === opt.key && (
            <Text style={[styles.optionCheck, { color: ACCENT }]}>✓</Text>
          )}
        </TouchableOpacity>
      ))}
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  optionsSection: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 4,
  },

  viewToggleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  viewToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  viewToggleEmoji: { fontSize: 18 },
  viewToggleLabel: { fontSize: 15, fontWeight: '600' },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionLabel: { flex: 1, fontSize: 16 },
  optionCheck: { fontSize: 18, fontWeight: '700' },
});
