import React, { useMemo, useState } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Text from '../../../components/Text';
import { useTheme } from '../../../theme/useTheme';
import {
  TimetableEvent,
  EVENT_COLORS,
  DAY_NAMES_SHORT,
  eventOccursOn,
  formatTime12,
  toDateString,
} from '../../../services/timetableService';

const HOUR_HEIGHT = 64;
const GRID_START_HOUR = 6;  // 6am
const GRID_END_HOUR   = 22; // 10pm
const TOTAL_HOURS = GRID_END_HOUR - GRID_START_HOUR;
const LEFT_GUTTER = 52;

interface Props {
  events: TimetableEvent[];
  onEdit: (event: TimetableEvent) => void;
}

function getWeekStart(base: Date): Date {
  const d = new Date(base);
  // Start week on Monday
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function WeekTab({ events, onEdit }: Props) {
  const { colors, isDark } = useTheme();
  const ACCENT = colors.tiles.timetable.icon;

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date().getDay();
    return today === 0 ? 6 : today - 1; // Mon=0 … Sun=6
  });

  const weekStart = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getWeekStart(base);
  }, [weekOffset]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const selectedDate = weekDays[selectedDayIndex];

  const todayStr = toDateString(new Date());

  const dayEvents = useMemo(
    () =>
      events
        .filter(e => eventOccursOn(e, selectedDate))
        .sort(
          (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
        ),
    [events, selectedDate],
  );

  // Current time indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop =
    ((currentMinutes - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showCurrentTime =
    toDateString(selectedDate) === todayStr &&
    now.getHours() >= GRID_START_HOUR &&
    now.getHours() < GRID_END_HOUR;

  const weekLabel = useMemo(() => {
    const start = weekDays[0];
    const end   = weekDays[6];
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr   = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} – ${endStr}`;
  }, [weekDays]);

  return (
    <View style={styles.container}>
      {/* Week navigation */}
      <View style={[styles.weekNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setWeekOffset(o => o - 1)}
        >
          <Text style={[styles.navArrowText, { color: ACCENT }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.weekLabel, { color: colors.text }]}>{weekLabel}</Text>
        <TouchableOpacity
          style={styles.navArrow}
          onPress={() => setWeekOffset(o => o + 1)}
        >
          <Text style={[styles.navArrowText, { color: ACCENT }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <View style={[styles.dayRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {weekDays.map((day, idx) => {
          const isSelected = idx === selectedDayIndex;
          const isToday    = toDateString(day) === todayStr;
          const hasEvents  = events.some(e => eventOccursOn(e, day));
          return (
            <TouchableOpacity
              key={idx}
              style={styles.dayChip}
              onPress={() => setSelectedDayIndex(idx)}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isSelected ? ACCENT : colors.textTertiary },
                ]}
              >
                {DAY_NAMES_SHORT[(idx + 1) % 7]}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isSelected && { backgroundColor: ACCENT },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: ACCENT },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    { color: isSelected ? '#fff' : isToday ? ACCENT : colors.text },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </View>
              {hasEvents && (
                <View style={[styles.dot, { backgroundColor: isSelected ? ACCENT : colors.textTertiary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.grid}>
          {/* Hour lines and labels */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => {
            const hour = GRID_START_HOUR + i;
            const label =
              hour === 12
                ? '12 PM'
                : hour > 12
                ? `${hour - 12} PM`
                : `${hour} AM`;
            return (
              <View
                key={hour}
                style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}
              >
                <Text style={[styles.hourLabel, { color: colors.textTertiary }]}>
                  {label}
                </Text>
                <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
              </View>
            );
          })}

          {/* Events */}
          <View style={styles.eventsLayer}>
            {dayEvents.map(event => {
              const startMins = timeToMinutes(event.startTime);
              const endMins   = timeToMinutes(event.endTime);
              const top       = ((startMins - GRID_START_HOUR * 60) / 60) * HOUR_HEIGHT;
              const height    = Math.max(
                ((endMins - startMins) / 60) * HOUR_HEIGHT,
                32,
              );
              const hex = isDark
                ? EVENT_COLORS[event.color].dark
                : EVENT_COLORS[event.color].light;
              return (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventBlock,
                    {
                      top,
                      height,
                      backgroundColor: hex + '22',
                      borderLeftColor: hex,
                    },
                  ]}
                  onPress={() => onEdit(event)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[styles.eventTitle, { color: hex }]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                  {height >= 40 && (
                    <Text
                      style={[styles.eventTime, { color: hex + 'BB' }]}
                      numberOfLines={1}
                    >
                      {formatTime12(event.startTime)} – {formatTime12(event.endTime)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Current time line */}
            {showCurrentTime && (
              <View style={[styles.nowLine, { top: currentTop }]}>
                <View style={[styles.nowDot, { backgroundColor: colors.danger }]} />
                <View style={[styles.nowBar, { backgroundColor: colors.danger }]} />
              </View>
            )}
          </View>

          {/* Total grid height spacer */}
          <View style={{ height: TOTAL_HOURS * HOUR_HEIGHT + 32 }} />
        </View>

        {/* Empty state */}
        {dayEvents.length === 0 && (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyEmoji]}>📭</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No events scheduled
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navArrow: { paddingHorizontal: 12, paddingVertical: 4 },
  navArrowText: { fontSize: 28, lineHeight: 32, fontWeight: '300' },
  weekLabel: { fontSize: 14, fontWeight: '600' },
  dayRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 8,
    paddingTop: 4,
  },
  dayChip: { flex: 1, alignItems: 'center', gap: 2 },
  dayName: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  dayNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumberText: { fontSize: 14, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2 },
  grid: { position: 'relative', paddingTop: 8 },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourLabel: {
    width: LEFT_GUTTER,
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 8,
    fontWeight: '500',
  },
  hourLine: { flex: 1, height: StyleSheet.hairlineWidth },
  eventsLayer: { position: 'absolute', top: 8, left: LEFT_GUTTER, right: 0 },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderLeftWidth: 3,
    borderRadius: 6,
    padding: 4,
    overflow: 'hidden',
  },
  eventTitle: { fontSize: 12, fontWeight: '700' },
  eventTime:  { fontSize: 10, marginTop: 1 },
  nowLine: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 8, height: 8, borderRadius: 4 },
  nowBar: { flex: 1, height: 1.5 },
  emptyWrap: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 36, marginBottom: 8 },
  emptyText: { fontSize: 14 },
});
