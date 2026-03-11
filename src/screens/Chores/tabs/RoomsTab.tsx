import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import {useTheme} from '../../../theme/useTheme';
import {useFamilyStore} from '../../../store/familyStore';
import {
  Room, Chore, ChoreStatus, EFFORT_POINTS,
  updateChoreStatus, deleteChore, deleteRoom, isDue,
} from '../../../services/choreService';

const STATUS_NEXT: Record<ChoreStatus, ChoreStatus> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

const STATUS_COLORS = {
  pending: '#FF9500',
  in_progress: '#4F6EF7',
  done: '#34C759',
};

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
};

const EFFORT_COLORS = {easy: '#34C759', medium: '#FF9500', hard: '#FF3B30'};

interface Props {
  rooms: Room[];
  chores: Chore[];
}

export default function RoomsTab({rooms, chores}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family, profile} = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';

  async function handleToggleStatus(chore: Chore) {
    if (!family) {return;}
    const next = STATUS_NEXT[chore.status];
    await updateChoreStatus(family.id, chore, next, uid, profile?.displayName ?? 'Someone');
  }

  async function handleDeleteChore(chore: Chore) {
    if (!family) {return;}
    Alert.alert('Delete Chore', `Delete "${chore.name}"?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Delete', style: 'destructive', onPress: () => deleteChore(family.id, chore.id)},
    ]);
  }

  async function handleDeleteRoom(room: Room) {
    if (!family) {return;}
    const count = chores.filter(c => c.roomId === room.id).length;
    Alert.alert(
      'Delete Room',
      `Delete "${room.name}"${count > 0 ? ` and its ${count} chore${count !== 1 ? 's' : ''}` : ''}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Delete', style: 'destructive', onPress: () => deleteRoom(family.id, room.id)},
      ],
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🏠</Text>
        <Text style={[styles.emptyTitle, {color: colors.text}]}>No rooms yet</Text>
        <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
          Tap + to add a room and chores
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 100}]}>
      {rooms.map(room => {
        const roomChores = chores.filter(c => c.roomId === room.id);
        const doneCount = roomChores.filter(c => c.status === 'done' && !isDue(c)).length;
        const total = roomChores.length;
        const progress = total > 0 ? doneCount / total : 0;

        return (
          <Swipeable
            key={room.id}
            renderRightActions={() => (
              <TouchableOpacity
                style={[styles.deleteRoomAction, {backgroundColor: colors.danger}]}
                onPress={() => handleDeleteRoom(room)}>
                <Text style={styles.deleteActionText}>Delete{'\n'}Room</Text>
              </TouchableOpacity>
            )}>
            <View style={[styles.roomCard, {backgroundColor: colors.surface}]}>
              {/* Room header */}
              <View style={styles.roomHeader}>
                <Text style={[styles.roomName, {color: colors.text}]}>{room.name}</Text>
                <Text style={[styles.roomCount, {color: colors.textSecondary}]}>
                  {doneCount}/{total}
                </Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressTrack, {backgroundColor: colors.surfaceSecondary}]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress * 100}%`,
                      backgroundColor: progress === 1 ? colors.success : colors.primary,
                    },
                  ]}
                />
              </View>

              {/* Chores */}
              {roomChores.length === 0 ? (
                <Text style={[styles.noChores, {color: colors.textTertiary}]}>No chores in this room</Text>
              ) : (
                roomChores.map((chore, idx) => (
                  <Swipeable
                    key={chore.id}
                    renderRightActions={() => (
                      <TouchableOpacity
                        style={[styles.deleteChoreAction, {backgroundColor: colors.danger}]}
                        onPress={() => handleDeleteChore(chore)}>
                        <Text style={styles.deleteActionText}>Delete</Text>
                      </TouchableOpacity>
                    )}>
                    <TouchableOpacity
                      style={[
                        styles.choreRow,
                        {borderTopColor: colors.border},
                        idx === 0 && {borderTopWidth: StyleSheet.hairlineWidth},
                      ]}
                      onPress={() => handleToggleStatus(chore)}
                      activeOpacity={0.7}>
                      {/* Status indicator */}
                      <View style={[styles.statusDot, {backgroundColor: STATUS_COLORS[chore.status]}]} />

                      {/* Chore info */}
                      <View style={styles.choreInfo}>
                        <Text style={[styles.choreName, {color: colors.text}, chore.status === 'done' && {textDecorationLine: 'line-through', color: colors.textTertiary}]}>
                          {chore.name}
                        </Text>
                        <View style={styles.choreMetaRow}>
                          <View style={[styles.statusBadge, {backgroundColor: STATUS_COLORS[chore.status] + '22'}]}>
                            <Text style={[styles.statusBadgeText, {color: STATUS_COLORS[chore.status]}]}>
                              {STATUS_LABELS[chore.status]}
                            </Text>
                          </View>
                          <View style={[styles.effortBadge, {backgroundColor: EFFORT_COLORS[chore.effort] + '22'}]}>
                            <Text style={[styles.effortBadgeText, {color: EFFORT_COLORS[chore.effort]}]}>
                              {chore.effort} +{EFFORT_POINTS[chore.effort]}pt
                            </Text>
                          </View>
                          <Text style={[styles.frequency, {color: colors.textTertiary}]}>{chore.frequency}</Text>
                        </View>
                        {chore.assignedToName && (
                          <Text style={[styles.assignee, {color: colors.textSecondary}]}>
                            👤 {chore.assignedToName}
                          </Text>
                        )}
                        {chore.note ? (
                          <Text style={[styles.choreNote, {color: colors.textTertiary}]}>{chore.note}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </Swipeable>
                ))
              )}
            </View>
          </Swipeable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16, gap: 12},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 20, fontWeight: '700', marginBottom: 8},
  emptySubtitle: {fontSize: 15},
  roomCard: {borderRadius: 18, overflow: 'hidden', padding: 16},
  roomHeader: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10},
  roomName: {fontSize: 18, fontWeight: '700'},
  roomCount: {fontSize: 14},
  progressTrack: {height: 6, borderRadius: 3, marginBottom: 12, overflow: 'hidden'},
  progressFill: {height: 6, borderRadius: 3},
  noChores: {fontSize: 13, paddingVertical: 8},
  choreRow: {flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, gap: 12, borderTopWidth: StyleSheet.hairlineWidth},
  statusDot: {width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0},
  choreInfo: {flex: 1},
  choreName: {fontSize: 15, fontWeight: '600', marginBottom: 4},
  choreMetaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  statusBadgeText: {fontSize: 11, fontWeight: '700'},
  effortBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  effortBadgeText: {fontSize: 11, fontWeight: '700'},
  frequency: {fontSize: 11, alignSelf: 'center'},
  assignee: {fontSize: 12, marginTop: 2},
  choreNote: {fontSize: 12, marginTop: 2, fontStyle: 'italic'},
  deleteRoomAction: {justifyContent: 'center', alignItems: 'center', width: 80, margin: 0},
  deleteChoreAction: {justifyContent: 'center', alignItems: 'center', width: 80},
  deleteActionText: {color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center'},
});
