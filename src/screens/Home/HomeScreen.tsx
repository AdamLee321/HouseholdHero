import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../types';
import { useTheme } from '../../theme/useTheme';
import { useFamilyStore } from '../../store/familyStore';

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const { width } = Dimensions.get('window');
const TILE_GAP = 12;
const TILE_SIZE = (width - 32 - TILE_GAP) / 2;
// Icon 44px + 14px right padding = 58px reserved — subtitle never reaches this zone
const ICON_CLEARANCE = 58;

interface Tile {
  label: string;
  subtitle?: string;
  emoji: string;
  screen: keyof Omit<HomeStackParamList, 'Home'>;
  colorKey: keyof ReturnType<typeof useTheme>['colors']['tiles'];
}

const TILES: Tile[] = [
  { label: 'Shopping', emoji: '🛒', screen: 'Shopping', colorKey: 'shopping' },
  { label: 'To-Do Lists', emoji: '✅', screen: 'Todos', colorKey: 'todos' },
  { label: 'Chores', emoji: '🧹', screen: 'Chores', colorKey: 'chores' },
  { label: 'Calendar', emoji: '📅', screen: 'Calendar', colorKey: 'calendar' },
  { label: 'Messages', emoji: '💬', screen: 'Messages', colorKey: 'messages' },
  { label: 'Contacts', emoji: '🚨', screen: 'Contacts', colorKey: 'contacts' },
  { label: 'Location', emoji: '📍', screen: 'Location', colorKey: 'location' },
  {
    label: 'Documents',
    subtitle: 'Store & share important documents',
    emoji: '📄',
    screen: 'Documents',
    colorKey: 'documents',
  },
  {
    label: 'My Family',
    subtitle: 'Members, roles & admin',
    emoji: '👨‍👩‍👧‍👦',
    screen: 'MyFamily',
    colorKey: 'family',
  },
  {
    label: 'My Family',
    subtitle: '1 Member',
    emoji: '👪',
    screen: 'MyFamily',
    colorKey: 'family',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const { colors, isDark } = useTheme();
  const { family, profile } = useFamilyStore();
  const insets = useSafeAreaInsets();

  const todosCount = 0;
  const calendarCount = 0;

  function getSubtitle(tile: Tile): string | undefined {
    if (tile.screen === 'Todos') {
      return todosCount > 0
        ? `${todosCount} list${todosCount !== 1 ? 's' : ''}`
        : undefined;
    }
    if (tile.screen === 'Calendar') {
      return calendarCount > 0
        ? `${calendarCount} event${calendarCount !== 1 ? 's' : ''} this month`
        : undefined;
    }
    return tile.subtitle;
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {profile?.displayName ?? 'there'} 👋
          </Text>
        </View>
        <View
          style={[styles.familyBadge, { backgroundColor: colors.primaryLight }]}
        >
          <Text style={[styles.familyBadgeText, { color: colors.primary }]}>
            🏠 {family?.name ?? ''}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {TILES.map(tile => {
          const tileColors = colors.tiles[tile.colorKey];
          const subtitle = getSubtitle(tile);
          return (
            <TouchableOpacity
              key={tile.screen}
              style={[
                styles.tile,
                {
                  backgroundColor: colors.surface,
                  shadowColor: isDark ? '#000' : '#aaa',
                },
              ]}
              onPress={() => navigation.navigate(tile.screen)}
              activeOpacity={0.8}
            >
              {/* Title at top-left */}
              <Text style={[styles.tileLabel, { color: colors.text }]}>
                {tile.label}
              </Text>

              {/* Subtitle directly below title, right-padded to clear the icon zone */}
              {subtitle ? (
                <Text
                  style={[
                    styles.tileSubtitle,
                    {
                      color: colors.textSecondary,
                      paddingRight: ICON_CLEARANCE,
                    },
                  ]}
                >
                  {subtitle}
                </Text>
              ) : null}

              {/* Icon absolutely pinned to bottom-right — never in text flow */}
              <View
                style={[styles.iconWrap, { backgroundColor: tileColors.bg }]}
              >
                <Text style={styles.emoji}>{tile.emoji}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: { fontSize: 14, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '700', marginTop: 2 },
  familyBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  familyBadgeText: { fontSize: 13, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP },
  tile: {
    width: TILE_SIZE,
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 14,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  tileLabel: { fontSize: 15, fontWeight: '700' },
  tileSubtitle: { fontSize: 11, marginTop: 4, lineHeight: 15 },
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
});
