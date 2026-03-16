import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import ActionSheet, { SheetManager, SheetProps, ScrollView } from 'react-native-actions-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useTheme } from '../theme/useTheme';
import {
  TimetableEvent,
  TimetableEventColor,
  TimetableReminderOption,
  REMINDER_LABELS,
  EVENT_COLORS,
  DAY_NAMES_SHORT,
  addTimetableEvent,
  updateTimetableEvent,
  deleteTimetableEvent,
} from '../services/timetableService';
import {
  scheduleTimetableReminder,
  cancelTimetableReminder,
} from '../services/notificationService';

const COLORS: TimetableEventColor[] = ['blue', 'purple', 'green', 'orange', 'red', 'teal', 'pink'];
const REMINDERS: TimetableReminderOption[] = ['none', '15min', '30min', '1hour', '2hours', '4hours', '1day'];

function to12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function timeFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateToString(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${dy}`;
}

function dateFromString(s: string): Date {
  const [y, mo, d] = s.split('-').map(Number);
  return new Date(y, mo - 1, d);
}

function dateDisplayLabel(s: string): string {
  const d = dateFromString(s);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function defaultStart(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return timeFromDate(d);
}

function defaultEnd(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  return timeFromDate(d);
}

export default function AddTimetableEventSheet(props: SheetProps<'add-timetable-event'>) {
  const { colors, isDark } = useTheme();
  const ACCENT = colors.tiles.timetable.icon;

  // payload may be undefined on initial pre-mount render
  const { familyId = '', uid = '', displayName = '', editEvent } = props.payload ?? {};

  const isEditing = !!editEvent;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(true);
  const [recurringDays, setRecurringDays] = useState<number[]>([1]);
  const [date, setDate] = useState(dateToString(new Date()));
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [reminder, setReminder] = useState<TimetableReminderOption>('1hour');
  const [color, setColor] = useState<TimetableEventColor>('blue');

  // Sync state when payload is provided (sheet becomes visible)
  useEffect(() => {
    if (!props.payload) { return; }
    const e = props.payload.editEvent;
    setTitle(e?.title ?? '');
    setDescription(e?.description ?? '');
    setIsRecurring(e?.isRecurring ?? true);
    setRecurringDays(e?.recurringDays ?? [1]);
    setDate(e?.date ?? dateToString(new Date()));
    setStartTime(e?.startTime ?? defaultStart());
    setEndTime(e?.endTime ?? defaultEnd());
    setReminder(e?.reminder ?? '1hour');
    setColor(e?.color ?? 'blue');
  }, [props.payload]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    );
  }

  function buildStartDateObj(): Date {
    const [h, m] = startTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  function buildEndDateObj(): Date {
    const [h, m] = endTime.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  }

  async function handleSave() {
    if (!title.trim()) { return; }
    if (isRecurring && recurringDays.length === 0) {
      Alert.alert('Select days', 'Please select at least one recurring day.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        isRecurring,
        recurringDays: isRecurring ? recurringDays : [],
        date: isRecurring ? null : date,
        startTime,
        endTime,
        reminder,
        color,
      };

      if (isEditing && editEvent) {
        await cancelTimetableReminder(editEvent.id);
        await updateTimetableEvent(familyId, editEvent.id, payload);
        scheduleTimetableReminder(
          editEvent.id, payload.title, payload.startTime,
          payload.isRecurring, payload.recurringDays, payload.date, payload.reminder,
        ).catch(() => {});
      } else {
        const newId = await addTimetableEvent(familyId, {
          ...payload,
          addedBy: uid,
          addedByName: displayName,
        });
        scheduleTimetableReminder(
          newId, payload.title, payload.startTime,
          payload.isRecurring, payload.recurringDays, payload.date, payload.reminder,
        ).catch(() => {});
      }
      SheetManager.hide(props.sheetId);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEditing || !editEvent) { return; }
    Alert.alert(
      'Delete Event',
      `Remove "${editEvent.title}" from the timetable?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelTimetableReminder(editEvent.id);
            await deleteTimetableEvent(familyId, editEvent.id);
            SheetManager.hide(props.sheetId);
          },
        },
      ],
    );
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Event' : 'New Event'}
          </Text>
          {isEditing && (
            <TouchableOpacity onPress={handleDelete}>
              <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="e.g. School run, Gym, Work shift"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Event type */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
        <View style={[styles.segmentRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segment, isRecurring && { backgroundColor: ACCENT }]}
            onPress={() => setIsRecurring(true)}
          >
            <Text style={[styles.segmentText, { color: isRecurring ? '#fff' : colors.textSecondary }]}>
              🔁 Recurring
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, !isRecurring && { backgroundColor: ACCENT }]}
            onPress={() => setIsRecurring(false)}
          >
            <Text style={[styles.segmentText, { color: !isRecurring ? '#fff' : colors.textSecondary }]}>
              📌 One-time
            </Text>
          </TouchableOpacity>
        </View>

        {/* Recurring days */}
        {isRecurring && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Days</Text>
            <View style={styles.daysRow}>
              {[1, 2, 3, 4, 5, 6, 0].map(day => {
                const active = recurringDays.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      { borderColor: active ? ACCENT : colors.border },
                      active && { backgroundColor: ACCENT },
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text style={[styles.dayChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                      {DAY_NAMES_SHORT[day]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Date for one-time */}
        {!isRecurring && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
            <TouchableOpacity
              style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => { setShowStartPicker(false); setShowEndPicker(false); setShowDatePicker(v => !v); }}
            >
              <Text style={[styles.pickerBtnText, { color: colors.text }]}>
                📅 {dateDisplayLabel(date)}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View>
                <DateTimePicker
                  value={dateFromString(date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') { setShowDatePicker(false); }
                    if (selected) { setDate(dateToString(selected)); }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.doneBtn, { borderColor: colors.border }]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={[styles.doneBtnText, { color: ACCENT }]}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* Start time */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Start time</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => { setShowDatePicker(false); setShowEndPicker(false); setShowStartPicker(v => !v); }}
        >
          <Text style={[styles.pickerBtnText, { color: colors.text }]}>🕐 {to12h(startTime)}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <View>
            <DateTimePicker
              value={buildStartDateObj()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') { setShowStartPicker(false); }
                if (selected) { setStartTime(timeFromDate(selected)); }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.doneBtn, { borderColor: colors.border }]}
                onPress={() => setShowStartPicker(false)}
              >
                <Text style={[styles.doneBtnText, { color: ACCENT }]}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* End time */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>End time</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => { setShowDatePicker(false); setShowStartPicker(false); setShowEndPicker(v => !v); }}
        >
          <Text style={[styles.pickerBtnText, { color: colors.text }]}>🕐 {to12h(endTime)}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <View>
            <DateTimePicker
              value={buildEndDateObj()}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') { setShowEndPicker(false); }
                if (selected) { setEndTime(timeFromDate(selected)); }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.doneBtn, { borderColor: colors.border }]}
                onPress={() => setShowEndPicker(false)}
              >
                <Text style={[styles.doneBtnText, { color: ACCENT }]}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Reminder */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Reminder</Text>
        <TouchableOpacity
          style={[styles.pickerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={() => setShowReminderPicker(v => !v)}
        >
          <Text style={[styles.pickerBtnText, { color: colors.text }]}>
            🔔 {REMINDER_LABELS[reminder]}
          </Text>
        </TouchableOpacity>
        {showReminderPicker && (
          <View style={[styles.dropdownCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {REMINDERS.map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                  r === reminder && { backgroundColor: isDark ? colors.primaryLight : colors.primaryLight },
                ]}
                onPress={() => { setReminder(r); setShowReminderPicker(false); }}
              >
                <Text style={[styles.dropdownText, { color: r === reminder ? ACCENT : colors.text }]}>
                  {REMINDER_LABELS[r]}
                </Text>
                {r === reminder && (
                  <Text style={{ color: ACCENT, fontSize: 14 }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Color */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Colour</Text>
        <View style={styles.colorRow}>
          {COLORS.map(c => {
            const hex = isDark ? EVENT_COLORS[c].dark : EVENT_COLORS[c].light;
            const active = c === color;
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: hex },
                  active && styles.colorSwatchActive,
                ]}
                onPress={() => setColor(c)}
              >
                {active && <Text style={styles.colorCheck}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optional)</Text>
        <TextInput
          style={[
            styles.input,
            styles.inputMulti,
            { backgroundColor: colors.background, color: colors.text, borderColor: colors.border },
          ]}
          placeholder="Add notes..."
          placeholderTextColor={colors.textTertiary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btnCancel, { borderColor: colors.border }]}
            onPress={() => SheetManager.hide(props.sheetId)}
          >
            <Text style={[styles.btnCancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnSave, { backgroundColor: ACCENT, opacity: !title.trim() || saving ? 0.5 : 1 }]}
            onPress={handleSave}
            disabled={!title.trim() || saving}
          >
            <Text style={styles.btnSaveText}>{saving ? 'Saving...' : isEditing ? 'Save' : 'Add Event'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  deleteText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  inputMulti: { height: 80, paddingTop: 10 },
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  daysRow: { flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  dayChip: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipText: { fontSize: 12, fontWeight: '700' },
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pickerBtnText: { fontSize: 15 },
  doneBtn: { borderTopWidth: 1, paddingVertical: 10, alignItems: 'center', marginBottom: 8 },
  doneBtnText: { fontSize: 15, fontWeight: '600' },
  dropdownCard: {
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownText: { fontSize: 14 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    transform: [{ scale: 1.15 }],
  },
  colorCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnCancelText: { fontSize: 15, fontWeight: '600' },
  btnSave: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
