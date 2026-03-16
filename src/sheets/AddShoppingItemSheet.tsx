import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import LucideIcon from '@react-native-vector-icons/lucide';
import Text from '../components/Text';
import TextInput from '../components/TextInput';
import { useTheme } from '../theme/useTheme';
import { addShoppingItem, fetchShoppingHistory, ShoppingHistoryItem } from '../services/shoppingService';
import { DictionaryItem, getSuggestions, lookupCategory } from '../data/shoppingDictionary';
import { searchFoodItems } from '../services/openFoodFactsService';

export default function AddShoppingItemSheet(props: SheetProps<'add-shopping-item'>) {
  const { colors } = useTheme();
  const ACCENT = colors.tiles.shopping.icon;

  const { familyId, listId, categories, uid, displayName } = props.payload!;

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name ?? 'Other');
  const [categoryAutoSet, setCategoryAutoSet] = useState(false);
  const [adding, setAdding] = useState(false);
  const [suggestions, setSuggestions] = useState<DictionaryItem[]>([]);
  const [historySuggestions, setHistorySuggestions] = useState<DictionaryItem[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<ShoppingHistoryItem[]>([]);

  // Fetch family history once when sheet opens
  useEffect(() => {
    fetchShoppingHistory(familyId).then(h => { historyRef.current = h; });
  }, [familyId]);

  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed) {
      setSuggestions([]);
      setHistorySuggestions([]);
      return;
    }

    const lower = trimmed.toLowerCase();

    // History matches (sorted by count desc, already ordered from fetch)
    const histMatches: DictionaryItem[] = historyRef.current
      .filter(h => h.name.toLowerCase().includes(lower))
      .slice(0, 3)
      .map(h => ({ name: h.name, category: h.category }));
    setHistorySuggestions(histMatches);

    // Show local results immediately while API loads
    setSuggestions(getSuggestions(trimmed));

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const apiResults = await searchFoodItems(trimmed, controller.signal);
        if (!controller.signal.aborted) {
          setSuggestions(apiResults.length > 0 ? apiResults : getSuggestions(trimmed));
        }
      } catch {
        if (!abortRef.current?.signal.aborted) {
          setSuggestions(getSuggestions(trimmed));
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [name]);

  function handleNameChange(val: string) {
    setName(val);
    if (val.trim() === '') {
      setCategoryAutoSet(false);
      return;
    }
    // Auto-select category from dictionary unless the user has manually chosen one
    if (!categoryAutoSet) {
      const cat = lookupCategory(val.trim());
      if (cat !== 'Other') {
        setSelectedCategory(cat);
      }
    }
  }

  function applySuggestion(suggName: string, suggCategory: string) {
    setName(suggName);
    setSelectedCategory(suggCategory);
    setCategoryAutoSet(true);
    setSuggestions([]);
    setHistorySuggestions([]);
    abortRef.current?.abort();
  }

  async function handleAdd() {
    if (!name.trim()) { return; }
    setAdding(true);
    try {
      await addShoppingItem(
        familyId,
        listId,
        name,
        quantity,
        selectedCategory,
        uid,
        displayName,
      );
      setName('');
      setQuantity('');
      setCategoryAutoSet(false);
      await SheetManager.hide(props.sheetId);
    } finally {
      setAdding(false);
    }
  }

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled={!adding}
      onClose={() => { setName(''); setQuantity(''); setCategoryAutoSet(false); setSuggestions([]); setHistorySuggestions([]); }}
      containerStyle={{ backgroundColor: colors.surface }}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>Add Item</Text>

          {/* Name input */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Item name"
            placeholderTextColor={colors.textTertiary}
            autoFocus
            returnKeyType="next"
            editable={!adding}
          />

          {/* Autocomplete suggestions */}
          {(historySuggestions.length > 0 || suggestions.length > 0) && (
            <View style={styles.suggestions}>
              {/* Family history matches */}
              {historySuggestions.map(s => {
                const catObj = categories.find(c => c.name === s.category);
                return (
                  <TouchableOpacity
                    key={`h_${s.name}`}
                    style={[styles.suggestion, { backgroundColor: colors.background }]}
                    onPress={() => applySuggestion(s.name, s.category)}
                  >
                    <View style={styles.suggestionNameRow}>
                      <LucideIcon name="clock" size={13} color={colors.textTertiary} />
                      <Text style={[styles.suggestionName, { color: colors.text }]}>{s.name}</Text>
                    </View>
                    <View style={styles.suggestionCatRow}>
                      {catObj && <Text style={styles.suggestionEmoji}>{catObj.emoji}</Text>}
                      <Text style={[styles.suggestionCat, { color: ACCENT }]}>{s.category}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
              {/* Separator if both sections present */}
              {historySuggestions.length > 0 && suggestions.length > 0 && (
                <View style={[styles.suggestionSep, { backgroundColor: colors.border }]} />
              )}
              {/* API / dictionary matches */}
              {suggestions.map(s => {
                const catObj = categories.find(c => c.name === s.category);
                return (
                  <TouchableOpacity
                    key={s.name}
                    style={[styles.suggestion, { backgroundColor: colors.background }]}
                    onPress={() => applySuggestion(s.name, s.category)}
                  >
                    <Text style={[styles.suggestionName, { color: colors.text }]}>{s.name}</Text>
                    <View style={styles.suggestionCatRow}>
                      {catObj && <Text style={styles.suggestionEmoji}>{catObj.emoji}</Text>}
                      <Text style={[styles.suggestionCat, { color: ACCENT }]}>{s.category}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Quantity input */}
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Quantity (optional)"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            editable={!adding}
          />

          {/* Category picker */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map(cat => {
              const active = cat.name === selectedCategory;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    {
                      backgroundColor: active ? ACCENT : colors.background,
                      borderColor: active ? ACCENT : colors.border,
                    },
                  ]}
                  onPress={() => { setSelectedCategory(cat.name); setCategoryAutoSet(true); }}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.categoryName, { color: active ? '#fff' : colors.text }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Add button */}
          <TouchableOpacity
            style={[
              styles.addBtn,
              { backgroundColor: name.trim() ? ACCENT : colors.border },
            ]}
            onPress={handleAdd}
            disabled={!name.trim() || adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addBtnText}>Add to List</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 12, paddingBottom: 32 },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 14 },
  input: { borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 10 },
  suggestions: { marginBottom: 10, gap: 4 },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  suggestionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestionName: { fontSize: 15 },
  suggestionCatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  suggestionSep: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  suggestionEmoji: { fontSize: 13 },
  suggestionCat: { fontSize: 12, fontWeight: '600' },
  label: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  categoryRow: { gap: 8, paddingBottom: 4 },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  categoryEmoji: { fontSize: 14 },
  categoryName: { fontSize: 13, fontWeight: '600' },
  addBtn: {
    borderRadius: 14, paddingVertical: 15,
    alignItems: 'center', marginTop: 14,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
