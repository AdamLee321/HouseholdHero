import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  BudgetCategory,
  Transaction,
  subscribeToCategories,
  subscribeToTransactions,
  subscribeToBudgetCurrency,
  addCategory,
  deleteCategory,
  updateCategoryLimit,
  addTransaction,
  deleteTransaction,
  updateBudgetCurrency,
} from '../../services/budgetService';
import SummaryTab from './tabs/SummaryTab';
import TransactionsTab from './tabs/TransactionsTab';
import CategoriesTab from './tabs/CategoriesTab';
import AddTransactionModal from './components/AddTransactionModal';
import AddCategoryModal from './components/AddCategoryModal';

type Tab = 'summary' | 'transactions' | 'categories';

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'summary', label: 'Summary', emoji: '📊' },
  { key: 'transactions', label: 'Expenses', emoji: '🧾' },
  { key: 'categories', label: 'Categories', emoji: '📂' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'KRW', name: 'Korean Won' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'NZD', name: 'New Zealand Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'PLN', name: 'Polish Zloty' },
  { code: 'CZK', name: 'Czech Koruna' },
  { code: 'HUF', name: 'Hungarian Forint' },
  { code: 'RON', name: 'Romanian Leu' },
];

const REGION_CURRENCY: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  BE: 'EUR',
  AT: 'EUR',
  PT: 'EUR',
  IE: 'EUR',
  FI: 'EUR',
  GR: 'EUR',
  SK: 'EUR',
  SI: 'EUR',
  EE: 'EUR',
  LV: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  MT: 'EUR',
  CY: 'EUR',
  JP: 'JPY',
  CN: 'CNY',
  KR: 'KRW',
  IN: 'INR',
  SG: 'SGD',
  HK: 'HKD',
  NZ: 'NZD',
  CH: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  MX: 'MXN',
  BR: 'BRL',
  ZA: 'ZAR',
  AE: 'AED',
  SA: 'SAR',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  TR: 'TRY',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
};

function detectLocaleCurrency(): string {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-')[1] ?? '';
    return REGION_CURRENCY[region.toUpperCase()] ?? 'USD';
  } catch {
    return 'USD';
  }
}

