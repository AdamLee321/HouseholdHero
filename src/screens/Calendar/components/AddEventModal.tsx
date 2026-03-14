import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps, ScrollView} from 'react-native-actions-sheet';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useTheme} from '../../../theme/useTheme';

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AddEventModal(props: SheetProps<'add-event'>) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.calendar.icon;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(() => {
    const t = new Date();
    t.setMinutes(0, 0, 0);
    t.setHours(t.getHours() + 1);
    return t;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setTitle('');
    setDescription('');
    setAllDay(false);
    setDate(new Date());
    const t = new Date();
    t.setMinutes(0, 0, 0);
    t.setHours(t.getHours() + 1);
    setTime(t);
    setShowDatePicker(false);
    setShowTimePicker(false);
  }

  function buildTimestamp(): number {
    if (allDay) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    const d = new Date(date);
    d.setHours(time.getHours(), time.getMinutes(), 0, 0);
    return d.getTime();
  }

  async function handleAdd() {
    if (!title.trim()) {
      return;
    }
    setSaving(true);
    try {
      await props.payload!.onAdd({
        title: title.trim(),
        description: description.trim(),
        startDate: buildTimestamp(),
        allDay,
      });
      reset();
      SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    SheetManager.hide(props.sheetId);
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
      }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={[styles.sheetTitle, {color: colors.text}]}>
          New Event
        </Text>

        {/* Title */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>
          Title *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Event title"
          placeholderTextColor={colors.textTertiary}
          value={title}
          onChangeText={setTitle}
        />

        {/* All Day toggle */}
        <View style={styles.row}>
          <Text style={[styles.label, {color: colors.textSecondary, marginBottom: 0}]}>
            All Day
          </Text>
          <Switch
            value={allDay}
            onValueChange={v => {
              setAllDay(v);
              if (v) {
                setShowTimePicker(false);
              }
            }}
            trackColor={{false: colors.border, true: ACCENT}}
            thumbColor="#fff"
          />
        </View>

        {/* Date */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>
          Date
        </Text>
        <TouchableOpacity
          style={[
            styles.pickerBtn,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
          onPress={() => {
            setShowTimePicker(false);
            setShowDatePicker(v => !v);
          }}>
          <Text style={[styles.pickerBtnText, {color: colors.text}]}>
            📅 {formatDate(date)}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <View>
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (selected) {
                  setDate(selected);
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.doneBtn, {borderColor: colors.border}]}
                onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.doneBtnText, {color: ACCENT}]}>
                  Done
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Time — only if not all day */}
        {!allDay && (
          <>
            <Text style={[styles.label, {color: colors.textSecondary}]}>
              Time
            </Text>
            <TouchableOpacity
              style={[
                styles.pickerBtn,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => {
                setShowDatePicker(false);
                setShowTimePicker(v => !v);
              }}>
              <Text style={[styles.pickerBtnText, {color: colors.text}]}>
                🕐 {formatTime(time)}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <View>
                <DateTimePicker
                  value={time}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selected) => {
                    if (Platform.OS === 'android') {
                      setShowTimePicker(false);
                    }
                    if (selected) {
                      setTime(selected);
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={[styles.doneBtn, {borderColor: colors.border}]}
                    onPress={() => setShowTimePicker(false)}>
                    <Text style={[styles.doneBtnText, {color: ACCENT}]}>
                      Done
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* Description */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>
          Description (optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.inputMulti,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Add a note..."
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
            style={[styles.btnCancel, {borderColor: colors.border}]}
            onPress={handleClose}>
            <Text style={[styles.btnCancelText, {color: colors.textSecondary}]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.btnAdd,
              {backgroundColor: ACCENT, opacity: !title.trim() || saving ? 0.5 : 1},
            ]}
            onPress={handleAdd}
            disabled={!title.trim() || saving}>
            <Text style={styles.btnAddText}>
              {saving ? 'Saving...' : 'Add Event'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheetTitle: {fontSize: 18, fontWeight: '700', marginBottom: 20},
  label: {fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6},
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  inputMulti: {height: 80, paddingTop: 10},
  row: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16},
  pickerBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  pickerBtnText: {fontSize: 15},
  doneBtn: {
    borderTopWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnText: {fontSize: 15, fontWeight: '600'},
  actions: {flexDirection: 'row', gap: 10, marginTop: 8},
  btnCancel: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnCancelText: {fontSize: 15, fontWeight: '600'},
  btnAdd: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnAddText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
