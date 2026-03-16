import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput as RNTextInput,
  ScrollView,
} from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import Text from '../components/Text';
import { useTheme } from '../theme/useTheme';
import {
  createShoppingList,
  updateShoppingListMeta,
} from '../services/shoppingService';

export const LIST_EMOJIS = [
  '🛒', '🍕', '🥦', '🏠', '🎁', '🎉', '🧴', '💊',
  '🐾', '🍷', '🏋️', '📦', '👶', '🌿', '🛋️', '🍔',
  '🧁', '🍺', '🐶', '🎮', '📚', '🌸', '🔧', '🧺',
];

export const LIST_COLORS = [
  '#EF4444', '#F97316', '#EAB308', '#22C55E',
  '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899',
];

function randomColor() {
  return LIST_COLORS[Math.floor(Math.random() * LIST_COLORS.length)];
}

export default function EditShoppingListSheet(props: SheetProps<'edit-shopping-list'>) {
  const { colors } = useTheme();
  const { familyId, uid, list, onDelete } = props.payload!;
  const isCreate = !list;

  const [name, setName] = useState(list?.name ?? '');
  const [emoji, setEmoji] = useState(list?.emoji ?? '🛒');
  const [color, setColor] = useState(() => list?.color ?? randomColor());
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) { return; }
    setSaving(true);
    try {
      if (isCreate) {
        await createShoppingList(familyId, name.trim(), uid!, emoji, color);
      } else {
        await updateShoppingListMeta(familyId, list!.id, name.trim(), emoji, color);
      }
      await SheetManager.hide(props.sheetId);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    SheetManager.hide(props.sheetId).then(() => onDelete?.());
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled={!saving}
      useBottomSafeAreaPadding
      containerStyle={{ backgroundColor: colors.surface }}
    >
      <View style={styles.content}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.text }]}>
          {isCreate ? 'New List' : 'Edit List'}
        </Text>

        {/* Live preview */}
        <View style={[styles.preview, { backgroundColor: color + '22', borderColor: color + '44' }]}>
          <Text style={styles.previewEmoji}>{emoji}</Text>
          <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
            {name.trim() || 'List name'}
          </Text>
        </View>

        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>NAME</Text>
        <View style={[styles.inputWrap, { backgroundColor: colors.background }]}>
          <RNTextInput
            style={[styles.input, { color: colors.text }]}
            value={name}
            onChangeText={setName}
            placeholder="List name…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            autoFocus={isCreate}
          />
        </View>

        {/* Emoji */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>ICON</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.emojiRow}
          contentContainerStyle={styles.emojiRowContent}
        >
          {LIST_EMOJIS.map(e => (
            <TouchableOpacity
              key={e}
              style={[
                styles.emojiBtn,
                { backgroundColor: colors.background },
                e === emoji && { backgroundColor: color + '30', borderColor: color, borderWidth: 2 },
              ]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiItem}>{e}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Colour */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>COLOUR</Text>
        <View style={styles.colorRow}>
          {LIST_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }]}
              onPress={() => setColor(c)}
            >
              {c === color && <Text style={styles.colorCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            { backgroundColor: color, opacity: saving || !name.trim() ? 0.5 : 1 },
          ]}
          onPress={handleSave}
          disabled={saving || !name.trim()}
        >
          <Text style={styles.saveBtnText}>
            {saving ? (isCreate ? 'Creating…' : 'Saving…') : isCreate ? 'Create List' : 'Save'}
          </Text>
        </TouchableOpacity>

        {/* Delete — edit mode only */}
        {!isCreate && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
            <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete List</Text>
          </TouchableOpacity>
        )}
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 8 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 16 },

  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewEmoji: { fontSize: 28 },
  previewName: { fontSize: 16, fontWeight: '700', flex: 1 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 8,
  },

  inputWrap: {
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  input: { fontSize: 16, paddingVertical: 12 },

  emojiRow: { marginBottom: 20 },
  emojiRowContent: { paddingHorizontal: 20, gap: 8 },
  emojiBtn: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiItem: { fontSize: 24 },

  colorRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  colorSwatch: {
    flex: 1, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  colorCheck: { color: '#fff', fontSize: 16, fontWeight: '700' },

  saveBtn: {
    marginHorizontal: 20,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  deleteBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '600' },
});
