import React, {useEffect, useState} from 'react';
import {View, TouchableOpacity, StyleSheet} from 'react-native';
import Text from '../../components/Text';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import {useTheme} from '../../theme/useTheme';
import {useFamilyStore} from '../../store/familyStore';
import {
  BudgetCategory,
  Transaction,
  subscribeToCategories,
  subscribeToTransactions,
  addCategory,
  deleteCategory,
  updateCategoryLimit,
  addTransaction,
  deleteTransaction,
} from '../../services/budgetService';
import SummaryTab from './tabs/SummaryTab';
import TransactionsTab from './tabs/TransactionsTab';
import CategoriesTab from './tabs/CategoriesTab';
import AddTransactionModal from './components/AddTransactionModal';
import AddCategoryModal from './components/AddCategoryModal';

type Tab = 'summary' | 'transactions' | 'categories';

const TABS: {key: Tab; label: string; emoji: string}[] = [
  {key: 'summary', label: 'Summary', emoji: '📊'},
  {key: 'transactions', label: 'Expenses', emoji: '🧾'},
  {key: 'categories', label: 'Categories', emoji: '📂'},
];

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', {month: 'long', year: 'numeric'});
}

function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function BudgetScreen() {
  const {colors} = useTheme();
  const insets = useSafeAreaInsets();
  const {family, profile} = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;
  const ACCENT = colors.tiles.budget.icon;

  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);

  useEffect(() => {
    if (!family) {return;}
    const unsub = subscribeToCategories(family.id, setCategories);
    return unsub;
  }, [family]);

  useEffect(() => {
    if (!family) {return;}
    const unsub = subscribeToTransactions(family.id, month, setTransactions);
    return unsub;
  }, [family, month]);

  const isCurrentMonth = month === currentMonth();

  async function handleAddTransaction(txn: {
    categoryId: string;
    categoryName: string;
    categoryEmoji: string;
    amount: number;
    note: string;
    date: number;
    month: string;
  }) {
    if (!family) {return;}
    await addTransaction(family.id, {
      ...txn,
      addedBy: uid,
      addedByName: profile?.displayName ?? 'Unknown',
    });
  }

  async function handleAddCategory(cat: {name: string; emoji: string; limit: number}) {
    if (!family) {return;}
    await addCategory(family.id, {...cat, createdBy: uid});
  }

  async function handleDeleteTransaction(txn: Transaction) {
    if (!family) {return;}
    await deleteTransaction(family.id, txn.id);
  }

  async function handleDeleteCategory(cat: BudgetCategory) {
    if (!family) {return;}
    await deleteCategory(family.id, cat.id);
  }

  async function handleUpdateLimit(cat: BudgetCategory, limit: number) {
    if (!family) {return;}
    await updateCategoryLimit(family.id, cat.id, limit);
  }

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      {/* Month picker */}
      <View style={[styles.monthBar, {backgroundColor: colors.surface}]}>
        <TouchableOpacity style={styles.monthArrow} onPress={() => setMonth(m => addMonths(m, -1))}>
          <Text style={[styles.arrow, {color: ACCENT}]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, {color: colors.text}]}>{monthLabel(month)}</Text>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setMonth(m => addMonths(m, 1))}
          disabled={isCurrentMonth}>
          <Text style={[styles.arrow, {color: isCurrentMonth ? colors.textTertiary : ACCENT}]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, {backgroundColor: colors.surface}]}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              activeTab === tab.key && {
                borderBottomColor: ACCENT,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setActiveTab(tab.key)}>
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                {color: activeTab === tab.key ? ACCENT : colors.textTertiary},
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'summary' && (
          <SummaryTab categories={categories} transactions={transactions} month={month} />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            uid={uid}
            isAdmin={isAdmin}
            onDelete={handleDeleteTransaction}
            onAdd={() => setShowAddTxn(true)}
          />
        )}
        {activeTab === 'categories' && (
          <CategoriesTab
            categories={categories}
            transactions={transactions}
            isAdmin={isAdmin}
            onDelete={handleDeleteCategory}
            onUpdateLimit={handleUpdateLimit}
            onAdd={() => setShowAddCat(true)}
          />
        )}
      </View>

      <AddTransactionModal
        visible={showAddTxn}
        categories={categories}
        onClose={() => setShowAddTxn(false)}
        onAdd={handleAddTransaction}
      />

      <AddCategoryModal
        visible={showAddCat}
        onClose={() => setShowAddCat(false)}
        onAdd={handleAddCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  monthArrow: {padding: 8},
  arrow: {fontSize: 28, fontWeight: '300', lineHeight: 32},
  monthLabel: {fontSize: 16, fontWeight: '700'},

  tabBar: {
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabEmoji: {fontSize: 18},
  tabLabel: {fontSize: 12, fontWeight: '600'},

  content: {flex: 1},
});
