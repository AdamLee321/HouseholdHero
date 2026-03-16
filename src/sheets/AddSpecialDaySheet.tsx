import React, { useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import ActionSheet, { SheetManager, SheetProps, ScrollView } from 'react-native-actions-sheet';
import DateTimePicker from '@react-native-community/datetimepicker';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useTheme } from '../theme/useTheme';
import { FamilyMember } from '../services/familyService';
import {
  SpecialDay,
  SpecialDayType,
  SpecialDayReminderOption,
  TYPE_META,
  REMINDER_LABELS,
  addSpecialDay,
  updateSpecialDay,
  deleteSpecialDay,
} from '../services/specialDaysService';
import {
  scheduleSpecialDayReminder,
  cancelSpecialDayReminder,
} from '../services/notificationService';

const TYPES: SpecialDayType[] = ['birthday', 'anniversary', 'memorial', 'holiday', 'other'];
const REMINDERS: SpecialDayReminderOption[] = ['none', 'on_day', '1day', '3days', '1week', '2weeks'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function daysInMonth(month: number): number {
  return new Date(2024, month, 0).getDate(); // 2024 is a leap year — safe max
}

export default function AddSpecialDaySheet(props: SheetProps<'add-special-day'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.specialDays.icon;
  const { familyId, uid, displayName, members, editDay } = props.payload ?? {};

  const isEditing = !!editDay;

  const [title, setTitle] = useState('');
  const [type, setType] = useState<SpecialDayType>('birthday');
  const [day, setDay] = useState(1);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [hasYear, setHasYear] = useState(false);
  const [yearStr, setYearStr] = useState(String(new Date().getFullYear()));
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [reminder, setReminder] = useState<SpecialDayReminderOption>('1day');
  const [note, setNote] = useState('');

  const [hasTime, setHasTime] = useState(false);
  const [timeDate, setTimeDate] = useState(() => {
    const d = new Date(); d.setHours(9, 0, 0, 0); return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.payload) { return; }
    const e = props.payload.editDay;
    setTitle(e?.title ?? '');
    setType(e?.type ?? 'birthday');
    setDay(e?.day ?? 1);
    setMonth(e?.month ?? (new Date().getMonth() + 1));
    setHasYear(e?.year != null);
    setYearStr(e?.year != null ? String(e.year) : String(new Date().getFullYear()));
    setSelectedMemberIds(e?.memberIds ?? []);
    setReminder(e?.reminder ?? '1day');
    setNote(e?.note ?? '');
    setHasTime(e?.time != null);
    if (e?.time) {
      const [h, m] = e.time.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      setTimeDate(d);
    } else {
      const d = new Date(); d.setHours(9, 0, 0, 0);
      setTimeDate(d);
    }
    setShowTimePicker(false);
    setShowMonthPicker(false);
    setShowDayPicker(false);
    setShowReminderPicker(false);
  }, [props.payload]);

  function toggleMember(id: string) {
    setSelectedMemberIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!title.trim()) { return; }
    if (!familyId || !uid || !displayName) { return; }
    setSaving(true);
    try {
      const year = hasYear ? parseInt(yearStr, 10) || null : null;
      const timeStr = hasTime
        ? `${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`
        : null;
      const selectedMembers = (members ?? []).filter(m => selectedMemberIds.includes(m.uid));
      const payload = {
        title: title.trim(),
        type,
        day,
        month,
        year,
        time: timeStr,
        memberIds: selectedMembers.map(m => m.uid),
        memberNames: selectedMembers.map(m => m.displayName),
        reminder,
        note: note.trim(),
      };

      if (isEditing && editDay) {
        await cancelSpecialDayReminder(editDay.id);
        await updateSpecialDay(familyId, editDay.id, payload);
        scheduleSpecialDayReminder(
          editDay.id, payload.title, payload.day, payload.month, payload.year, payload.time, payload.reminder,
        ).catch(() => {});
      } else {
        const newId = await addSpecialDay(familyId, {
          ...payload,
          addedBy: uid,
          addedByName: displayName,
        });
        scheduleSpecialDayReminder(
          newId, payload.title, payload.day, payload.month, payload.year, payload.time, payload.reminder,
        ).catch(() => {});
      }
      SheetManager.hide(props.sheetId);
    } catch (e: any) {
      Alert.alert('Could not save', e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    if (!editDay || !familyId) { return; }
    Alert.alert(
      'Delete Special Day',
      `Remove "${editDay.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await cancelSpecialDayReminder(editDay.id);
            await deleteSpecialDay(familyId, editDay.id);
            SheetManager.hide(props.sheetId);
          },
        },
      ],
    );
  }

  const maxDay = daysInMonth(month);
  const safeDay = Math.min(day, maxDay);

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
        {/* Header */}
        <View style={styles.titleRow}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Special Day' : 'New Special Day'}
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
          placeholder="e.g. Mum's Birthday, Wedding Anniversary"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* Type */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
        <View style={styles.typeRow}>
          {TYPES.map(t => {
            const active = t === type;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  { borderColor: active ? ACCENT : colors.border },
                  active && { backgroundColor: ACCENT },
                ]}
                onPress={() => setType(t)}
              >
                <Text style={styles.typeEmoji}>{TYPE_META[t].emoji}</Text>
                <Text style={[styles.typeLabel, { color: active ? '#fff' : colors.textSecondary }]}>
                  {TYPE_META[t].label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
        <View style={styles.dateRow}>
          {/* Month */}
          <TouchableOpacity
            style={[styles.dateBtn, { flex: 2, backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => { setShowDayPicker(false); setShowMonthPicker(v => !v); }}
          >
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{MONTHS[month - 1]}</Text>
          </TouchableOpacity>
          {/* Day */}
          <TouchableOpacity
            style={[styles.dateBtn, { flex: 1, backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => { setShowMonthPicker(false); setShowDayPicker(v => !v); }}
          >
            <Text style={[styles.dateBtnText, { color: colors.text }]}>{safeDay}</Text>
          </TouchableOpacity>
        </View>

        {showMonthPicker && (
          <View style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {MONTHS.map((m, i) => (
              <TouchableOpacity
                key={m}
                style={[
                  styles.pickerItem,
                  { borderBottomColor: colors.border },
                  month === i + 1 && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => { setMonth(i + 1); setShowMonthPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: month === i + 1 ? ACCENT : colors.text }]}>
                  {m}
                </Text>
                {month === i + 1 && <Text style={{ color: ACCENT }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {showDayPicker && (
          <View style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={styles.dayGrid}>
              {Array.from({ length: maxDay }, (_, i) => i + 1).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.dayGridItem,
                    { borderColor: colors.border },
                    safeDay === d && { backgroundColor: ACCENT, borderColor: ACCENT },
                  ]}
                  onPress={() => { setDay(d); setShowDayPicker(false); }}
                >
                  <Text style={[styles.dayGridText, { color: safeDay === d ? '#fff' : colors.text }]}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Include year? */}
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Include year</Text>
            <Text style={[styles.switchSub, { color: colors.textTertiary }]}>
              Turn off for annual events like birthdays
            </Text>
          </View>
          <Switch
            value={hasYear}
            onValueChange={setHasYear}
            trackColor={{ false: colors.border, true: ACCENT }}
            thumbColor="#fff"
          />
        </View>
        {hasYear && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Year</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. 1990"
              placeholderTextColor={colors.textTertiary}
              value={yearStr}
              onChangeText={setYearStr}
              keyboardType="number-pad"
              maxLength={4}
            />
          </>
        )}

        {/* Time */}
        <View style={styles.switchRow}>
          <View>
            <Text style={[styles.switchLabel, { color: colors.text }]}>Include time</Text>
            <Text style={[styles.switchSub, { color: colors.textTertiary }]}>
              Shows a live countdown when set
            </Text>
          </View>
          <Switch
            value={hasTime}
            onValueChange={v => { setHasTime(v); setShowTimePicker(false); }}
            trackColor={{ false: colors.border, true: ACCENT }}
            thumbColor="#fff"
          />
        </View>
        {hasTime && Platform.OS === 'ios' && (
          <View style={{ marginBottom: 16 }}>
            <DateTimePicker
              value={timeDate}
              mode="time"
              display="spinner"
              onChange={(_e, date) => { if (date) { setTimeDate(date); } }}
            />
          </View>
        )}
        {hasTime && Platform.OS === 'android' && (
          <>
            <TouchableOpacity
              style={[styles.dateBtn, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 16 }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.dateBtnText, { color: colors.text }]}>
                🕐 {`${String(timeDate.getHours()).padStart(2, '0')}:${String(timeDate.getMinutes()).padStart(2, '0')}`}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={timeDate}
                mode="time"
                display="default"
                onChange={(_e, date) => { setShowTimePicker(false); if (date) { setTimeDate(date); } }}
              />
            )}
          </>
        )}

        {/* Family members */}
        {(members ?? []).length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>For</Text>
            <View style={styles.memberRow}>
              {(members ?? []).map(m => {
                const active = selectedMemberIds.includes(m.uid);
                return (
                  <TouchableOpacity
                    key={m.uid}
                    style={[
                      styles.memberChip,
                      { borderColor: active ? ACCENT : colors.border },
                      active && { backgroundColor: ACCENT },
                    ]}
                    onPress={() => toggleMember(m.uid)}
                  >
                    <Text style={[styles.memberChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                      {m.displayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
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
          <View style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {REMINDERS.map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.pickerItem,
                  { borderBottomColor: colors.border },
                  r === reminder && { backgroundColor: colors.primaryLight },
                ]}
                onPress={() => { setReminder(r); setShowReminderPicker(false); }}
              >
                <Text style={[styles.pickerItemText, { color: r === reminder ? ACCENT : colors.text }]}>
                  {REMINDER_LABELS[r]}
                </Text>
                {r === reminder && <Text style={{ color: ACCENT }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Note */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>Note (optional)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder="Add a note..."
          placeholderTextColor={colors.textTertiary}
          value={note}
          onChangeText={setNote}
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
            <Text style={styles.btnSaveText}>{saving ? 'Saving...' : isEditing ? 'Save' : 'Add'}</Text>
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, marginBottom: 16 },
  inputMulti: { height: 80, paddingTop: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1.5, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  typeEmoji: { fontSize: 14 },
  typeLabel: { fontSize: 13, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' },
  dateBtnText: { fontSize: 15, fontWeight: '500' },
  pickerCard: { borderWidth: 1, borderRadius: 10, marginBottom: 16, overflow: 'hidden' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerItemText: { fontSize: 14 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 6 },
  dayGridItem: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dayGridText: { fontSize: 14, fontWeight: '600' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  switchLabel: { fontSize: 15, fontWeight: '600' },
  switchSub: { fontSize: 12, marginTop: 2 },
  memberRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  memberChip: { borderWidth: 1.5, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  memberChipText: { fontSize: 13, fontWeight: '600' },
  pickerBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 16 },
  pickerBtnText: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnCancel: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnCancelText: { fontSize: 15, fontWeight: '600' },
  btnSave: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
