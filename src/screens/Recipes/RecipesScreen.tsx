import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import {
  Recipe,
  subscribeToRecipes,
  addRecipe,
  updateRecipe,
  deleteRecipe,
} from '../../services/recipeService';
import AddRecipeModal from './components/AddRecipeModal';
import RecipeDetailModal from './components/RecipeDetailModal';

const ALL_TAGS = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Dessert',
  'Drinks',
  'Snack',
  'Vegetarian',
  'Quick',
  'Baking',
  'Seafood',
];

function timeLabel(mins: number): string {
  if (!mins) {
    return '';
  }
  if (mins < 60) {
    return `${mins}m`;
  }
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RecipesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const isAdmin = uid === family?.createdBy;
  const ACCENT = colors.tiles.recipes.icon;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [detailRecipe, setDetailRecipe] = useState<Recipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null | undefined>(
    undefined,
  );
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!family) {
      return;
    }
    const unsub = subscribeToRecipes(family.id, setRecipes);
    return unsub;
  }, [family]);

  const filtered = useMemo(() => {
    let list = recipes;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        r =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.tags?.some(t => t.toLowerCase().includes(q)),
      );
    }
    if (activeTag) {
      list = list.filter(r => r.tags?.includes(activeTag));
    }
    return list;
  }, [recipes, search, activeTag]);

  async function handleSave(
    data: Omit<Recipe, 'id' | 'createdAt' | 'addedBy' | 'addedByName'>,
  ) {
    if (!family) {
      return;
    }
    if (editRecipe) {
      await updateRecipe(family.id, editRecipe.id, data);
    } else {
      await addRecipe(family.id, {
        ...data,
        addedBy: uid,
        addedByName: profile?.displayName ?? 'Unknown',
      });
    }
  }

  function handleEdit(recipe: Recipe) {
    setDetailRecipe(null);
    setEditRecipe(recipe);
    setShowAdd(true);
  }

  function handleDelete(recipe: Recipe) {
    if (!family) {
      return;
    }
    Alert.alert('Delete Recipe', `Remove "${recipe.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDetailRecipe(null);
          await deleteRecipe(family.id, recipe.id, recipe.photoStoragePath);
        },
      },
    ]);
  }

  function openAdd() {
    setEditRecipe(null);
    setShowAdd(true);
  }

  function renderItem({ item }: { item: Recipe }) {
    const totalTime = (item.prepMins || 0) + (item.cookMins || 0);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }]}
        onPress={() => setDetailRecipe(item)}
        activeOpacity={0.85}
      >
        {/* Photo or color stripe */}
        {item.photoURL ? (
          <Image
            source={{ uri: item.photoURL }}
            style={styles.cardPhoto}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardPhotoFallback,
              { backgroundColor: ACCENT + '22' },
            ]}
          >
            <Text style={styles.cardPhotoEmoji}>🍳</Text>
          </View>
        )}

        <View style={styles.cardBody}>
          {/* Tags */}
          {item.tags?.length > 0 && (
            <View style={styles.cardTagRow}>
              {item.tags.slice(0, 3).map(tag => (
                <View
                  key={tag}
                  style={[styles.cardTag, { backgroundColor: ACCENT + '22' }]}
                >
                  <Text style={[styles.cardTagText, { color: ACCENT }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!!item.description && (
            <Text
              style={[styles.cardDesc, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
          <View style={styles.cardMeta}>
            {!!item.servings && (
              <Text
                style={[styles.cardMetaText, { color: colors.textTertiary }]}
              >
                👤 {item.servings}
              </Text>
            )}
            {totalTime > 0 && (
              <Text
                style={[styles.cardMetaText, { color: colors.textTertiary }]}
              >
                ⏱ {timeLabel(totalTime)}
              </Text>
            )}
            <Text style={[styles.cardMetaText, { color: colors.textTertiary }]}>
              by {item.addedByName}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search recipes…"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={[styles.clearBtn, { color: colors.textTertiary }]}>
              ✕
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tag filter */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tagScroll, { backgroundColor: colors.surface }]}
          contentContainerStyle={styles.tagScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.filterTag,
              {
                backgroundColor: !activeTag ? ACCENT : colors.surfaceSecondary,
                borderColor: !activeTag ? ACCENT : colors.border,
              },
            ]}
            onPress={() => setActiveTag('')}
          >
            <Text
              style={[
                styles.filterTagText,
                { color: !activeTag ? '#fff' : colors.textSecondary },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {ALL_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.filterTag,
                {
                  backgroundColor:
                    activeTag === tag ? ACCENT : colors.surfaceSecondary,
                  borderColor: activeTag === tag ? ACCENT : colors.border,
                },
              ]}
              onPress={() => setActiveTag(prev => (prev === tag ? '' : tag))}
            >
              <Text
                style={[
                  styles.filterTagText,
                  { color: activeTag === tag ? '#fff' : colors.textSecondary },
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Recipe list */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyEmoji}>🍳</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search || activeTag ? 'No matching recipes' : 'No recipes yet'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {search || activeTag
                ? 'Try a different search or tag'
                : 'Tap + to add your first family recipe.'}
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[
          styles.fab,
          { backgroundColor: ACCENT, bottom: insets.bottom + 30 },
        ]}
        onPress={openAdd}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail modal */}
      <RecipeDetailModal
        recipe={detailRecipe}
        canEdit={!!detailRecipe && (isAdmin || detailRecipe.addedBy === uid)}
        onClose={() => setDetailRecipe(null)}
        onEdit={() => detailRecipe && handleEdit(detailRecipe)}
        onDelete={() => detailRecipe && handleDelete(detailRecipe)}
      />

      {/* Add / Edit modal */}
      <AddRecipeModal
        visible={showAdd}
        familyId={family?.id ?? ''}
        editRecipe={editRecipe}
        onClose={() => {
          setShowAdd(false);
          setEditRecipe(undefined);
        }}
        onSave={handleSave}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  clearBtn: { fontSize: 14, padding: 4 },
  tagScroll: { borderBottomWidth: StyleSheet.hairlineWidth },
  tagScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  filterTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterTagText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 16 },
  card: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardPhoto: { width: '100%', height: 180 },
  cardPhotoFallback: {
    width: '100%',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPhotoEmoji: { fontSize: 40 },
  cardBody: { padding: 14 },
  cardTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  cardTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardTagText: { fontSize: 11, fontWeight: '700' },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 12 },
  cardMetaText: { fontSize: 12 },

  emptyCard: {
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
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
