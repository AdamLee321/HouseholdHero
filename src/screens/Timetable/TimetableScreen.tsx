import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { SheetManager } from 'react-native-actions-sheet';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  TimetableEvent,
  subscribeToTimetableEvents,
} from '../../services/timetableService';
import WeekTab from './tabs/WeekTab';
import EventsTab from './tabs/EventsTab';

type Tab = 'week' | 'events';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'week',   label: 'Week',   emoji: '📅' },
  { key: 'events', label: 'Events', emoji: '📋' },
];

export default function TimetableScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<Tab>('week');
  const [events, setEvents] = useState<TimetableEvent[]>([]);

  const uid         = auth().currentUser?.uid ?? '';
  const displayName = profile?.displayName ?? 'Unknown';
  const familyId    = family?.id ?? '';
  const ACCENT      = colors.tiles.timetable.icon;

  useEffect(() => {
    if (!family) { return; }
    return subscribeToTimetableEvents(family.id, setEvents);
  }, [family]);

  function openAddSheet() {
    SheetManager.show('add-timetable-event', {
      payload: { familyId, uid, displayName },
    });
  }

  function openEditSheet(event: TimetableEvent) {
    SheetManager.show('add-timetable-event', {
      payload: { familyId, uid, displayName, editEvent: event },
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && {
                borderBottomColor: ACCENT,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === tab.key
                      ? ACCENT
                      : colors.textTertiary,
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={styles.content}>
        {activeTab === 'week' && (
          <WeekTab events={events} onEdit={openEditSheet} />
        )}
        {activeTab === 'events' && (
          <EventsTab events={events} onEdit={openEditSheet} />
        )}
      </View>

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
        ]}
        onPress={openAddSheet}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabEmoji: { fontSize: 18 },
  tabLabel: { fontSize: 12, fontWeight: '600' },
  content: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
