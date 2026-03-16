import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput as RNTextInput,
  Keyboard,
  Platform,
} from 'react-native';
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  ShoppingCategory,
  subscribeToCategories,
  addCategory,
  reorderCategories,
  deleteCategory,
} from '../../services/shoppingService';

const EMOJI_OPTIONS = [
  '🛒','📦','🍎','🧃','🧁','🥩','🥛','🍞','🥦','🥫','🍝','🧊',
  '🧂','🍫','🧴','💄','🐾','🌱','🏠','🎉','⚡','🌶️','🧇','🫙',
];

export default function ManageCategoriesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family } = useFamilyStore();
  const ACCENT = colors.tiles.shopping.icon;

  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📦');
  const [saving, setSaving] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => setKeyboardHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  useEffect(() => {
    if (!family) { return; }
    return subscribeToCategories(family.id, data => {
      setCategories(data);
      setLoading(false);
    });
  }, [family]);

  async function handleAdd() {
    if (!newName.trim() || !family) { return; }
    setSaving(true);
    try {
      await addCategory(family.id, newName, newEmoji, categories.length);
      setNewName('');
      setNewEmoji('📦');
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDragEnd({ data }: { data: ShoppingCategory[] }) {
    if (!family) { return; }
    setCategories(data);
    await reorderCategories(family.id, data.map(c => c.id));
  }

  function confirmDelete(cat: ShoppingCategory) {
    if (!family) { return; }
    Alert.alert(
      'Delete Category',
      `Remove "${cat.name}"? Items in this category will be moved to Other.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(family.id, cat.id),
        },
      ],
    );
  }

  function renderItem({ item, drag, isActive }: RenderItemParams<ShoppingCategory>) {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[
            styles.row,
            { backgroundColor: isActive ? colors.surfaceSecondary : colors.surface },
          ]}
          onLongPress={drag}
          delayLongPress={150}
          activeOpacity={0.9}
        >
          <Text style={styles.rowEmoji}>{item.emoji}</Text>
          <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
          {item.isDefault && (
            <Text style={[styles.defaultBadge, { color: colors.textTertiary }]}>Default</Text>
          )}
          {!item.isDefault && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
              <LucideIcon name="trash-2" size={16} color={colors.danger} />
            </TouchableOpacity>
          )}
          <LucideIcon
            name="grip-vertical"
            size={18}
            color={colors.border}
            style={styles.dragHandle}
          />
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : (
        <DraggableFlatList
          data={categories}
          keyExtractor={c => c.id}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
          contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          ListHeaderComponent={
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Long-press and drag to reorder. Custom categories can be deleted.
            </Text>
          }
        />
      )}

      {/* Add category panel */}
      {showAdd && (
        <View style={[styles.addPanel, {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          bottom: keyboardHeight,
          paddingBottom: keyboardHeight > 0 ? 16 : insets.bottom + 16,
        }]}>
          <Text style={[styles.addTitle, { color: colors.text }]}>New Category</Text>

          <FlatList
            data={EMOJI_OPTIONS}
            keyExtractor={e => e}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.emojiRow}
            renderItem={({ item: emoji }) => (
              <TouchableOpacity
                style={[
                  styles.emojiBtn,
                  { borderColor: emoji === newEmoji ? ACCENT : colors.border },
                  emoji === newEmoji && { backgroundColor: ACCENT + '22' },
                ]}
                onPress={() => setNewEmoji(emoji)}
              >
                <Text style={styles.emojiChar}>{emoji}</Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.addRow}>
            <RNTextInput
              style={[styles.addInput, { backgroundColor: colors.background, color: colors.text }]}
              value={newName}
              onChangeText={setNewName}
              placeholder="Category name…"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[styles.addConfirm, { backgroundColor: newName.trim() ? ACCENT : colors.border }]}
              onPress={handleAdd}
              disabled={!newName.trim() || saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <LucideIcon name="check" size={20} color="#fff" />
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addConfirm, { backgroundColor: colors.background }]}
              onPress={() => { setShowAdd(false); setNewName(''); setNewEmoji('📦'); }}
            >
              <LucideIcon name="x" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FAB */}
      {!showAdd && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: ACCENT, bottom: insets.bottom + 30 }]}
          onPress={() => setShowAdd(true)}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },
  hint: { fontSize: 13, padding: 16, paddingBottom: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dragHandle: { marginLeft: -4 },
  rowEmoji: { fontSize: 22, width: 32 },
  rowName: { flex: 1, fontSize: 16, fontWeight: '500' },
  defaultBadge: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { padding: 6 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 60 },

  addPanel: {
    position: 'absolute',
    left: 0, right: 0,
    padding: 16, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  emojiRow: { gap: 8, paddingBottom: 12 },
  emojiBtn: {
    width: 40, height: 40, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
  },
  emojiChar: { fontSize: 22 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addInput: {
    flex: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  addConfirm: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  fab: {
    position: 'absolute', right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
});
