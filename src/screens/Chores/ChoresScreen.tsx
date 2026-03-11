import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  Room,
  Chore,
  ChorePoints,
  subscribeToRooms,
  subscribeToChores,
  subscribeToLeaderboard,
} from '../../services/choreService';
import { FamilyMember } from '../../services/familyService';
import RoomsTab from './tabs/RoomsTab';
import LeaderboardTab from './tabs/LeaderboardTab';
import ScheduleTab from './tabs/ScheduleTab';
import AddChoreModal from './components/AddChoreModal';

type Tab = 'rooms' | 'leaderboard' | 'schedule';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'rooms', label: 'Rooms', emoji: '🏠' },
  { key: 'leaderboard', label: 'Leaderboard', emoji: '🏆' },
  { key: 'schedule', label: 'Schedule', emoji: '📅' },
];

export default function ChoresScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();

  const [activeTab, setActiveTab] = useState<Tab>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [board, setBoard] = useState<ChorePoints[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsubRooms = subscribeToRooms(family.id, setRooms);
    const unsubChores = subscribeToChores(family.id, setChores);
    const unsubBoard = subscribeToLeaderboard(family.id, setBoard);

    // Load family members for assignee picker
    const unsubMembers = firestore()
      .collection('users')
      .where('familyId', '==', family.id)
      .onSnapshot(snap => {
        setMembers(
          snap.docs.map(d => ({
            uid: d.id,
            displayName: d.data().displayName ?? 'Unknown',
            email: d.data().email ?? null,
            role: d.data().uid === family.createdBy ? 'admin' : 'member',
          })),
        );
      });

    return () => {
      unsubRooms();
      unsubChores();
      unsubBoard();
      unsubMembers();
    };
  }, [family]);

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
                borderBottomColor: colors.primary,
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
                      ? colors.primary
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
        {activeTab === 'rooms' && <RoomsTab rooms={rooms} chores={chores} />}
        {activeTab === 'leaderboard' && <LeaderboardTab board={board} />}
        {activeTab === 'schedule' && <ScheduleTab chores={chores} />}
      </View>

      {/* FAB — only on rooms tab */}
      {activeTab === 'rooms' && (
        <TouchableOpacity
          style={[
            styles.fab,
            { backgroundColor: colors.primary, bottom: insets.bottom + 90 },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <AddChoreModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        rooms={rooms}
        members={members}
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
