import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import ActionSheet, {SheetManager, SheetProps, ScrollView} from 'react-native-actions-sheet';
import Text from '../components/Text';
import { useTheme } from '../theme/useTheme';

function formatAmount(cents: number, currencyCode: string): string {
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

export default function BudgetCurrencySheet(props: SheetProps<'budget-currency'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.budget.icon;

  const { currencyCode, currencies, onChange } = props.payload!;

  function handleSelect(code: string) {
    onChange(code);
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
        maxHeight: '80%',
      }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Budget Currency
        </Text>
        <TouchableOpacity onPress={() => SheetManager.hide(props.sheetId)}>
          <Text style={[styles.close, { color: colors.textSecondary }]}>Done</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={currencies}
        keyExtractor={item => item.code}
        renderItem={({ item }) => {
          const selected = item.code === currencyCode;
          return (
            <TouchableOpacity
              style={[
                styles.currencyRow,
                { borderBottomColor: colors.border },
              ]}
              onPress={() => handleSelect(item.code)}
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
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: { fontSize: 17, fontWeight: '700' },
  close: { fontSize: 15, fontWeight: '600' },
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
