import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  SectionList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import TextInput from '../../components/TextInput';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { SheetManager } from 'react-native-actions-sheet';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  ShoppingItem,
  ShoppingCategory,
  subscribeToShoppingItems,
  subscribeToCategories,
  toggleShoppingItem,
  deleteShoppingItem,
  clearCheckedItems,
  toggleAllShoppingItems,
} from '../../services/shoppingService';
import { HomeStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'ShoppingList'>;

interface Section {
  category: ShoppingCategory;
  data: ShoppingItem[];
}

export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<HomeStackParamList, 'ShoppingList'>>();
  const { listId, listName } = route.params;
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.shopping.icon;

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [categories, setCategories] = useState<ShoppingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub1 = subscribeToShoppingItems(family.id, listId, data => {
      setItems(data);
      setLoading(false);
    });
    const unsub2 = subscribeToCategories(family.id, setCategories);
    return () => {
      unsub1();
      unsub2();
    };
  }, [family, listId]);

  // Group items into sections by category, respecting category order
  const sections: Section[] = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = q
      ? items.filter(i => i.name.toLowerCase().includes(q))
      : items;

    const map = new Map<string, ShoppingItem[]>();
    filtered.forEach(item => {
      const key = item.category || 'Other';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });

    const result: Section[] = [];
    // Use category order from Firestore
    categories.forEach(cat => {
      const catItems = map.get(cat.name);
      if (catItems && catItems.length > 0) {
        // Unchecked first, then checked
        const sorted = [
          ...catItems.filter(i => !i.checked),
          ...catItems.filter(i => i.checked),
        ];
        result.push({ category: cat, data: sorted });
      }
    });
    // Any items whose category doesn't match a known category
    map.forEach((catItems, catName) => {
      if (!categories.find(c => c.name === catName) && catItems.length > 0) {
        result.push({
          category: {
            id: catName,
            name: catName,
            emoji: '📦',
            order: 999,
            isDefault: false,
          },
          data: catItems,
        });
      }
    });
    return result;
  }, [items, categories, search]);

  const checkedCount = items.filter(i => i.checked).length;
  const allChecked = items.length > 0 && checkedCount === items.length;

  function handleClearChecked() {
    if (!family || checkedCount === 0) {
      return;
    }
    Alert.alert(
      'Clear Checked',
      `Remove ${checkedCount} checked item${checkedCount !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => clearCheckedItems(family.id, listId),
        },
      ],
    );
  }

  function openAddSheet() {
    if (!family) {
      return;
    }
    SheetManager.show('add-shopping-item', {
      payload: {
        familyId: family.id,
        listId,
        categories,
        uid,
        displayName: profile?.displayName ?? 'Someone',
      },
    });
  }

  function renderSectionHeader({ section }: { section: Section }) {
    const cat = section.category;
    return (
      <View
        style={[styles.sectionHeader, { backgroundColor: colors.background }]}
      >
        <Text style={styles.sectionEmoji}>{cat.emoji}</Text>
        <Text style={[styles.sectionName, { color: colors.textSecondary }]}>
          {cat.name}
        </Text>
      </View>
    );
  }

  function renderItem({ item }: { item: ShoppingItem }) {
    const cat = categories.find(c => c.name === item.category);
    return (
      <Swipeable
        renderRightActions={() => (
          <TouchableOpacity
            style={[styles.deleteAction, { backgroundColor: colors.danger }]}
            onPress={() =>
              family &&
              deleteShoppingItem(family.id, listId, item.id, item.checked)
            }
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      >
        <TouchableOpacity
          style={[styles.itemRow, { backgroundColor: colors.surface }]}
          onPress={() =>
            family &&
            toggleShoppingItem(family.id, listId, item.id, item.checked)
          }
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.checkbox,
              { borderColor: item.checked ? colors.success : colors.border },
              item.checked && { backgroundColor: colors.success },
            ]}
          >
            {item.checked && <Text style={styles.checkmark}>✓</Text>}
          </View>

          <View style={styles.itemBody}>
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
            {/* Show category badge only when searching */}
            {!!search && cat && (
              <View
                style={[styles.catBadge, { backgroundColor: ACCENT + '18' }]}
              >
                <Text style={styles.catBadgeEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catBadgeText, { color: ACCENT }]}>
                  {cat.name}
                </Text>
              </View>
            )}
          </View>
          {!!item.quantity && (
            <Text style={[styles.quantity, { color: colors.textTertiary }]}>
              {item.quantity}
            </Text>
          )}
        </TouchableOpacity>
      </Swipeable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <LucideIcon name="search" size={16} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search items…"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <LucideIcon name="x" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
        {checkedCount > 0 && !search && (
          <TouchableOpacity
            onPress={handleClearChecked}
            style={styles.clearBtn}
          >
            <Text style={[styles.clearBtnText, { color: colors.danger }]}>
              Clear {checkedCount}
            </Text>
          </TouchableOpacity>
        )}
        {items.length > 0 && !search && (
          <TouchableOpacity
            onPress={() => family && toggleAllShoppingItems(family.id, listId, !allChecked)}
            style={styles.manageBtn}
          >
            <LucideIcon
              name={allChecked ? 'circle' : 'check-circle'}
              size={18}
              color={allChecked ? colors.textTertiary : ACCENT}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.navigate('ManageCategories')}
          style={styles.manageBtn}
        >
          <LucideIcon name="settings-2" size={18} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {listName} is empty
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap + to add your first item
          </Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No results
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
        ]}
        onPress={openAddSheet}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 2 },
  clearBtn: { paddingHorizontal: 6 },
  clearBtnText: { fontSize: 13, fontWeight: '600' },
  manageBtn: { padding: 4 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sectionEmoji: { fontSize: 16 },
  sectionName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: { fontSize: 12, fontWeight: '600' },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '500' },
  quantity: { fontSize: 14, fontWeight: '500', flexShrink: 0 },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  catBadgeEmoji: { fontSize: 11 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },

  sep: { height: StyleSheet.hairlineWidth, marginLeft: 54 },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15 },

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
