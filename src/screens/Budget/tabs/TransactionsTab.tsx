import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Text from '../../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../../../theme/useTheme';
import { Transaction } from '../../../services/budgetService';

interface Props {
  transactions: Transaction[];
  uid: string;
  isAdmin: boolean;
  onDelete: (txn: Transaction) => void;
  onAdd: () => void;
  formatAmount: (cents: number) => string;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function TransactionsTab({
  transactions,
  uid,
  isAdmin,
  onDelete,
  onAdd,
  formatAmount,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = colors.tiles.budget.icon;

  function confirmDelete(txn: Transaction) {
    Alert.alert(
      'Delete Transaction',
      `Remove "${txn.note || txn.categoryName}" — ${formatAmount(txn.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(txn) },
      ],
    );
  }

  function renderItem({ item }: { item: Transaction }) {
    const canDelete = isAdmin || item.addedBy === uid;

    const renderRight = () => {
      if (!canDelete) {
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
        <View style={[styles.txnRow, { backgroundColor: colors.surface }]}>
          <View style={[styles.catBadge, { backgroundColor: ACCENT + '22' }]}>
            <Text style={styles.catEmoji}>{item.categoryEmoji}</Text>
          </View>
          <View style={styles.txnInfo}>
            <Text
              style={[styles.txnNote, { color: colors.text }]}
              numberOfLines={1}
            >
              {item.note || item.categoryName}
            </Text>
            <Text style={[styles.txnMeta, { color: colors.textTertiary }]}>
              {item.categoryName} · {item.addedByName} · {formatDate(item.date)}
            </Text>
          </View>
          <Text style={[styles.txnAmount, { color: colors.text }]}>
            {formatAmount(item.amount)}
          </Text>
        </View>
      </Swipeable>
    );
  }

  return (
    <>
      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyEmoji}>🧾</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No transactions
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap + to log your first expense this month.
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
          { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
        ]}
        onPress={onAdd}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 12 },

  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  catBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catEmoji: { fontSize: 20 },
  txnInfo: { flex: 1 },
  txnNote: { fontSize: 15, fontWeight: '600' },
  txnMeta: { fontSize: 12, marginTop: 2 },
  txnAmount: { fontSize: 16, fontWeight: '700', marginLeft: 8 },

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
});
