import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import Text from '../../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/useTheme';
import { BudgetCategory, Transaction } from '../../../services/budgetService';

interface Props {
  categories: BudgetCategory[];
  transactions: Transaction[];
  month: string;
}

function cents(n: number): string {
  return `$${(n / 100).toFixed(2)}`;
}

interface ProgressBarProps {
  spent: number;
  limit: number;
  color: string;
  dangerColor: string;
}

function ProgressBar({ spent, limit, color, dangerColor }: ProgressBarProps) {
  if (limit === 0) {
    return null;
  }
  const pct = Math.min(spent / limit, 1);
  const over = spent > limit;
  return (
    <View style={styles.barTrack}>
      <View
        style={[
          styles.barFill,
          {
            width: `${pct * 100}%`,
            backgroundColor: over ? dangerColor : color,
          },
        ]}
      />
    </View>
  );
}

export default function SummaryTab({
  categories,
  transactions = [],
  month,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = colors.tiles.budget.icon;

  const [year, mon] = month.split('-').map(Number);
  const monthLabel = new Date(year, mon - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const totalSpent = transactions?.reduce((s, t) => s + t.amount, 0);
  const totalLimit = categories?.reduce((s, c) => s + c.limit, 0);

  // Spending per category
  const spentByCat: Record<string, number> = {};
  for (const t of transactions) {
    spentByCat[t.categoryId] = (spentByCat[t.categoryId] ?? 0) + t.amount;
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 100 },
      ]}
    >
      {/* Monthly overview card */}
      <View style={[styles.overviewCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.overviewLabel, { color: colors.textSecondary }]}>
          {monthLabel}
        </Text>
        <Text style={[styles.overviewAmount, { color: colors.text }]}>
          {cents(totalSpent)}
        </Text>
        <Text style={[styles.overviewSub, { color: colors.textSecondary }]}>
          {totalLimit > 0
            ? `of ${cents(totalLimit)} budget · ${cents(
                Math.max(totalLimit - totalSpent, 0),
              )} remaining`
            : `${transactions.length} transaction${
                transactions.length !== 1 ? 's' : ''
              }`}
        </Text>
        {totalLimit > 0 && (
          <View style={[styles.barTrack, styles.overviewBar]}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(totalSpent / totalLimit, 1) * 100}%`,
                  backgroundColor:
                    totalSpent > totalLimit ? colors.danger : ACCENT,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Per-category breakdown */}
      {categories.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.emptyEmoji}>💰</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No categories yet
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Add categories in the Categories tab to start tracking your
            spending.
          </Text>
        </View>
      ) : (
        <>
          <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>
            By Category
          </Text>
          {categories.map(cat => {
            const spent = spentByCat[cat.id] ?? 0;
            const over = cat.limit > 0 && spent > cat.limit;
            return (
              <View
                key={cat.id}
                style={[styles.catCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.catRow}>
                  <View
                    style={[styles.catIcon, { backgroundColor: ACCENT + '22' }]}
                  >
                    <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={[styles.catName, { color: colors.text }]}>
                      {cat.name}
                    </Text>
                    {cat.limit > 0 && (
                      <Text
                        style={[
                          styles.catLimit,
                          { color: over ? colors.danger : colors.textTertiary },
                        ]}
                      >
                        {over ? '⚠️ Over budget' : `Limit: ${cents(cat.limit)}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.catAmounts}>
                    <Text
                      style={[
                        styles.catSpent,
                        { color: over ? colors.danger : colors.text },
                      ]}
                    >
                      {cents(spent)}
                    </Text>
                    {cat.limit > 0 && (
                      <Text
                        style={[styles.catOf, { color: colors.textTertiary }]}
                      >
                        of {cents(cat.limit)}
                      </Text>
                    )}
                  </View>
                </View>
                <ProgressBar
                  spent={spent}
                  limit={cat.limit}
                  color={ACCENT}
                  dangerColor={colors.danger}
                />
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },

  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  overviewLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  overviewAmount: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  overviewSub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  overviewBar: { marginTop: 16, width: '100%' },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  catCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  catRow: { flexDirection: 'row', alignItems: 'center' },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catEmoji: { fontSize: 20 },
  catInfo: { flex: 1 },
  catName: { fontSize: 15, fontWeight: '600' },
  catLimit: { fontSize: 11, marginTop: 2 },
  catAmounts: { alignItems: 'flex-end' },
  catSpent: { fontSize: 16, fontWeight: '700' },
  catOf: { fontSize: 11, marginTop: 1 },

  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
    marginTop: 10,
  },
  barFill: { height: '100%', borderRadius: 3 },

  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
