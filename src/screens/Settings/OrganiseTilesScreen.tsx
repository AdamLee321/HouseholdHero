import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LucideIcon from '@react-native-vector-icons/lucide';
import Text from '../../components/Text';
import { useTheme } from '../../theme/useTheme';
import { useAuthStore } from '../../store/authStore';
import {
  DEFAULT_TILE_ORDER,
  saveTilePrefs,
  subscribeTilePrefs,
} from '../../services/tilePrefsService';
import { TilePref } from '../../types';
import { AppColors } from '../../theme/colors';

const { width } = Dimensions.get('window');
const PADDING_H = 16;
const TILE_GAP = 12;
const TILE_SIZE = (width - PADDING_H * 2 - TILE_GAP) / 2;
const TILE_HEIGHT = 120;
const ROW_HEIGHT = TILE_HEIGHT + TILE_GAP;

interface TileItem {
  key: string;
  label: string;
  emoji: string;
  colorKey: keyof AppColors['tiles'];
  visible: boolean;
}

const TILE_META: Record<
  string,
  { label: string; emoji: string; colorKey: keyof AppColors['tiles'] }
> = {
  Shopping: { label: 'Shopping', emoji: '🛒', colorKey: 'shopping' },
  Todos: { label: 'To-Do Lists', emoji: '✅', colorKey: 'todos' },
  Chores: { label: 'Chores', emoji: '🧹', colorKey: 'chores' },
  Calendar: { label: 'Calendar', emoji: '📅', colorKey: 'calendar' },
  Messages: { label: 'Messages', emoji: '💬', colorKey: 'messages' },
  Contacts: { label: 'Emergency Contacts', emoji: '🚨', colorKey: 'contacts' },
  Location: { label: 'Map', emoji: '📍', colorKey: 'location' },
  Documents: { label: 'Documents', emoji: '📄', colorKey: 'documents' },
  MyFamily: { label: 'My Family', emoji: '👨‍👩‍👧‍👦', colorKey: 'family' },
  Budget: { label: 'Budget', emoji: '💰', colorKey: 'budget' },
  Gallery: { label: 'Gallery', emoji: '📸', colorKey: 'gallery' },
  Recipes: { label: 'Recipes', emoji: '🍳', colorKey: 'recipes' },
};

function buildItems(prefs: TilePref): TileItem[] {
  const ordered = prefs.order
    .filter(k => TILE_META[k])
    .map(k => ({
      key: k,
      ...TILE_META[k],
      visible: !prefs.hidden.includes(k),
    }));
  const seen = new Set(prefs.order);
  DEFAULT_TILE_ORDER.filter(k => !seen.has(k)).forEach(k => {
    if (TILE_META[k]) ordered.push({ key: k, ...TILE_META[k], visible: true });
  });
  return ordered;
}

function itemsToPrefs(items: TileItem[]): TilePref {
  return {
    order: items.map(i => i.key),
    hidden: items.filter(i => !i.visible).map(i => i.key),
  };
}

// Pixel position of a tile's top-left corner within the grid container
function posOf(index: number) {
  'worklet';
  return {
    x: PADDING_H + (index % 2) * (TILE_SIZE + TILE_GAP),
    y: Math.floor(index / 2) * ROW_HEIGHT,
  };
}

// Which tile index is at a given point in the grid container
function indexAt(x: number, y: number, count: number): number {
  'worklet';
  const col = x - PADDING_H > TILE_SIZE + TILE_GAP / 2 ? 1 : 0;
  const row = Math.max(0, Math.floor(y / ROW_HEIGHT));
  return Math.max(0, Math.min(row * 2 + col, count - 1));
}

