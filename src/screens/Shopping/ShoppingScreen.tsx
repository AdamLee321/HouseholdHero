import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import LucideIcon from '@react-native-vector-icons/lucide';
import { SheetManager } from 'react-native-actions-sheet';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  ShoppingList,
  subscribeToShoppingLists,
  deleteShoppingList,
} from '../../services/shoppingService';
import { HomeStackParamList } from '../../types';

type NavProp = NativeStackNavigationProp<HomeStackParamList, 'Shopping'>;

const VIEW_KEY = '@shopping_view_mode';

export default function ShoppingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { family } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.shopping.icon;

  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Load persisted view mode
  useEffect(() => {
    AsyncStorage.getItem(VIEW_KEY).then(val => {
      if (val === 'list' || val === 'grid') {
        setViewMode(val);
      }
    });
  }, []);

  useEffect(() => {
    if (!family) {
      return;
    }
    return subscribeToShoppingLists(family.id, data => {
      setLists(data);
      setLoading(false);
    });
  }, [family]);

  function toggleView() {
    const next = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(next);
    AsyncStorage.setItem(VIEW_KEY, next);
  }

  function openCreateSheet() {
    if (!family) { return; }
    SheetManager.show('edit-shopping-list', {
      payload: { familyId: family.id, uid },
    });
  }

  const handleLongPress = useCallback(
    (list: ShoppingList) => {
      if (!family) { return; }
      SheetManager.show('edit-shopping-list', {
        payload: {
          familyId: family.id,
          list,
          onDelete: () => {
            const itemWord = list.itemCount === 1 ? 'item' : 'items';
            const message =
              list.itemCount > 0
                ? `This will permanently delete "${list.name}" and all ${list.itemCount} ${itemWord} in it.`
                : `Are you sure you want to delete "${list.name}"?`;
            Alert.alert('Delete List', message, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => deleteShoppingList(family.id, list.id),
              },
            ]);
          },
        },
      });
    },
    [family],
  );

  function renderGridItem({ item }: { item: ShoppingList }) {
    const listEmoji = item.emoji ?? '🛒';
    const listColor = item.color ?? ACCENT;
    return (
      <TouchableOpacity
        style={[styles.gridCard, { backgroundColor: listColor + '1A' }]}
        onPress={() =>
          navigation.navigate('ShoppingList', {
            listId: item.id,
            listName: item.name,
          })
        }
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <Text style={styles.gridCardEmoji}>{listEmoji}</Text>
        <Text
          style={[styles.gridCardName, { color: colors.text }]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        {item.uncheckedCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: listColor }]}>
            <Text style={[styles.badgeText, { color: '#fff' }]}>{item.uncheckedCount} Items</Text>
          </View>
        ) : item.itemCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.success }]}>
            <Text style={[styles.badgeText, { color: '#fff' }]}>Done</Text>
          </View>
        ) : (
          <Text style={[styles.gridCardEmpty, { color: colors.textTertiary }]}>
            Empty
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  function renderListItem({ item }: { item: ShoppingList }) {
    const listEmoji = item.emoji ?? '🛒';
    const listColor = item.color ?? ACCENT;
    return (
      <TouchableOpacity
        style={[styles.listCard, { backgroundColor: colors.surface }]}
        onPress={() =>
          navigation.navigate('ShoppingList', {
            listId: item.id,
            listName: item.name,
          })
        }
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.listCardIcon, { backgroundColor: listColor + '22' }]}>
          <Text style={styles.listCardEmoji}>{listEmoji}</Text>
        </View>
        <View style={styles.listCardBody}>
          <Text style={[styles.listCardName, { color: colors.text }]}>
            {item.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: listColor + '22' }]}>
            <Text style={[styles.badgeText, { color: listColor }]}>
              {item.itemCount === 0 ? 'Empty' : `${item.uncheckedCount} items`}
            </Text>
          </View>
        </View>

        {item.uncheckedCount === 0 && item.itemCount > 0 && (
          <LucideIcon name="check-circle" size={20} color={colors.success} />
        )}
        <LucideIcon
          name="chevron-right"
          size={18}
          color={colors.textTertiary}
          style={styles.chevron}
        />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* View toggle */}
      <View
        style={[
          styles.toolbar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <Text style={[styles.toolbarCount, { color: colors.textSecondary }]}>
          {lists.length} {lists.length === 1 ? 'list' : 'lists'}
        </Text>
        <TouchableOpacity onPress={toggleView} style={styles.toolbarBtn}>
          <LucideIcon
            name={viewMode === 'grid' ? 'list' : 'grid-2x2'}
            size={20}
            color={ACCENT}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : lists.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No shopping lists
          </Text>
          <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
            Tap + to create your first list
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={lists}
          keyExtractor={i => i.id}
          renderItem={renderGridItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[
            styles.gridContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
        />
      ) : (
        <FlatList
          key="list"
          data={lists}
          keyExtractor={i => i.id}
          renderItem={renderListItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: colors.border }]} />
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: ACCENT, bottom: insets.bottom + 30 }]}
        onPress={openCreateSheet}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const CARD_GAP = 12;

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarCount: { fontSize: 13, fontWeight: '600' },
  toolbarBtn: { padding: 4 },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySub: { fontSize: 15 },

  // Grid
  gridContent: { padding: 16 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },
  gridCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  gridCardEmoji: { fontSize: 32, marginBottom: 8 },
  gridCardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    flexShrink: 1,
  },
  gridCardEmpty: { fontSize: 12 },

  // List
  listContent: { paddingTop: 8 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  listCardIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  listCardEmoji: { fontSize: 26 },
  listCardBody: { flex: 1 },
  listCardName: { fontSize: 16, fontWeight: '700', marginBottom: 5 },
  listCardMeta: { fontSize: 13, marginTop: 2 },
  chevron: { marginLeft: 4 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 56 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700' },

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
