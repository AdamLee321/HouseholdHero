import React, { useMemo } from 'react';
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
  formatTime12,
} from '../../../services/timetableService';

interface Props {
  events: TimetableEvent[];
  onEdit: (event: TimetableEvent) => void;
}

export default function EventsTab({ events, onEdit }: Props) {
  const { colors, isDark } = useTheme();

  const recurring = useMemo(
    () =>
      events
        .filter(e => e.isRecurring)
        .sort((a, b) => {
          const aMin = Math.min(...a.recurringDays);
          const bMin = Math.min(...b.recurringDays);
          return aMin - bMin;
        }),
    [events],
  );

  const oneTime = useMemo(
    () =>
      events
        .filter(e => !e.isRecurring && e.date)
        .sort((a, b) => (a.date! > b.date! ? 1 : -1)),
    [events],
  );

  function dayChips(days: number[]) {
    const ordered = [...days].sort((a, b) => {
      // Mon-first order: Mon=1…Sat=6, Sun=0 → treat Sun as 7
      const toOrder = (d: number) => (d === 0 ? 7 : d);
      return toOrder(a) - toOrder(b);
    });
    return ordered.map(d => DAY_NAMES_SHORT[d]).join(' · ');
  }

  function formatDate(dateStr: string): string {
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  function EventRow({ event }: { event: TimetableEvent }) {
    const hex = isDark
      ? EVENT_COLORS[event.color].dark
      : EVENT_COLORS[event.color].light;
    return (
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.surface }]}
        onPress={() => onEdit(event)}
        activeOpacity={0.8}
      >
        <View style={[styles.colorBar, { backgroundColor: hex }]} />
        <View style={styles.rowContent}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {formatTime12(event.startTime)} – {formatTime12(event.endTime)}
          </Text>
          {event.isRecurring ? (
            <Text style={[styles.rowTag, { color: colors.textTertiary }]}>
              🔁 {dayChips(event.recurringDays)}
            </Text>
          ) : (
            <Text style={[styles.rowTag, { color: colors.textTertiary }]}>
              📌 {formatDate(event.date!)}
            </Text>
          )}
          {event.description ? (
            <Text style={[styles.rowDesc, { color: colors.textTertiary }]} numberOfLines={1}>
              {event.description}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
      </TouchableOpacity>
    );
  }

  const isEmpty = recurring.length === 0 && oneTime.length === 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.container, isEmpty && styles.containerEmpty]}
    >
      {isEmpty && (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🗓</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No events yet</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Tap + to add your first timetable event
          </Text>
        </View>
      )}

      {recurring.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            RECURRING
          </Text>
          <View style={styles.list}>
            {recurring.map((e, i) => (
              <View key={e.id}>
                <EventRow event={e} />
                {i < recurring.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {oneTime.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ONE-TIME
          </Text>
          <View style={styles.list}>
            {oneTime.map((e, i) => (
              <View key={e.id}>
                <EventRow event={e} />
                {i < oneTime.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  containerEmpty: { flex: 1, justifyContent: 'center' },
  emptyWrap: { alignItems: 'center', paddingTop: 24 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  list: { borderRadius: 16, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingRight: 16,
  },
  colorBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, marginLeft: 12, marginRight: 12 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  rowMeta: { fontSize: 13, marginBottom: 2 },
  rowTag: { fontSize: 12 },
  rowDesc: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 20, fontWeight: '300', paddingLeft: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 28 },
});
