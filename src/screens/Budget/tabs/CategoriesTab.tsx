import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme/useTheme';
import { BudgetCategory, Transaction } from '../../../services/budgetService';

interface Props {
  categories: BudgetCategory[];
  transactions: Transaction[];
  isAdmin: boolean;
  onDelete: (cat: BudgetCategory) => void;
  onUpdateLimit: (cat: BudgetCategory, newLimit: number) => void;
  onAdd: () => void;
}

function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

export default function CategoriesTab({
  categories,
  transactions = [],
  isAdmin,
  onDelete,
  onUpdateLimit,
  onAdd,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = colors.tiles.budget.icon;

  const [editingCat, setEditingCat] = useState<BudgetCategory | null>(null);
  const [limitStr, setLimitStr] = useState('');

  // Spending per category this month
  const spentByCat: Record<string, number> = {};
  for (const t of transactions) {
    spentByCat[t.categoryId] = (spentByCat[t.categoryId] ?? 0) + t.amount;
  }

  function confirmDelete(cat: BudgetCategory) {
    Alert.alert(
      'Delete Category',
      `Remove "${cat.name}"? Existing transactions won't be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(cat) },
      ],
    );
  }

  function openEditLimit(cat: BudgetCategory) {
    setEditingCat(cat);
    setLimitStr(cat.limit > 0 ? (cat.limit / 100).toFixed(2) : '');
  }

  function saveLimit() {
    if (!editingCat) {
      return;
    }
    const dollars = parseFloat(limitStr.replace(/[^0-9.]/g, '')) || 0;
    onUpdateLimit(editingCat, Math.round(dollars * 100));
    setEditingCat(null);
    setLimitStr('');
  }

  function renderItem({ item }: { item: BudgetCategory }) {
    const spent = spentByCat[item.id] ?? 0;
    const over = item.limit > 0 && spent > item.limit;
    const pct = item.limit > 0 ? Math.min(spent / item.limit, 1) : 0;

    const renderRight = () => {
      if (!isAdmin) {
        return null;
      }
      return (
        <TouchableOpacity
          style={[styles.deleteAction, { backgroundColor: colors.danger }]}
          onPress={() => confirmDelete(item)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      );
    };

    return (
      <Swipeable renderRightActions={renderRight}>
        <View style={[styles.catCard, { backgroundColor: colors.surface }]}>
          <View style={styles.catRow}>
            <View style={[styles.catIcon, { backgroundColor: ACCENT + '22' }]}>
              <Text style={styles.catEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.catInfo}>
              <Text style={[styles.catName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text
                style={[
                  styles.catSpent,
                  { color: over ? colors.danger : colors.textSecondary },
                ]}
              >
                {cents(spent)} spent
                {item.limit > 0 ? ` · limit ${cents(item.limit)}` : ''}
              </Text>
            </View>
            {isAdmin && (
              <TouchableOpacity
                style={[styles.editBtn, { borderColor: colors.border }]}
                onPress={() => openEditLimit(item)}
              >
                <Text
                  style={[styles.editBtnText, { color: colors.textSecondary }]}
                >
                  ✏️
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {item.limit > 0 && (
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${pct * 100}%`,
                    backgroundColor: over ? colors.danger : ACCENT,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </Swipeable>
    );
  }

  return (
    <>
      <FlatList
        data={categories}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyEmoji}>📂</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No categories
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap + to create your first budget category.
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: ACCENT, bottom: insets.bottom + 90 },
        ]}
        onPress={onAdd}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Edit limit modal */}
      <Modal
        visible={!!editingCat}
        animationType="fade"
        transparent
        onRequestClose={() => setEditingCat(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Set Limit for {editingCat?.name}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Enter 0 or leave blank for no limit
            </Text>
            <TextInput
              style={[
                styles.limitInput,
                {
                  backgroundColor: colors.surfaceSecondary,
                  color: colors.text,
                },
              ]}
              value={limitStr}
              onChangeText={setLimitStr}
              placeholder="Monthly limit ($)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditingCat(null)}
              >
                <Text
                  style={[styles.cancelText, { color: colors.textSecondary }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: ACCENT }]}
                onPress={saveLimit}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 12 },

  catCard: { borderRadius: 12, padding: 14, marginBottom: 8 },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catEmoji: { fontSize: 22 },
  catInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: '600' },
  catSpent: { fontSize: 12, marginTop: 2 },
  editBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnText: { fontSize: 14 },

  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
    marginTop: 10,
  },
  barFill: { height: '100%', borderRadius: 3 },

  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
  },
  deleteText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center' },

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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: { borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 13, marginBottom: 16 },
  limitInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 2,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
