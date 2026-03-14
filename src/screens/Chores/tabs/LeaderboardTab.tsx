import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import Text from '../../../components/Text';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme/useTheme';
import {ChorePoints} from '../../../services/choreService';
import auth from '@react-native-firebase/auth';

const MEDALS = ['🥇', '🥈', '🥉'];

interface Props {
  board: ChorePoints[];
}

export default function LeaderboardTab({board}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const uid = auth().currentUser?.uid;

  if (board.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🏆</Text>
        <Text style={[styles.emptyTitle, {color: colors.text}]}>No points yet</Text>
        <Text style={[styles.emptySubtitle, {color: colors.textSecondary}]}>
          Complete chores to earn points and climb the board
        </Text>
      </View>
    );
  }

  const topScore = board[0]?.points ?? 1;

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 100}]}>

      {/* Top 3 podium */}
      {board.length >= 2 && (
        <View style={styles.podium}>
          {[board[1], board[0], board[2]].filter(Boolean).map((entry, i) => {
            const positions = [1, 0, 2]; // 2nd, 1st, 3rd
            const rank = positions[i];
            const heights = [100, 130, 80];
            return (
              <View key={entry.uid} style={styles.podiumSlot}>
                <Text style={styles.podiumMedal}>{MEDALS[rank] ?? ''}</Text>
                <View style={[
                  styles.podiumAvatar,
                  {backgroundColor: rank === 0 ? colors.primary : colors.primaryLight},
                ]}>
                  <Text style={[styles.podiumAvatarText, {color: rank === 0 ? '#fff' : colors.primary}]}>
                    {entry.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.podiumName, {color: colors.text}]} numberOfLines={1}>
                  {entry.displayName}
                </Text>
                <Text style={[styles.podiumPoints, {color: colors.primary}]}>{entry.points}pt</Text>
                <View style={[styles.podiumBar, {height: heights[i], backgroundColor: rank === 0 ? colors.primary : colors.primaryLight}]} />
              </View>
            );
          })}
        </View>
      )}

      {/* Full list */}
      <View style={[styles.listCard, {backgroundColor: colors.surface}]}>
        {board.map((entry, index) => {
          const isMe = entry.uid === uid;
          const pct = Math.round((entry.points / topScore) * 100);
          return (
            <View
              key={entry.uid}
              style={[
                styles.row,
                {borderBottomColor: colors.border},
                index === board.length - 1 && {borderBottomWidth: 0},
                isMe && {backgroundColor: colors.primaryLight},
              ]}>
              <Text style={[styles.rank, {color: index < 3 ? colors.primary : colors.textTertiary}]}>
                {MEDALS[index] ?? `#${index + 1}`}
              </Text>
              <View style={[styles.avatar, {backgroundColor: colors.primaryLight}]}>
                <Text style={[styles.avatarText, {color: colors.primary}]}>
                  {entry.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.name, {color: colors.text}]}>
                  {entry.displayName}{isMe ? ' (you)' : ''}
                </Text>
                <View style={[styles.barTrack, {backgroundColor: colors.surfaceSecondary}]}>
                  <View style={[styles.barFill, {width: `${pct}%`, backgroundColor: colors.primary}]} />
                </View>
              </View>
              <View style={styles.stats}>
                <Text style={[styles.points, {color: colors.primary}]}>{entry.points}</Text>
                <Text style={[styles.ptLabel, {color: colors.textTertiary}]}>pts</Text>
                <Text style={[styles.completed, {color: colors.textTertiary}]}>
                  {entry.completedCount} done
                </Text>
                {(entry.currentStreak ?? 0) > 0 && (
                  <Text style={styles.streak}>🔥 {entry.currentStreak}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {padding: 16},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 20, fontWeight: '700', marginBottom: 8},
  emptySubtitle: {fontSize: 15, textAlign: 'center', paddingHorizontal: 32},
  podium: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 24, gap: 8},
  podiumSlot: {flex: 1, alignItems: 'center'},
  podiumMedal: {fontSize: 24, marginBottom: 4},
  podiumAvatar: {width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4},
  podiumAvatarText: {fontSize: 20, fontWeight: '700'},
  podiumName: {fontSize: 12, fontWeight: '600', marginBottom: 4, textAlign: 'center'},
  podiumPoints: {fontSize: 14, fontWeight: '800', marginBottom: 4},
  podiumBar: {width: '100%', borderTopLeftRadius: 6, borderTopRightRadius: 6},
  listCard: {borderRadius: 18, overflow: 'hidden'},
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  rank: {fontSize: 18, width: 32, textAlign: 'center'},
  avatar: {width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center'},
  avatarText: {fontSize: 15, fontWeight: '700'},
  info: {flex: 1},
  name: {fontSize: 15, fontWeight: '600', marginBottom: 4},
  barTrack: {height: 4, borderRadius: 2, overflow: 'hidden'},
  barFill: {height: 4, borderRadius: 2},
  stats: {alignItems: 'flex-end'},
  points: {fontSize: 20, fontWeight: '800'},
  ptLabel: {fontSize: 11},
  completed: {fontSize: 11, marginTop: 2},
  streak: {fontSize: 11, marginTop: 2},
});
