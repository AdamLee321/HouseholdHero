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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

export default function UpcomingTab({events, onDelete}: Props) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.calendar.icon;

  const upcoming = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return events.filter(e => e.startDate >= startOfToday.getTime());
  }, [events]);

  if (upcoming.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🗓️</Text>
        <Text style={[styles.emptyTitle, {color: colors.text}]}>
          No upcoming events
        </Text>
        <Text style={[styles.emptyHint, {color: colors.textSecondary}]}>
          Tap + to add one
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={upcoming}
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
              {backgroundColor: colors.surface, borderLeftColor: ACCENT},
            ]}>
            <View style={styles.dateBlock}>
              <Text style={[styles.dateDay, {color: ACCENT}]}>
                {new Date(item.startDate).getDate()}
              </Text>
              <Text style={[styles.dateMon, {color: colors.textSecondary}]}>
                {new Date(item.startDate).toLocaleDateString('en-US', {
                  month: 'short',
                })}
              </Text>
            </View>
            <View style={styles.eventInfo}>
              <Text
                style={[styles.eventTitle, {color: colors.text}]}
                numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.eventMeta, {color: colors.textSecondary}]}>
                {item.allDay ? 'All day' : formatTime(item.startDate)} ·{' '}
                {formatDate(item.startDate).split(',')[0]}
              </Text>
              {!!item.description && (
                <Text
                  style={[styles.eventDesc, {color: colors.textTertiary}]}
                  numberOfLines={1}>
                  {item.description}
                </Text>
              )}
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
  emptyHint: {fontSize: 14, marginTop: 4},
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
  eventDesc: {fontSize: 12, marginTop: 2},
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
