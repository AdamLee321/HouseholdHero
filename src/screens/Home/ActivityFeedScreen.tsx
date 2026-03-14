import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  ActivityItem,
  subscribeToActivity,
  activityLabel,
  activityEmoji,
  relativeTime,
  groupByDay,
} from '../../services/activityService';

type Section = { label: string; data: ActivityItem[] };

export default function ActivityFeedScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!family) { return; }
    return subscribeToActivity(family.id, setItems, 100);
  }, [family]);

  const sections = groupByDay(items);

  function renderItem({ item }: { item: ActivityItem }) {
    return (
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <View style={[styles.emojiWrap, { backgroundColor: colors.surfaceSecondary }]}>
          <Text style={styles.emoji}>{activityEmoji(item.type)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={[styles.label, { color: colors.text }]} numberOfLines={2}>
            {activityLabel(item)}
          </Text>
          <Text style={[styles.time, { color: colors.textTertiary }]}>
            {relativeTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  }

  function renderSectionHeader(label: string) {
    return (
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    );
  }

  function renderSection({ item: section }: { item: Section }) {
    return (
      <View>
        {renderSectionHeader(section.label)}
        {section.data.map(a => renderItem({ item: a }))}
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.background }]}>
        <Text style={styles.emptyEmoji}>📋</Text>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No activity yet</Text>
        <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
          Family activity will appear here as you use the app
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 24 },
      ]}
      data={sections}
      keyExtractor={s => s.label}
      renderItem={renderSection}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 8, paddingHorizontal: 16 },
  sectionHeader: { paddingVertical: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  emojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 20 },
  rowBody: { flex: 1, gap: 2 },
  label: { fontSize: 14, fontWeight: '500', lineHeight: 19 },
  time: { fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
