import React, {useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {Swipeable} from 'react-native-gesture-handler';
import {useTheme} from '../../../theme/useTheme';
import {CalendarEvent} from '../../../services/calendarService';

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

interface Props {
  events: CalendarEvent[];
  onDelete: (id: string) => void;
}

export default function PastTab({events, onDelete}: Props) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.calendar.icon;

  const past = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events
      .filter(e => e.startDate < startOfToday.getTime())
      .reverse(); // most recent first
  }, [events]);

  if (past.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🕰️</Text>
        <Text style={[styles.emptyTitle, {color: colors.text}]}>
          No past events
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={past}
      keyExtractor={e => e.id}
      contentContainerStyle={styles.list}
      renderItem={({item}) => (
        <Swipeable
          renderRightActions={() => (
            <TouchableOpacity
              style={[styles.deleteAction, {backgroundColor: colors.danger}]}
              onPress={() => onDelete(item.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          )}>
          <View
            style={[
              styles.eventRow,
              {
                backgroundColor: colors.surface,
                borderLeftColor: colors.textTertiary,
                opacity: 0.8,
              },
            ]}>
            <View style={styles.dateBlock}>
              <Text style={[styles.dateDay, {color: colors.textSecondary}]}>
                {new Date(item.startDate).getDate()}
              </Text>
              <Text style={[styles.dateMon, {color: colors.textTertiary}]}>
                {new Date(item.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                })}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text
                style={[styles.eventTitle, {color: colors.textSecondary}]}
                numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.eventMeta, {color: colors.textTertiary}]}>
                {item.allDay ? 'All day' : formatTime(item.startDate)}
              </Text>
              <Text style={[styles.eventBy, {color: colors.textTertiary}]}>
                Added by {item.addedByName}
              </Text>
            </View>
          </View>
        </Swipeable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {paddingTop: 8, paddingBottom: 120},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyEmoji: {fontSize: 48, marginBottom: 12},
  emptyTitle: {fontSize: 17, fontWeight: '600'},
  eventRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  dateBlock: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateDay: {fontSize: 22, fontWeight: '700'},
  dateMon: {fontSize: 11, fontWeight: '600', textTransform: 'uppercase'},
  eventInfo: {flex: 1},
  eventTitle: {fontSize: 15, fontWeight: '600'},
  eventMeta: {fontSize: 12, marginTop: 2},
  eventBy: {fontSize: 11, marginTop: 4},
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    marginRight: 16,
  },
  deleteText: {color: '#fff', fontWeight: '600', fontSize: 13},
});
