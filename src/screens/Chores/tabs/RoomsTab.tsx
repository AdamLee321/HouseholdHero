import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import {Swipeable} from 'react-native-gesture-handler';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import {useTheme} from '../../../theme/useTheme';
import {useFamilyStore} from '../../../store/familyStore';
import {
  Room, Chore, EFFORT_POINTS,
  updateChoreStatus, deleteChore, deleteRoom, isDue,
} from '../../../services/choreService';

const EFFORT_COLORS = {easy: '#34C759', medium: '#FF9500', hard: '#FF3B30'};
const DONE_COLOR = '#34C759';

// ── Animated progress bar ────────────────────────────────────────────────────

interface ProgressBarProps {
  progress: number;
  fillColor: string;
  trackColor: string;
}

function ProgressBar({progress, fillColor, trackColor}: ProgressBarProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const animWidth = useSharedValue(0);

  useEffect(() => {
    animWidth.value = withTiming(progress * trackWidth, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, trackWidth]);

  const animStyle = useAnimatedStyle(() => ({
    width: animWidth.value,
  }));

  return (
    <View
      style={[styles.progressTrack, {backgroundColor: trackColor}]}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[styles.progressFill, animStyle, {backgroundColor: fillColor}]} />
    </View>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface Props {
  rooms: Room[];
  chores: Chore[];
}

export default function RoomsTab({rooms, chores}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family, profile} = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';

  async function handleToggleDone(chore: Chore, isDone: boolean) {
    if (!family) {return;}
    // Use the visual done state (status === 'done' AND not due again) so the
    // action always matches what the broom button looks like on screen.
    const next = isDone ? 'pending' : 'done';
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
        const fillColor = progress === 1 ? colors.success : colors.primary;

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

              {/* Animated progress bar */}
              <ProgressBar
                progress={progress}
                fillColor={fillColor}
                trackColor={colors.surfaceSecondary}
              />

              {/* Chores */}
              {roomChores.length === 0 ? (
                <Text style={[styles.noChores, {color: colors.textTertiary}]}>No chores in this room</Text>
              ) : (
                roomChores.map((chore, idx) => {
                  const isDone = chore.status === 'done' && !isDue(chore);
                  return (
                    <Swipeable
                      key={chore.id}
                      renderRightActions={() => (
                        <TouchableOpacity
                          style={[styles.deleteChoreAction, {backgroundColor: colors.danger}]}
                          onPress={() => handleDeleteChore(chore)}>
                          <Text style={styles.deleteActionText}>Delete</Text>
                        </TouchableOpacity>
                      )}>
                      <View
                        style={[
                          styles.choreRow,
                          {borderTopColor: colors.border},
                          idx === 0 && {borderTopWidth: StyleSheet.hairlineWidth},
                        ]}>
                        {/* Chore info */}
                        <View style={styles.choreInfo}>
                          <Text
                            style={[
                              styles.choreName,
                              {color: isDone ? colors.textTertiary : colors.text},
                              isDone && styles.choreNameDone,
                            ]}>
                            {chore.name}
                          </Text>
                          <View style={styles.choreMetaRow}>
                            <View style={[styles.effortBadge, {backgroundColor: EFFORT_COLORS[chore.effort] + '22'}]}>
                              <Text style={[styles.effortBadgeText, {color: EFFORT_COLORS[chore.effort]}]}>
                                {chore.effort} · +{EFFORT_POINTS[chore.effort]}pt
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

                        {/* Sweep button */}
                        <TouchableOpacity
                          style={[
                            styles.sweepBtn,
                            isDone
                              ? {backgroundColor: DONE_COLOR, borderColor: DONE_COLOR}
                              : {backgroundColor: colors.surfaceSecondary, borderColor: colors.border},
                          ]}
                          onPress={() => handleToggleDone(chore, isDone)}
                          activeOpacity={0.7}>
                          <Text style={styles.sweepIcon}>🧹</Text>
                        </TouchableOpacity>
                      </View>
                    </Swipeable>
                  );
                })
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
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  choreInfo: {flex: 1},
  choreName: {fontSize: 15, fontWeight: '600', marginBottom: 4},
  choreNameDone: {textDecorationLine: 'line-through'},
  choreMetaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 2},
  effortBadge: {paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10},
  effortBadgeText: {fontSize: 11, fontWeight: '700'},
  frequency: {fontSize: 11, alignSelf: 'center'},
  assignee: {fontSize: 12, marginTop: 2},
  choreNote: {fontSize: 12, marginTop: 2, fontStyle: 'italic'},
  sweepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sweepIcon: {fontSize: 22},
  deleteRoomAction: {justifyContent: 'center', alignItems: 'center', width: 80, margin: 0},
  deleteChoreAction: {justifyContent: 'center', alignItems: 'center', width: 80},
  deleteActionText: {color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center'},
});
