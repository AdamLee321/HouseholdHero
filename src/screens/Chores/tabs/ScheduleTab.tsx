import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import {useTheme} from '../../../theme/useTheme';
import {useFamilyStore} from '../../../store/familyStore';
import {Chore, ChoreStatus, EFFORT_POINTS, isDue, updateChoreStatus} from '../../../services/choreService';

const STATUS_COLORS = {pending: '#FF9500', in_progress: '#4F6EF7', done: '#34C759'};
const STATUS_NEXT: Record<ChoreStatus, ChoreStatus> = {pending: 'in_progress', in_progress: 'done', done: 'pending'};

interface Props {
  chores: Chore[];
}

export default function ScheduleTab({chores}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family, profile} = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';

  const daily = chores.filter(c => c.frequency === 'daily' && isDue(c));
  const weekly = chores.filter(c => c.frequency === 'weekly' && isDue(c));
  const monthly = chores.filter(c => c.frequency === 'monthly' && isDue(c));

  async function handleToggle(chore: Chore) {
    if (!family) {return;}
    await updateChoreStatus(family.id, chore, STATUS_NEXT[chore.status], uid, profile?.displayName ?? 'Someone');
  }

  function renderChore(chore: Chore) {
    return (
      <TouchableOpacity
        key={chore.id}
        style={[styles.choreRow, {backgroundColor: colors.surface, borderLeftColor: STATUS_COLORS[chore.status]}]}
        onPress={() => handleToggle(chore)}
        activeOpacity={0.7}>
        <View style={styles.choreLeft}>
          <Text style={[styles.choreName, {color: colors.text}, chore.status === 'done' && {textDecorationLine: 'line-through', color: colors.textTertiary}]}>
            {chore.name}
          </Text>
          <Text style={[styles.choreMeta, {color: colors.textSecondary}]}>
            {chore.roomName}
            {chore.assignedToName ? ` · ${chore.assignedToName}` : ''}
          </Text>
        </View>
        <View style={styles.choreRight}>
          <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[chore.status] + '22'}]}>
            <Text style={[styles.statusText, {color: STATUS_COLORS[chore.status]}]}>
              {chore.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={[styles.points, {color: colors.textTertiary}]}>+{EFFORT_POINTS[chore.effort]}pt</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const sections = [
    {label: 'TODAY', emoji: '☀️', data: daily},
    {label: 'THIS WEEK', emoji: '📅', data: weekly},
    {label: 'THIS MONTH', emoji: '🗓️', data: monthly},
  ];

  const hasAnything = daily.length + weekly.length + monthly.length > 0;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 100}]}>
      {!hasAnything ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎉</Text>
          <Text style={[styles.emptyTitle, {color: colors.text}]}>All caught up!</Text>
          <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
            No chores due right now
          </Text>
        </View>
      ) : (
        sections.map(section => {
          if (section.data.length === 0) {return null;}
          return (
            <View key={section.label} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={[styles.sectionLabel, {color: colors.textSecondary}]}>{section.label}</Text>
                <View style={[styles.sectionBadge, {backgroundColor: colors.primaryLight}]}>
                  <Text style={[styles.sectionBadgeText, {color: colors.primary}]}>{section.data.length}</Text>
                </View>
              </View>
              <View style={styles.choreList}>
                {section.data.map(renderChore)}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 20, fontWeight: '700', marginBottom: 8},
  emptySubtitle: {fontSize: 15},
  section: {marginBottom: 24},
  sectionHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6},
  sectionEmoji: {fontSize: 16},
  sectionLabel: {fontSize: 11, fontWeight: '700', letterSpacing: 1.2, flex: 1},
  sectionBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10},
  sectionBadgeText: {fontSize: 12, fontWeight: '700'},
  choreList: {gap: 8},
  choreRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 14, padding: 14, borderLeftWidth: 4,
  },
  choreLeft: {flex: 1},
  choreName: {fontSize: 15, fontWeight: '600', marginBottom: 2},
  choreMeta: {fontSize: 12},
  choreRight: {alignItems: 'flex-end', gap: 4},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  statusText: {fontSize: 11, fontWeight: '700'},
  points: {fontSize: 11},
});
