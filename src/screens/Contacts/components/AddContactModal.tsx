import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useTheme} from '../../../theme/useTheme';

interface Props {
  visible: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onAdd: (params: {
    name: string;
    phone: string;
    relation: string;
    type: 'shared' | 'personal';
    locked: boolean;
  }) => Promise<void>;
}

export default function AddContactModal({
  visible,
  isAdmin,
  onClose,
  onAdd,
}: Props) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.contacts.icon;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('');
  const [type, setType] = useState<'shared' | 'personal'>('personal');
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setPhone('');
    setRelation('');
    setType('personal');
    setLocked(false);
  }

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onAdd({
        name: name.trim(),
        phone: phone.trim(),
        relation: relation.trim(),
        type,
        locked: type === 'shared' ? locked : false,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    reset();
    onClose();
  }

  const canSave = !!name.trim() && !!phone.trim() && !saving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, {backgroundColor: colors.surface}]}>
          <View style={[styles.handle, {backgroundColor: colors.border}]} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, {color: colors.text}]}>
              New Emergency Contact
            </Text>

            {/* Type selector — admins only */}
            {isAdmin && (
              <>
                <Text style={[styles.label, {color: colors.textSecondary}]}>
                  Type
                </Text>
                <View
                  style={[
                    styles.segmentRow,
                    {backgroundColor: colors.background, borderColor: colors.border},
                  ]}>
                  {(['shared', 'personal'] as const).map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.segment,
                        type === t && {backgroundColor: ACCENT},
                      ]}
                      onPress={() => {
                        setType(t);
                        if (t === 'personal') {
                          setLocked(false);
                        }
                      }}>
                      <Text
                        style={[
                          styles.segmentText,
                          {color: type === t ? '#fff' : colors.textSecondary},
                        ]}>
                        {t === 'shared' ? '👨‍👩‍👧 Family' : '👤 Personal'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Name */}
            <Text style={[styles.label, {color: colors.textSecondary}]}>
              Name *
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
              placeholder="Contact name"
              placeholderTextColor={colors.textTertiary}
              value={name}
              onChangeText={setName}
            />

            {/* Phone */}
            <Text style={[styles.label, {color: colors.textSecondary}]}>
              Phone *
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
              placeholder="+353 87 123 4567"
              placeholderTextColor={colors.textTertiary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            {/* Relation */}
            <Text style={[styles.label, {color: colors.textSecondary}]}>
              Label (optional)
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
              placeholder="e.g. Doctor, School, Friend"
              placeholderTextColor={colors.textTertiary}
              value={relation}
              onChangeText={setRelation}
            />

            {/* Locked toggle — shared contacts, admins only */}
            {isAdmin && type === 'shared' && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, {color: colors.text}]}>
                    🔒 Pin contact
                  </Text>
                  <Text
                    style={[
                      styles.toggleDesc,
                      {color: colors.textSecondary},
                    ]}>
                    Pinned contacts can't be deleted
                  </Text>
                </View>
                <Switch
                  value={locked}
                  onValueChange={setLocked}
                  trackColor={{false: colors.border, true: ACCENT}}
                  thumbColor="#fff"
                />
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btnCancel, {borderColor: colors.border}]}
                onPress={handleClose}>
                <Text
                  style={[
                    styles.btnCancelText,
                    {color: colors.textSecondary},
                  ]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnAdd,
                  {backgroundColor: ACCENT, opacity: canSave ? 1 : 0.5},
                ]}
                onPress={handleAdd}
                disabled={!canSave}>
                <Text style={styles.btnAddText}>
                  {saving ? 'Saving...' : 'Add Contact'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {fontSize: 18, fontWeight: '700', marginBottom: 20},
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  segmentRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
  },
  segment: {flex: 1, paddingVertical: 10, alignItems: 'center'},
  segmentText: {fontSize: 14, fontWeight: '600'},
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 4,
  },
  toggleInfo: {flex: 1, marginRight: 12},
  toggleTitle: {fontSize: 15, fontWeight: '600'},
  toggleDesc: {fontSize: 12, marginTop: 2},
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
