import React from 'react';
import { View, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import LucideIcon from '@react-native-vector-icons/lucide';
import Text from '../components/Text';
import { useTheme } from '../theme/useTheme';

export default function SelectShoppingListSheet(props: SheetProps<'select-shopping-list'>) {
  const { colors } = useTheme();
  const { lists, ingredientCount, onSelect } = props.payload!;

  async function handleSelect(listId: string, listName: string) {
    await SheetManager.hide(props.sheetId);
    onSelect(listId, listName);
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      useBottomSafeAreaPadding
      containerStyle={{ backgroundColor: colors.surface }}
    >
      <View style={styles.content}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Text style={[styles.title, { color: colors.text }]}>Add to Shopping List</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {ingredientCount} ingredient{ingredientCount !== 1 ? 's' : ''} will be added
        </Text>

        <FlatList
          data={lists}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[
                styles.row,
                { borderBottomColor: colors.border },
                index === lists.length - 1 && styles.rowLast,
              ]}
              onPress={() => handleSelect(item.id, item.name)}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.tiles.shopping.bg }]}>
                <Text style={styles.iconEmoji}>🛒</Text>
              </View>
              <View style={styles.rowBody}>
                <Text style={[styles.rowName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.rowMeta, { color: colors.textTertiary }]}>
                  {item.itemCount} item{item.itemCount !== 1 ? 's' : ''}
                </Text>
              </View>
              <LucideIcon name="chevron-right" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 8 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: '700', paddingHorizontal: 20, marginBottom: 4 },
  subtitle: { fontSize: 13, paddingHorizontal: 20, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 13,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 20 },
  rowBody: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 1 },
});
