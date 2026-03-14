import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Text from '../../components/Text';
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
import { logActivity } from '../../services/activityService';
import SummaryTab from './tabs/SummaryTab';
import TransactionsTab from './tabs/TransactionsTab';
import CategoriesTab from './tabs/CategoriesTab';
import { SheetManager } from 'react-native-actions-sheet';

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
  const navigation = useNavigation();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy || profile?.role === 'admin';
  const canDeleteAny = isAdmin || profile?.role === 'parent';
  const ACCENT = colors.tiles.budget.icon;

  const [activeTab, setActiveTab] = useState<Tab>('summary');
  const [month, setMonth] = useState(currentMonth());
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
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
              onPress={() => SheetManager.show('budget-currency', { payload: { currencyCode, currencies: CURRENCIES, onChange: handleSelectCurrency } })}
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
    if (!family) { return; }
    const name = profile?.displayName ?? 'Someone';
    await addCategory(family.id, { ...cat, createdBy: uid });
    logActivity(family.id, 'category_added', uid, name, { categoryName: cat.name });
  }

  async function handleDeleteTransaction(txn: Transaction) {
    if (!family) { return; }
    const name = profile?.displayName ?? 'Someone';
    await deleteTransaction(family.id, txn.id);
    logActivity(family.id, 'transaction_deleted', uid, name, { categoryName: txn.categoryName });
  }

  async function handleDeleteCategory(cat: BudgetCategory) {
    if (!family) { return; }
    const name = profile?.displayName ?? 'Someone';
    await deleteCategory(family.id, cat.id);
    logActivity(family.id, 'category_deleted', uid, name, { categoryName: cat.name });
  }

  async function handleUpdateLimit(cat: BudgetCategory, limit: number) {
    if (!family) { return; }
    const name = profile?.displayName ?? 'Someone';
    await updateCategoryLimit(family.id, cat.id, limit);
    logActivity(family.id, 'category_limit_updated', uid, name, { categoryName: cat.name });
  }

  async function handleSelectCurrency(code: string) {
    if (!family) {
      return;
    }
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
            isAdmin={canDeleteAny}
            onDelete={handleDeleteTransaction}
            onAdd={() => SheetManager.show('add-transaction', { payload: { categories, currencyCode, onAdd: handleAddTransaction } })}
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
            onAdd={() => SheetManager.show('add-category', { payload: { currencyCode, onAdd: handleAddCategory } })}
            formatAmount={fmt}
          />
        )}
      </View>

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
});
