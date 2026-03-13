import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  ShoppingItem,
  subscribeToShoppingList,
  addShoppingItem,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
} from '../../services/shoppingService';

export default function ShoppingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToShoppingList(family.id, data => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [family]);

  const unchecked = items.filter(i => !i.checked);
  const checked = items.filter(i => i.checked);
  const allItems = [
    ...unchecked,
    ...(checked.length > 0 ? [{ id: '__divider__' } as any] : []),
    ...checked,
  ];

  async function handleAdd() {
    if (!itemName.trim() || !family) {
      return;
    }
    setAdding(true);
    try {
      await addShoppingItem(
        family.id,
        itemName,
        itemQty,
        auth().currentUser?.uid ?? '',
        profile?.displayName ?? 'Someone',
      );
      setItemName('');
      setItemQty('');
      setModalVisible(false);
    } finally {
      setAdding(false);
    }
  }

  async function handleClearChecked() {
    if (!family || checked.length === 0) {
      return;
    }
    Alert.alert(
      'Clear Checked',
      `Remove ${checked.length} checked item${
        checked.length !== 1 ? 's' : ''
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearCheckedItems(family.id),
        },
      ],
    );
  }

  function renderItem({ item }: { item: ShoppingItem & { id: string } }) {
    if (item.id === '__divider__') {
      return (
        <View style={styles.dividerRow}>
          <View
            style={[styles.dividerLine, { backgroundColor: colors.border }]}
          />
          <Text style={[styles.dividerLabel, { color: colors.textTertiary }]}>
            Checked
          </Text>
          <TouchableOpacity onPress={handleClearChecked}>
            <Text style={[styles.clearBtn, { color: colors.danger }]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
            onPress={() => family && deleteShoppingItem(family.id, item.id)}
          >
            <Text style={styles.deleteActionText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[styles.itemRow, { backgroundColor: colors.surface }]}
          onPress={() =>
            family && toggleShoppingItem(family.id, item.id, item.checked)
          }
          activeOpacity={0.7}
        >
          {/* Checkbox */}
          <View
            style={[
              styles.checkbox,
              { borderColor: item.checked ? colors.success : colors.border },
              item.checked && { backgroundColor: colors.success },
            ]}
          >
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>

          {/* Text */}
          <View style={styles.itemText}>
            <Text
              style={[
                styles.itemName,
                { color: colors.text },
                item.checked && {
                  textDecorationLine: 'line-through',
                  color: colors.textTertiary,
                },
              ]}
            >
              {item.name}
            </Text>
            <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>
              {item.quantity ? `${item.quantity} · ` : ''}
              {item.addedByName}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator style={styles.loader} color={colors.primary} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Your list is empty
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Tap + to add your first item
          </Text>
        </View>
      ) : (
        <FlatList
          data={allItems}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ItemSeparatorComponent={() => (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: colors.primary, bottom: insets.bottom + 30 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add item modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View
              style={[styles.modalHandle, { backgroundColor: colors.border }]}
            />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Add Item
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="Item name"
              placeholderTextColor={colors.textTertiary}
              value={itemName}
              onChangeText={setItemName}
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                },
              ]}
              placeholder="Quantity (optional)"
              placeholderTextColor={colors.textTertiary}
              value={itemQty}
              onChangeText={setItemQty}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />

            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: colors.primary },
                !itemName.trim() && { opacity: 0.5 },
              ]}
              onPress={handleAdd}
              disabled={!itemName.trim() || adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Add to List</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },
  list: { paddingTop: 8 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 15 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemText: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  itemMeta: { fontSize: 12, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerLabel: { fontSize: 12, fontWeight: '600' },
  clearBtn: { fontSize: 12, fontWeight: '600' },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  deleteActionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 36, fontWeight: '300' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  addBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
