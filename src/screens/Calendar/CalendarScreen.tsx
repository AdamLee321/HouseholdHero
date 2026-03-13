import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  CalendarEvent,
  subscribeToCalendarEvents,
  addCalendarEvent,
  deleteCalendarEvent,
} from '../../services/calendarService';
import MonthTab from './tabs/MonthTab';
import UpcomingTab from './tabs/UpcomingTab';
import PastTab from './tabs/PastTab';
import AddEventModal from './components/AddEventModal';

type Tab = 'month' | 'upcoming' | 'past';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'month', label: 'Month', emoji: '📅' },
  { key: 'upcoming', label: 'Upcoming', emoji: '🔜' },
  { key: 'past', label: 'Past', emoji: '🕰️' },
];

export default function CalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<Tab>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToCalendarEvents(family.id, setEvents);
    return unsub;
  }, [family]);

  async function handleAdd(params: {
    title: string;
    description: string;
    startDate: number;
    allDay: boolean;
  }) {
    if (!family) {
      return;
    }
    const uid = auth().currentUser?.uid ?? '';
    const displayName = profile?.displayName ?? 'Unknown';
    await addCalendarEvent(family.id, {
      ...params,
      addedBy: uid,
      addedByName: displayName,
    });
  }

  async function handleDelete(eventId: string) {
    if (!family) {
      return;
    }
    await deleteCalendarEvent(family.id, eventId);
  }

  const showFab = activeTab === 'month' || activeTab === 'upcoming';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && {
                borderBottomColor: colors.tiles.calendar.icon,
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
                      ? colors.tiles.calendar.icon
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
        {activeTab === 'month' && (
          <MonthTab events={events} onDelete={handleDelete} />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingTab events={events} onDelete={handleDelete} />
        )}
        {activeTab === 'past' && (
          <PastTab events={events} onDelete={handleDelete} />
        )}
      </View>

      {/* FAB */}
      {showFab && (
        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: colors.tiles.calendar.icon,
              bottom: insets.bottom + 30,
            },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AddEventModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onAdd={handleAdd}
      />
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
