import React, {useState, useMemo} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Text from '../../../components/Text';
import {Calendar} from 'react-native-calendars';
import {Swipeable} from 'react-native-gesture-handler';
import {useTheme} from '../../../theme/useTheme';
import {CalendarEvent} from '../../../services/calendarService';

function toDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDayLabel(dateStr: string, today: string): string {
  if (dateStr === today) {
    return 'Today';
  }
  // Use noon to avoid timezone-related date shifts
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

interface Props {
  events: CalendarEvent[];
  onDelete: (id: string) => void;
}

export default function MonthTab({events, onDelete}: Props) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.calendar.icon;

  const today = toDateStr(Date.now());
  const [selectedDate, setSelectedDate] = useState(today);

  const markedDates = useMemo(() => {
    const marks: Record<string, object> = {};
    events.forEach(e => {
      const ds = toDateStr(e.startDate);
      marks[ds] = {...marks[ds], marked: true, dotColor: ACCENT};
    });
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: ACCENT,
    };
    return marks;
  }, [events, selectedDate, ACCENT]);

  const dayEvents = useMemo(() => {
    return events
      .filter(e => toDateStr(e.startDate) === selectedDate)
      .sort((a, b) => a.startDate - b.startDate);
  }, [events, selectedDate]);

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <Calendar
        current={today}
        markedDates={markedDates}
        onDayPress={day => setSelectedDate(day.dateString)}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.surface,
          textSectionTitleColor: colors.textSecondary,
          dayTextColor: colors.text,
          todayTextColor: ACCENT,
          selectedDayTextColor: '#fff',
          selectedDayBackgroundColor: ACCENT,
          monthTextColor: colors.text,
          arrowColor: ACCENT,
          dotColor: ACCENT,
          textDisabledColor: colors.textTertiary,
        }}
      />

      {/* Day section */}
      <View style={styles.daySection}>
        <Text style={[styles.dayLabel, {color: colors.textSecondary}]}>
          {formatDayLabel(selectedDate, today)}
        </Text>

        {dayEvents.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={[styles.emptyText, {color: colors.textSecondary}]}>
              No events
            </Text>
          </View>
        ) : (
          <FlatList
            data={dayEvents}
            keyExtractor={e => e.id}
            renderItem={({item}) => (
              <Swipeable
                renderRightActions={() => (
                  <TouchableOpacity
                    style={[
                      styles.deleteAction,
                      {backgroundColor: colors.danger},
                    ]}
                    onPress={() => onDelete(item.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                )}>
                <View
                  style={[
                    styles.eventRow,
                    {
                      backgroundColor: colors.surface,
                      borderLeftColor: ACCENT,
                    },
                  ]}>
                  <View style={styles.eventMain}>
                    <Text
                      style={[styles.eventTitle, {color: colors.text}]}
                      numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text
                      style={[styles.eventMeta, {color: colors.textSecondary}]}>
                      {item.allDay
                        ? 'All day'
                        : formatTime(item.startDate)}{' '}
                      · {item.addedByName}
                    </Text>
                    {!!item.description && (
                      <Text
                        style={[
                          styles.eventDesc,
                          {color: colors.textTertiary},
                        ]}
                        numberOfLines={1}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                </View>
              </Swipeable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  daySection: {flex: 1, paddingTop: 8},
  dayLabel: {fontSize: 12, fontWeight: '600', paddingHorizontal: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5},
  empty: {alignItems: 'center', paddingTop: 24},
  emptyEmoji: {fontSize: 32, marginBottom: 8},
  emptyText: {fontSize: 14},
  eventRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
  },
  eventMain: {flex: 1},
  eventTitle: {fontSize: 15, fontWeight: '600'},
  eventMeta: {fontSize: 12, marginTop: 2},
  eventDesc: {fontSize: 12, marginTop: 2},
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
