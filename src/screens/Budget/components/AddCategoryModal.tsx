import React, {useState} from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps} from 'react-native-actions-sheet';
import Text from '../../../components/Text';
import TextInput from '../../../components/TextInput';
import {useTheme} from '../../../theme/useTheme';

const PRESET_EMOJIS = ['🛒', '🍔', '🏠', '🚗', '💊', '👕', '🎬', '✈️', '📚', '🐾', '🎁', '🔧'];

export default function AddCategoryModal(props: SheetProps<'add-category'>) {
  const {colors} = useTheme();
  const ACCENT = colors.tiles.budget.icon;

  const {currencyCode, onAdd} = props.payload!;

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [limitStr, setLimitStr] = useState('');

  function reset() {
    setName('');
    setEmoji('');
    setLimitStr('');
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) {return;}
    const limitDollars = parseFloat(limitStr.replace(/[^0-9.]/g, '')) || 0;
    onAdd({
      name: trimmed,
      emoji: emoji.trim() || '📦',
      limit: Math.round(limitDollars * 100),
    });
    reset();
    SheetManager.hide(props.sheetId);
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
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
      }}>
      <Text style={[styles.title, {color: colors.text}]}>New Category</Text>

      {/* Emoji presets */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.presetRow}
        contentContainerStyle={styles.presetContent}>
        {PRESET_EMOJIS.map(e => (
          <TouchableOpacity
            key={e}
            style={[
              styles.presetBtn,
              {
                backgroundColor:
                  emoji === e ? ACCENT + '33' : colors.surfaceSecondary,
                borderColor: emoji === e ? ACCENT : 'transparent',
              },
            ]}
            onPress={() => setEmoji(e)}>
            <Text style={styles.presetEmoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Custom emoji */}
      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Or type a custom emoji
      </Text>
      <TextInput
        style={[styles.input, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
        value={emoji}
        onChangeText={setEmoji}
        placeholder="e.g. 🎮"
        placeholderTextColor={colors.textTertiary}
        maxLength={4}
      />

      <Text style={[styles.label, {color: colors.textSecondary}]}>Category name *</Text>
      <TextInput
        style={[styles.input, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Groceries"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.label, {color: colors.textSecondary}]}>
        Monthly limit in {currencyCode} (leave blank for none)
      </Text>
      <TextInput
        style={[styles.input, {backgroundColor: colors.surfaceSecondary, color: colors.text}]}
        value={limitStr}
        onChangeText={setLimitStr}
        placeholder="e.g. 500"
        placeholderTextColor={colors.textTertiary}
        keyboardType="decimal-pad"
      />

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.cancelBtn, {borderColor: colors.border}]}
          onPress={handleClose}>
          <Text style={[styles.cancelText, {color: colors.textSecondary}]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, {backgroundColor: ACCENT, opacity: name.trim() ? 1 : 0.4}]}
          onPress={handleAdd}
          disabled={!name.trim()}>
          <Text style={styles.addText}>Add Category</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '700', marginBottom: 16},
  presetRow: {marginBottom: 12},
  presetContent: {gap: 8, paddingRight: 8},
  presetBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  presetEmoji: {fontSize: 22},
  label: {fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6},
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  buttons: {flexDirection: 'row', gap: 12, marginTop: 4},
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {fontSize: 15, fontWeight: '600'},
  addBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addText: {color: '#fff', fontSize: 15, fontWeight: '700'},
});