function reorder<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function OrganiseTilesScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const uid = user?.uid ?? '';

  const [items, setItems] = useState<TileItem[]>(() =>
    buildItems({ order: DEFAULT_TILE_ORDER, hidden: [] }),
  );
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragTo, setDragTo] = useState<number | null>(null);

  // Shared values live on the UI thread — drive the overlay position
  const overlayX = useSharedValue(0);
  const overlayY = useSharedValue(0);
  const overlayScale = useSharedValue(1);
  const tileStartX = useSharedValue(0);
  const tileStartY = useSharedValue(0);
  const fromIndexSV = useSharedValue(-1);
  const itemCountSV = useSharedValue(items.length);

  useEffect(() => {
    itemCountSV.value = items.length;
  }, [items.length]);

  useEffect(() => {
    if (!uid) return;
    return subscribeTilePrefs(uid, prefs => setItems(buildItems(prefs)));
  }, [uid]);

  // Called from worklet → JS thread
  const jsSetDragFrom = useCallback((i: number) => setDragFrom(i), []);
  const jsSetDragTo = useCallback((i: number) => setDragTo(i), []);
  const jsCommit = useCallback(
    (from: number, to: number) => {
      setDragFrom(null);
      setDragTo(null);
      if (from !== to) {
        setItems(prev => {
          const next = reorder(prev, from, to);
          saveTilePrefs(uid, itemsToPrefs(next));
          return next;
        });
      }
    },
    [uid],
  );
  const jsCancel = useCallback(() => {
    setDragFrom(null);
    setDragTo(null);
  }, []);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(e => {
      const from = indexAt(e.x, e.y, itemCountSV.value);
      const pos = posOf(from);
      fromIndexSV.value = from;
      tileStartX.value = pos.x;
      tileStartY.value = pos.y;
      overlayX.value = pos.x;
      overlayY.value = pos.y;
      overlayScale.value = withSpring(1.07);
      runOnJS(jsSetDragFrom)(from);
      runOnJS(jsSetDragTo)(from);
    })
    .onUpdate(e => {
      overlayX.value = tileStartX.value + e.translationX;
      overlayY.value = tileStartY.value + e.translationY;
      const to = indexAt(
        tileStartX.value + e.translationX + TILE_SIZE / 2,
        tileStartY.value + e.translationY + TILE_HEIGHT / 2,
        itemCountSV.value,
      );
      runOnJS(jsSetDragTo)(to);
    })
    .onEnd(() => {
      const from = fromIndexSV.value;
      const to = indexAt(
        overlayX.value + TILE_SIZE / 2,
        overlayY.value + TILE_HEIGHT / 2,
        itemCountSV.value,
      );
      overlayScale.value = withSpring(1);
      fromIndexSV.value = -1;
      runOnJS(jsCommit)(from, to);
    })
    .onFinalize(() => {
      overlayScale.value = withSpring(1);
      fromIndexSV.value = -1;
      runOnJS(jsCancel)();
    });

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: overlayX.value },
      { translateY: overlayY.value },
      { scale: overlayScale.value },
    ],
  }));

  const toggleVisible = useCallback(
    (key: string) => {
      setItems(prev => {
        const next = prev.map(i =>
          i.key === key ? { ...i, visible: !i.visible } : i,
        );
        saveTilePrefs(uid, itemsToPrefs(next));
        return next;
      });
    },
    [uid],
  );

  const draggingItem = dragFrom !== null ? items[dragFrom] : null;
  const gridHeight = Math.ceil(items.length / 2) * ROW_HEIGHT - TILE_GAP;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Hold a tile to drag and reorder. Tap the eye to show or hide.
      </Text>
      <ScrollView
        scrollEnabled={dragFrom === null}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
          paddingTop: 4,
        }}
      >
        <GestureDetector gesture={pan}>
          <View style={[styles.grid, { height: gridHeight }]}>
            {items.map((item, index) => {
              const pos = posOf(index);
              const isGhost = dragFrom === index;
              const isTarget =
                dragTo === index && dragFrom !== null && dragFrom !== index;
              const tileColors = colors.tiles[item.colorKey];
              return (
                <View
                  key={item.key}
                  style={[styles.tileWrap, { left: pos.x, top: pos.y }]}
                >
                  {isGhost ? (
                    // Empty ghost where the tile originated
                    <View
                      style={[
                        styles.tile,
                        styles.ghost,
                        { borderColor: colors.primary },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.tile,
                        {
                          backgroundColor: colors.surface,
                          shadowColor: isDark ? '#000' : '#aaa',
                          opacity: item.visible ? 1 : 0.4,
                          borderWidth: isTarget ? 2 : 0,
                          borderColor: isTarget
                            ? colors.primary
                            : 'transparent',
                        },
                      ]}
                    >
                      <Text style={[styles.tileLabel, { color: colors.text }]}>
                        {item.label}
                      </Text>
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: tileColors.bg },
                        ]}
                      >
                        <Text style={styles.emoji}>{item.emoji}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => toggleVisible(item.key)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={[
                          styles.eyeBadge,
                          { backgroundColor: colors.surface },
                        ]}
                      >
                        <LucideIcon
                          name={item.visible ? 'eye' : 'eye-off'}
                          size={14}
                          color={
                            item.visible ? colors.primary : colors.textSecondary
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Floating tile that follows the finger */}
            {draggingItem &&
              (() => {
                const tileColors = colors.tiles[draggingItem.colorKey];
                return (
                  <Animated.View
                    pointerEvents="none"
                    style={[styles.tileWrap, overlayStyle, styles.overlay]}
                  >
                    <View
                      style={[
                        styles.tile,
                        {
                          backgroundColor: colors.surface,
                          shadowColor: '#000',
                          shadowOpacity: 0.2,
                          shadowRadius: 20,
                          shadowOffset: { width: 0, height: 8 },
                          elevation: 10,
                          opacity: draggingItem.visible ? 1 : 0.4,
                        },
                      ]}
                    >
                      <Text style={[styles.tileLabel, { color: colors.text }]}>
                        {draggingItem.label}
                      </Text>
                      <View
                        style={[
                          styles.iconWrap,
                          { backgroundColor: tileColors.bg },
                        ]}
                      >
                        <Text style={styles.emoji}>{draggingItem.emoji}</Text>
                      </View>
                    </View>
                  </Animated.View>
                );
              })()}
          </View>
        </GestureDetector>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hint: {
    fontSize: 13,
    marginHorizontal: PADDING_H,
    marginTop: 12,
    marginBottom: 8,
  },
  grid: { marginHorizontal: 0 },
  tileWrap: { position: 'absolute', width: TILE_SIZE, height: TILE_HEIGHT },
  overlay: { zIndex: 100 },
  tile: {
    width: TILE_SIZE,
    height: TILE_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 14,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  ghost: {
    borderWidth: 2,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  tileLabel: { fontSize: 15, fontWeight: '700' },
  iconWrap: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  eyeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