export function formatAmount(cents: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currencyCode} ${(cents / 100).toFixed(2)}`;
  }
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
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
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy || profile?.role === 'admin';
  const ACCENT = colors.tiles.budget.icon;

  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencyCode, setCurrencyCode] = useState<string>(
    family?.currencyCode ?? detectLocaleCurrency(),
  );

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToCategories(family.id, setCategories);
    return unsub;
  }, [family]);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToTransactions(family.id, month, setTransactions);
    return unsub;
  }, [family, month]);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToBudgetCurrency(family.id, code => {
      setCurrencyCode(code ?? detectLocaleCurrency());
    });
    return unsub;
  }, [family]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: isAdmin
        ? () => (
            <TouchableOpacity
              onPress={() => setShowCurrencyPicker(true)}
              style={styles.headerCurrencyBtn}
            >
              <Text style={[styles.headerCurrencyText, { color: ACCENT }]}>
                {currencyCode}
              </Text>
            </TouchableOpacity>
          )
        : undefined,
    });
  }, [navigation, isAdmin, currencyCode, ACCENT]);

  const isCurrentMonth = month === currentMonth();
  const fmt = (cents: number) => formatAmount(cents, currencyCode);

  async function handleAddTransaction(txn: {
    categoryId: string;
    categoryName: string;
    categoryEmoji: string;
    amount: number;
    note: string;
    date: number;
    month: string;
  }) {
    if (!family) {
      return;
    }
    await addTransaction(family.id, {
      ...txn,
      addedBy: uid,
      addedByName: profile?.displayName ?? 'Unknown',
    });
  }

  async function handleAddCategory(cat: {
    name: string;
    emoji: string;
    limit: number;
  }) {
    if (!family) {
      return;
    }
    await addCategory(family.id, { ...cat, createdBy: uid });
  }

  async function handleDeleteTransaction(txn: Transaction) {
    if (!family) {
      return;
    }
    await deleteTransaction(family.id, txn.id);
  }

  async function handleDeleteCategory(cat: BudgetCategory) {
    if (!family) {
      return;
    }
    await deleteCategory(family.id, cat.id);
  }

  async function handleUpdateLimit(cat: BudgetCategory, limit: number) {
    if (!family) {
      return;
    }
    await updateCategoryLimit(family.id, cat.id, limit);
  }

  async function handleSelectCurrency(code: string) {
    if (!family) {
      return;
    }
    setShowCurrencyPicker(false);
    await updateBudgetCurrency(family.id, code);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Month picker */}
      <View style={[styles.monthBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setMonth(m => addMonths(m, -1))}
        >
          <Text style={[styles.arrow, { color: ACCENT }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.text }]}>
          {monthLabel(month)}
        </Text>
        <TouchableOpacity
          style={styles.monthArrow}
          onPress={() => setMonth(m => addMonths(m, 1))}
          disabled={isCurrentMonth}
        >
          <Text
            style={[
              styles.arrow,
              { color: isCurrentMonth ? colors.textTertiary : ACCENT },
            ]}
          >
            ›
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
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
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? ACCENT : colors.textTertiary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'summary' && (
          <SummaryTab
            categories={categories}
            transactions={transactions}
            month={month}
            formatAmount={fmt}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions}
            uid={uid}
            isAdmin={isAdmin}
            onDelete={handleDeleteTransaction}
            onAdd={() => setShowAddTxn(true)}
            formatAmount={fmt}
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
            formatAmount={fmt}
          />
        )}
      </View>

      <AddTransactionModal
        visible={showAddTxn}
        categories={categories}
        currencyCode={currencyCode}
        onClose={() => setShowAddTxn(false)}
        onAdd={handleAddTransaction}
      />

      <AddCategoryModal
        visible={showAddCat}
        currencyCode={currencyCode}
        onClose={() => setShowAddCat(false)}
        onAdd={handleAddCategory}
      />

      {/* Currency picker modal */}
      <Modal
        visible={showCurrencyPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.pickerOverlay}>
          <View
            style={[
              styles.pickerSheet,
              {
                backgroundColor: colors.surface,
                paddingBottom: insets.bottom + 16,
              },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Budget Currency
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <Text
                  style={[styles.pickerClose, { color: colors.textSecondary }]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={item => item.code}
              renderItem={({ item }) => {
                const selected = item.code === currencyCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.currencyRow,
                      { borderBottomColor: colors.border },
                    ]}
                    onPress={() => handleSelectCurrency(item.code)}
                  >
                    <View style={styles.currencyInfo}>
                      <Text
                        style={[
                          styles.currencyCode,
                          { color: selected ? ACCENT : colors.text },
                        ]}
                      >
                        {item.code}
                      </Text>
                      <Text
                        style={[
                          styles.currencyName,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {item.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.currencyFormatted,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatAmount(123456, item.code)}
                    </Text>
                    {selected && (
                      <Text style={[styles.currencyCheck, { color: ACCENT }]}>
                        ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  monthArrow: { padding: 8 },
  arrow: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  headerCurrencyBtn: { paddingHorizontal: 4 },
  headerCurrencyText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },

  tabBar: {
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
  tabEmoji: { fontSize: 18 },
  tabLabel: { fontSize: 12, fontWeight: '600' },

  content: { flex: 1 },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pickerTitle: { fontSize: 17, fontWeight: '700' },
  pickerClose: { fontSize: 15, fontWeight: '600' },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  currencyInfo: { flex: 1 },
  currencyCode: { fontSize: 15, fontWeight: '700' },
  currencyName: { fontSize: 12, marginTop: 1 },
  currencyFormatted: { fontSize: 13, marginRight: 12 },
  currencyCheck: { fontSize: 18, fontWeight: '700' },
});
