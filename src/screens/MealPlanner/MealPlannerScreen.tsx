import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Text from '../../components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SheetManager } from 'react-native-actions-sheet';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';
import auth from '@react-native-firebase/auth';
import {
  MealPlan,
  DayOfWeek,
  MealType,
  DAYS_OF_WEEK,
  DAY_LABELS,
  MEAL_TYPES,
  MEAL_LABELS,
  MEAL_EMOJIS,
  getMondayOfWeek,
  toWeekKey,
  formatWeekLabel,
  getDayDate,
  subscribeMealPlan,
  clearWeek,
} from '../../services/mealPlanService';
import { subscribeToRecipes, Recipe } from '../../services/recipeService';
import {
  subscribeToShoppingLists,
  ShoppingList,
  batchAddShoppingItems,
} from '../../services/shoppingService';
import { lookupCategory } from '../../data/shoppingDictionary';

export default function MealPlannerScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { family, profile } = useFamilyStore();
  const uid = auth().currentUser?.uid ?? '';
  const ACCENT = colors.tiles.mealPlanner.icon;

  const [monday, setMonday] = useState(() => getMondayOfWeek(new Date()));
  const weekStart = toWeekKey(monday);

  const [plan, setPlan] = useState<MealPlan>({ weekStart, days: {} });
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToList, setAddingToList] = useState(false);

  useEffect(() => {
    if (!family) { return; }
    setLoading(true);
    const unsub1 = subscribeMealPlan(family.id, weekStart, data => {
      setPlan(data);
      setLoading(false);
    });
    const unsub2 = subscribeToRecipes(family.id, setRecipes);
    const unsub3 = subscribeToShoppingLists(family.id, setShoppingLists);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [family, weekStart]);

  function shiftWeek(delta: number) {
    setMonday(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  function openAssignSheet(day: DayOfWeek, mealType: MealType) {
    if (!family) { return; }
    SheetManager.show('assign-meal', {
      payload: {
        familyId: family.id,
        weekStart,
        day,
        mealType,
        current: days[day]?.[mealType] ?? null,
        recipes,
        uid,
        displayName: profile?.displayName ?? '',
      },
    });
  }

  function handleClearWeek() {
    if (!family) { return; }
    Alert.alert('Clear Week', 'Remove all meals for this week?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearWeek(family.id, weekStart),
      },
    ]);
  }

  function getWeekIngredients() {
    const items: { name: string; quantity: string; category: string }[] = [];
    for (const day of DAYS_OF_WEEK) {
      for (const mealType of MEAL_TYPES) {
        const slot = days[day]?.[mealType];
        if (slot?.recipeId) {
          const recipe = recipes.find(r => r.id === slot.recipeId);
          recipe?.ingredients.forEach(ing => {
            items.push({ name: ing.name, quantity: ing.amount ?? '', category: lookupCategory(ing.name) });
          });
        }
      }
    }
    return items;
  }

  function handleAddToShoppingList() {
    const ingredients = getWeekIngredients();
    if (ingredients.length === 0) {
      Alert.alert('No Recipes', 'Add recipes to the planner to generate a shopping list.');
      return;
    }
    if (shoppingLists.length === 0) {
      Alert.alert('No Lists', 'Create a shopping list first in the Shopping section.');
      return;
    }
    SheetManager.show('select-shopping-list', {
      payload: {
        lists: shoppingLists,
        ingredientCount: ingredients.length,
        onSelect: async (listId, listName) => {
          if (!family) { return; }
          setAddingToList(true);
          try {
            await batchAddShoppingItems(
              family.id,
              listId,
              ingredients,
              uid,
              profile?.displayName ?? 'Someone',
            );
            Alert.alert('Done', `${ingredients.length} item${ingredients.length !== 1 ? 's' : ''} added to "${listName}".`);
          } finally {
            setAddingToList(false);
          }
        },
      },
    });
  }

  const days = plan.days ?? {};
  const hasRecipeSlots = DAYS_OF_WEEK.some(day =>
    MEAL_TYPES.some(mt => !!days[day]?.[mt]?.recipeId),
  );
  const isCurrentWeek = toWeekKey(getMondayOfWeek(new Date())) === weekStart;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Week navigation */}
      <View style={[styles.weekHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => shiftWeek(-1)} style={styles.weekArrow}>
          <LucideIcon name="chevron-left" size={22} color={ACCENT} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClearWeek} style={styles.weekLabelBtn}>
          <Text style={[styles.weekLabel, { color: colors.text }]}>
            {formatWeekLabel(monday)}
          </Text>
          {isCurrentWeek && (
            <View style={[styles.currentBadge, { backgroundColor: ACCENT + '22' }]}>
              <Text style={[styles.currentBadgeText, { color: ACCENT }]}>This week</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftWeek(1)} style={styles.weekArrow}>
          <LucideIcon name="chevron-right" size={22} color={ACCENT} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={ACCENT} />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + (hasRecipeSlots ? 100 : 32) },
          ]}
        >
          {DAYS_OF_WEEK.map((day, dayIndex) => {
            const dayDate = getDayDate(monday, dayIndex);
            const isToday = dayDate.toDateString() === new Date().toDateString();

            return (
              <View key={day} style={[styles.dayCard, { backgroundColor: colors.surface }]}>
                <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dayName, { color: isToday ? ACCENT : colors.text }]}>
                    {DAY_LABELS[day]}
                  </Text>
                  <Text style={[styles.dayDate, { color: isToday ? ACCENT : colors.textTertiary }]}>
                    {dayDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </Text>
                  {isToday && (
                    <View style={[styles.todayDot, { backgroundColor: ACCENT }]} />
                  )}
                </View>

                {MEAL_TYPES.map((mealType, i) => {
                  const slot = days[day]?.[mealType] ?? null;
                  const isLast = i === MEAL_TYPES.length - 1;
                  return (
                    <TouchableOpacity
                      key={mealType}
                      style={[
                        styles.mealRow,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                      ]}
                      onPress={() => openAssignSheet(day, mealType)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.mealEmoji}>{MEAL_EMOJIS[mealType]}</Text>
                      <Text style={[styles.mealTypeLabel, { color: colors.textSecondary }]}>
                        {MEAL_LABELS[mealType]}
                      </Text>
                      {slot ? (
                        <Text
                          style={[styles.mealName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {slot.name}
                        </Text>
                      ) : (
                        <Text style={[styles.mealEmpty, { color: colors.textTertiary }]}>
                          + Add
                        </Text>
                      )}
                      {slot && (
                        <LucideIcon name="chevron-right" size={14} color={colors.textTertiary} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Add to shopping list */}
      {hasRecipeSlots && (
        <View style={[
          styles.footer,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + 16,
          },
        ]}>
          <TouchableOpacity
            style={[styles.addToListBtn, { backgroundColor: ACCENT }]}
            onPress={handleAddToShoppingList}
            disabled={addingToList}
          >
            {addingToList ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <LucideIcon name="shopping-cart" size={18} color="#fff" />
                <Text style={styles.addToListText}>Add Ingredients to Shopping List</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, marginTop: 60 },

  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  weekArrow: { padding: 12 },
  weekLabelBtn: { flex: 1, alignItems: 'center', gap: 4 },
  weekLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  currentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: { fontSize: 11, fontWeight: '700' },

  scroll: { padding: 12, gap: 10 },

  dayCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  dayName: { fontSize: 15, fontWeight: '700' },
  dayDate: { fontSize: 13 },
  todayDot: {
    width: 6, height: 6, borderRadius: 3,
    marginLeft: 'auto',
  },

  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  mealEmoji: { fontSize: 16, width: 24, textAlign: 'center' },
  mealTypeLabel: { width: 80, fontSize: 13, fontWeight: '600' },
  mealName: { flex: 1, fontSize: 14, fontWeight: '500' },
  mealEmpty: { flex: 1, fontSize: 14 },

  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addToListBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
  },
  addToListText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
