import React, {useEffect, useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps, ScrollView} from 'react-native-actions-sheet';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import {useTheme} from '../../../theme/useTheme';
import {
  DocumentFolder,
  DocMember,
  FOLDER_COLORS,
  FolderVisibility,
  getFamilyMembers,
} from '../../../services/documentService';

const PRESET_EMOJIS = [
  '📁', '🔒', '🏠', '📚', '💼', '❤️', '🏥', '🚗',
  '💰', '✈️', '📸', '🎓', '⚖️', '🔧', '🎵', '🌿',
];

export default function AddFolderModal(props: SheetProps<'add-folder'>) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.documents.icon;

  const {familyId, uid, editingFolder, onSave} = props.payload!;

  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[5]);
  const [emoji, setEmoji] = useState('📁');
  const [visibility, setVisibility] = useState<FolderVisibility>('everyone');
  const [visibleTo, setVisibleTo] = useState<string[]>([]);
  const [members, setMembers] = useState<DocMember[]>([]);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingFolder;
  const isDefaultFolder = editingFolder?.isDefault ?? false;

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name);
      setColor(editingFolder.color);
      setEmoji(editingFolder.emoji);
      setVisibility(editingFolder.visibility);
      setVisibleTo(editingFolder.visibleTo ?? []);
    } else {
      setName('');
      setColor(FOLDER_COLORS[5]);
      setEmoji('📁');
      setVisibility('everyone');
      setVisibleTo([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (visibility === 'members') {
      getFamilyMembers(familyId).then(setMembers);
    }
  }, [visibility, familyId]);

  function toggleMember(memberUid: string) {
    setVisibleTo(prev =>
      prev.includes(memberUid)
        ? prev.filter(id => id !== memberUid)
        : [...prev, memberUid],
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        color,
        emoji,
        visibility,
        visibleTo: visibility === 'members' ? visibleTo : [],
      });
      SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  const canSave = !!name.trim() && (visibility !== 'members' || visibleTo.length > 0);

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
      }}>
      <Text style={[styles.title, {color: colors.text}]}>
        {isEditing ? 'Edit Folder' : 'New Folder'}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Emoji row */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>Icon</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.emojiRow}>
          {PRESET_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[
                styles.emojiBtn,
                {
                  backgroundColor: emoji === e ? color + '33' : colors.surfaceSecondary,
                  borderColor: emoji === e ? color : 'transparent',
                },
              ]}
              onPress={() => setEmoji(e)}>
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Name */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>Name</Text>
        <TextInput
          style={[styles.input, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
          value={name}
          onChangeText={setName}
          placeholder="Folder name"
          placeholderTextColor={colors.textTertiary}
          editable={!isDefaultFolder}
        />

        {/* Color picker */}
        <Text style={[styles.label, {color: colors.textSecondary}]}>Color</Text>
        <View style={styles.colorGrid}>
          {FOLDER_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                {backgroundColor: c},
                color === c && styles.colorSwatchSelected,
              ]}
              onPress={() => setColor(c)}>
              {color === c && (
                <Text style={styles.colorCheck}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Visibility — hidden for default Private folder */}
        {!(isDefaultFolder && editingFolder?.visibility === 'private') && (
          <>
            <Text style={[styles.label, {color: colors.textSecondary}]}>Visibility</Text>
            {(['everyone', 'private', 'members'] as FolderVisibility[]).map(v => {
              const labels: Record<FolderVisibility, {title: string; sub: string}> = {
                everyone: {title: 'Everyone', sub: 'All family members can see this folder'},
                private: {title: 'Only me', sub: 'Only you can see this folder'},
                members: {title: 'Specific members', sub: 'Choose who can see this folder'},
              };
              return (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.visibilityRow,
                    {
                      backgroundColor:
                        visibility === v ? color + '18' : colors.surfaceSecondary,
                      borderColor: visibility === v ? color : 'transparent',
                    },
                  ]}
                  onPress={() => {
                    setVisibility(v);
                    if (v === 'members') {
                      getFamilyMembers(familyId).then(setMembers);
                    }
                  }}>
                  <View style={styles.visibilityInfo}>
                    <Text style={[styles.visibilityTitle, {color: colors.text}]}>
                      {labels[v].title}
                    </Text>
                    <Text style={[styles.visibilitySub, {color: colors.textSecondary}]}>
                      {labels[v].sub}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radio,
                      {borderColor: visibility === v ? color : colors.border},
                    ]}>
                    {visibility === v && (
                      <View style={[styles.radioDot, {backgroundColor: color}]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Member picker */}
            {visibility === 'members' && (
              <View style={styles.memberPickerBox}>
                {members
                  .filter(m => m.uid !== uid)
                  .map(m => {
                    const selected = visibleTo.includes(m.uid);
                    return (
                      <TouchableOpacity
                        key={m.uid}
                        style={[
                          styles.memberRow,
                          {borderBottomColor: colors.border},
                        ]}
                        onPress={() => toggleMember(m.uid)}>
                        <View style={styles.memberInfo}>
                          <Text style={[styles.memberName, {color: colors.text}]}>
                            {m.displayName}
                          </Text>
                          <Text style={[styles.memberRole, {color: colors.textTertiary}]}>
                            {m.role}
                          </Text>
                        </View>
                        <Switch
                          value={selected}
                          onValueChange={() => toggleMember(m.uid)}
                          trackColor={{false: colors.border, true: color}}
                          thumbColor="#fff"
                        />
                      </TouchableOpacity>
                    );
                  })}
                {visibleTo.length === 0 && (
                  <Text style={[styles.memberHint, {color: colors.textTertiary}]}>
                    Select at least one member
                  </Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.cancelBtn, {borderColor: colors.border}]}
          onPress={() => SheetManager.hide(props.sheetId)}>
          <Text style={[styles.cancelText, {color: colors.textSecondary}]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, {backgroundColor: color, opacity: canSave ? 1 : 0.4}]}
          onPress={handleSave}
          disabled={!canSave || saving}>
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>{isEditing ? 'Save' : 'Create'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '700', marginBottom: 20},
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 16,
  },

  emojiRow: {gap: 8, paddingRight: 8, marginBottom: 4},
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emojiText: {fontSize: 22},

  input: {borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 4},

  colorGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4},
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    transform: [{scale: 1.2}],
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 4,
  },
  colorCheck: {color: '#fff', fontSize: 16, fontWeight: '700'},

  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  visibilityInfo: {flex: 1},
  visibilityTitle: {fontSize: 15, fontWeight: '600'},
  visibilitySub: {fontSize: 12, marginTop: 2},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {width: 10, height: 10, borderRadius: 5},

  memberPickerBox: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberInfo: {flex: 1},
  memberName: {fontSize: 15, fontWeight: '600'},
  memberRole: {fontSize: 12, marginTop: 1, textTransform: 'capitalize'},
  memberHint: {fontSize: 13, textAlign: 'center', paddingVertical: 12},

  buttons: {flexDirection: 'row', gap: 12, marginTop: 20},
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {fontSize: 15, fontWeight: '600'},
  saveBtn: {flex: 2, borderRadius: 12, paddingVertical: 14, alignItems: 'center'},
  saveText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
