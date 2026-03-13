import React, {useState} from 'react';
import {
  View, TouchableOpacity, Modal,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Alert,
} from 'react-native';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../../theme/useTheme';
import {
  Room, ChoreFrequency, ChoreEffort,
  createRoom, createChore,
} from '../../../services/choreService';
import {useFamilyStore} from '../../../store/familyStore';
import {FamilyMember} from '../../../services/familyService';

interface Props {
  visible: boolean;
  onClose: () => void;
  rooms: Room[];
  members: FamilyMember[];
}

type AddMode = 'room' | 'chore';

const FREQUENCIES: ChoreFrequency[] = ['daily', 'weekly', 'monthly'];
const EFFORTS: ChoreEffort[] = ['easy', 'medium', 'hard'];
const EFFORT_LABELS = {easy: 'Easy (1pt)', medium: 'Medium (3pts)', hard: 'Hard (5pts)'};
const EFFORT_COLORS = {easy: '#34C759', medium: '#FF9500', hard: '#FF3B30'};

export default function AddChoreModal({visible, onClose, rooms, members}: Props) {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family} = useFamilyStore();

  const [mode, setMode] = useState<AddMode>('chore');
  const [saving, setSaving] = useState(false);

  // Room fields
  const [roomName, setRoomName] = useState('');

  // Chore fields
  const [choreName, setChoreName] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [frequency, setFrequency] = useState<ChoreFrequency>('weekly');
  const [effort, setEffort] = useState<ChoreEffort>('medium');
  const [assignedMember, setAssignedMember] = useState<FamilyMember | null>(null);
  const [note, setNote] = useState('');

  function reset() {
    setRoomName(''); setChoreName(''); setSelectedRoom(null);
    setFrequency('weekly'); setEffort('medium');
    setAssignedMember(null); setNote('');
  }

  async function handleSave() {
    if (!family) {return;}
    setSaving(true);
    try {
      if (mode === 'room') {
        if (!roomName.trim()) {return Alert.alert('Error', 'Please enter a room name.');}
        await createRoom(family.id, roomName);
      } else {
        if (!choreName.trim()) {return Alert.alert('Error', 'Please enter a chore name.');}
        if (!selectedRoom) {return Alert.alert('Error', 'Please select a room.');}
        await createChore(family.id, {
          name: choreName,
          roomId: selectedRoom.id,
          roomName: selectedRoom.name,
          assignedTo: assignedMember?.uid ?? null,
          assignedToName: assignedMember?.displayName ?? null,
          frequency,
          effort,
          note,
        });
      }
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = [styles.input, {borderColor: colors.border, backgroundColor: colors.background, color: colors.text}];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, {backgroundColor: colors.surface, paddingBottom: insets.bottom + 16}]}>
          <View style={[styles.handle, {backgroundColor: colors.border}]} />

          {/* Mode toggle */}
          <View style={[styles.modeToggle, {backgroundColor: colors.surfaceSecondary}]}>
            {(['chore', 'room'] as AddMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && {backgroundColor: colors.surface}]}
                onPress={() => setMode(m)}>
                <Text style={[styles.modeBtnText, {color: mode === m ? colors.primary : colors.textTertiary}]}>
                  {m === 'chore' ? '🧹 Add Chore' : '🏠 Add Room'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {mode === 'room' ? (
              <>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Room name</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Kitchen"
                  placeholderTextColor={colors.textTertiary}
                  value={roomName}
                  onChangeText={setRoomName}
                  autoFocus
                />
              </>
            ) : (
              <>
                <Text style={[styles.label, {color: colors.textSecondary}]}>Chore name</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Vacuum floors"
                  placeholderTextColor={colors.textTertiary}
                  value={choreName}
                  onChangeText={setChoreName}
                  autoFocus
                />

                <Text style={[styles.label, {color: colors.textSecondary}]}>Room</Text>
                <View style={styles.chipRow}>
                  {rooms.map(r => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.chip, {
                        backgroundColor: selectedRoom?.id === r.id ? colors.primary : colors.surfaceSecondary,
                      }]}
                      onPress={() => setSelectedRoom(r)}>
                      <Text style={[styles.chipText, {color: selectedRoom?.id === r.id ? '#fff' : colors.text}]}>
                        {r.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, {color: colors.textSecondary}]}>Frequency</Text>
                <View style={styles.chipRow}>
                  {FREQUENCIES.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.chip, {
                        backgroundColor: frequency === f ? colors.primary : colors.surfaceSecondary,
                      }]}
                      onPress={() => setFrequency(f)}>
                      <Text style={[styles.chipText, {color: frequency === f ? '#fff' : colors.text}]}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, {color: colors.textSecondary}]}>Effort</Text>
                <View style={styles.chipRow}>
                  {EFFORTS.map(e => (
                    <TouchableOpacity
                      key={e}
                      style={[styles.chip, {
                        backgroundColor: effort === e ? EFFORT_COLORS[e] : colors.surfaceSecondary,
                      }]}
                      onPress={() => setEffort(e)}>
                      <Text style={[styles.chipText, {color: effort === e ? '#fff' : colors.text}]}>
                        {EFFORT_LABELS[e]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, {color: colors.textSecondary}]}>Assign to (optional)</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, {backgroundColor: !assignedMember ? colors.primary : colors.surfaceSecondary}]}
                    onPress={() => setAssignedMember(null)}>
                    <Text style={[styles.chipText, {color: !assignedMember ? '#fff' : colors.text}]}>Anyone</Text>
                  </TouchableOpacity>
                  {members.map(m => (
                    <TouchableOpacity
                      key={m.uid}
                      style={[styles.chip, {
                        backgroundColor: assignedMember?.uid === m.uid ? colors.primary : colors.surfaceSecondary,
                      }]}
                      onPress={() => setAssignedMember(m)}>
                      <Text style={[styles.chipText, {color: assignedMember?.uid === m.uid ? '#fff' : colors.text}]}>
                        {m.displayName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, {color: colors.textSecondary}]}>Note (optional)</Text>
                <TextInput
                  style={[inputStyle, styles.noteInput]}
                  placeholder="Any special instructions..."
                  placeholderTextColor={colors.textTertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, {backgroundColor: colors.primary}, saving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={saving}>
              <Text style={styles.saveBtnText}>{mode === 'room' ? 'Add Room' : 'Add Chore'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
  backdrop: {flex: 1},
  sheet: {borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%'},
  handle: {width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20},
  modeToggle: {flexDirection: 'row', borderRadius: 10, padding: 4, marginBottom: 20},
  modeBtn: {flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center'},
  modeBtnText: {fontWeight: '600', fontSize: 14},
  label: {fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4},
  input: {borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, marginBottom: 12},
  noteInput: {height: 80, textAlignVertical: 'top'},
  chipRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12},
  chip: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20},
  chipText: {fontSize: 13, fontWeight: '600'},
  saveBtn: {borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8},
  saveBtnText: {color: '#fff', fontWeight: '700', fontSize: 16},
});
