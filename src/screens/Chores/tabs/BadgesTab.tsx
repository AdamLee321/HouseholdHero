import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Text from '../../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../../theme/useTheme';
import { useFamilyStore } from '../../../store/familyStore';
import { ChorePoints, subscribeToMyPoints } from '../../../services/choreService';
import { BADGES } from '../../../services/badgeService';

export default function BadgesTab() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const [myPoints, setMyPoints] = useState<ChorePoints | null>(null);

  useEffect(() => {
    if (!family) { return; }
    return subscribeToMyPoints(family.id, uid, setMyPoints);
  }, [family, uid]);

  const earned = new Set(myPoints?.badges ?? []);
  const earnedBadges = BADGES.filter(b => earned.has(b.id));
  const lockedBadges = BADGES.filter(b => !earned.has(b.id));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
    >
      {/* Streak banner */}
      {(myPoints?.currentStreak ?? 0) > 0 && (
        <View style={[styles.streakBanner, { backgroundColor: colors.surface }]}>
          <Text style={styles.streakFlame}>🔥</Text>
          <View>
            <Text style={[styles.streakCount, { color: colors.text }]}>
              {myPoints!.currentStreak}-day streak
            </Text>
            <Text style={[styles.streakBest, { color: colors.textSecondary }]}>
              Best: {myPoints!.longestStreak} days
            </Text>
          </View>
        </View>
      )}

      {/* Earned */}
      {earnedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            EARNED · {earnedBadges.length}/{BADGES.length}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {earnedBadges.map((badge, i) => (
              <View
                key={badge.id}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  i === earnedBadges.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.badgeEmoji, { backgroundColor: colors.primaryLight }]}>
                  <Text style={styles.emoji}>{badge.emoji}</Text>
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={[styles.badgeName, { color: colors.text }]}>{badge.name}</Text>
                  <Text style={[styles.badgeDesc, { color: colors.textSecondary }]}>{badge.description}</Text>
                </View>
                <Text style={styles.check}>✓</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Locked */}
      {lockedBadges.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>LOCKED</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {lockedBadges.map((badge, i) => (
              <View
                key={badge.id}
                style={[
                  styles.row,
                  styles.rowLocked,
                  { borderBottomColor: colors.border },
                  i === lockedBadges.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={[styles.badgeEmoji, { backgroundColor: colors.surfaceSecondary }]}>
                  <Text style={[styles.emoji, styles.emojiLocked]}>{badge.emoji}</Text>
                </View>
                <View style={styles.badgeInfo}>
                  <Text style={[styles.badgeName, { color: colors.textSecondary }]}>{badge.name}</Text>
                  <Text style={[styles.badgeDesc, { color: colors.textTertiary }]}>{badge.description}</Text>
                </View>
                <Text style={[styles.lock, { color: colors.textTertiary }]}>🔒</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {myPoints === null && (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No badges yet</Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Complete chores to earn your first badge
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 16 },
  streakBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  streakFlame: { fontSize: 36 },
  streakCount: { fontSize: 20, fontWeight: '800' },
  streakBest: { fontSize: 13, marginTop: 2 },
  section: { gap: 8 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  card: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLocked: { opacity: 0.55 },
  badgeEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 22 },
  emojiLocked: { opacity: 0.5 },
  badgeInfo: { flex: 1 },
  badgeName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  badgeDesc: { fontSize: 12 },
  check: { fontSize: 18, color: '#34C759', fontWeight: '700' },
  lock: { fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 14, textAlign: 'center' },
});
