import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {HomeStackParamList} from '../../types';
import {useTheme} from '../../theme/useTheme';
import {useFamilyStore} from '../../store/familyStore';

type HomeNavProp = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const {width} = Dimensions.get('window');
const TILE_GAP = 12;
const TILE_SIZE = (width - 32 - TILE_GAP) / 2;

interface Tile {
  label: string;
  emoji: string;
  screen: keyof Omit<HomeStackParamList, 'Home'>;
  colorKey: keyof ReturnType<typeof useTheme>['colors']['tiles'];
}

const TILES: Tile[] = [
  {label: 'Shopping', emoji: '🛒', screen: 'Shopping', colorKey: 'shopping'},
  {label: 'To-Do Lists', emoji: '✅', screen: 'Todos', colorKey: 'todos'},
  {label: 'Chores', emoji: '🧹', screen: 'Chores', colorKey: 'chores'},
  {label: 'Calendar', emoji: '📅', screen: 'Calendar', colorKey: 'calendar'},
  {label: 'Messages', emoji: '💬', screen: 'Messages', colorKey: 'messages'},
  {label: 'Contacts', emoji: '🚨', screen: 'Contacts', colorKey: 'contacts'},
  {label: 'Location', emoji: '📍', screen: 'Location', colorKey: 'location'},
  {label: 'Documents', emoji: '📄', screen: 'Documents', colorKey: 'documents'},
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNavProp>();
  const {colors, isDark} = useTheme();
  const {family, profile} = useFamilyStore();

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: colors.background}]}
      contentContainerStyle={styles.content}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, {color: colors.textSecondary}]}>
            Welcome back,
          </Text>
          <Text style={[styles.name, {color: colors.text}]}>
            {profile?.displayName ?? 'there'} 👋
          </Text>
        </View>
        <View style={[styles.familyBadge, {backgroundColor: colors.primaryLight}]}>
          <Text style={[styles.familyBadgeText, {color: colors.primary}]}>
            🏠 {family?.name ?? ''}
          </Text>
        </View>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {TILES.map(tile => {
          const tileColors = colors.tiles[tile.colorKey];
          return (
            <TouchableOpacity
              key={tile.screen}
              style={[
                styles.tile,
                {
                  backgroundColor: colors.surface,
                  shadowColor: isDark ? '#000' : '#888',
                },
              ]}
              onPress={() => navigation.navigate(tile.screen)}
              activeOpacity={0.75}>
              <View style={[styles.iconWrap, {backgroundColor: tileColors.bg}]}>
                <Text style={styles.emoji}>{tile.emoji}</Text>
              </View>
              <Text style={[styles.tileLabel, {color: colors.text}]}>
                {tile.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  greeting: {fontSize: 14, fontWeight: '500'},
  name: {fontSize: 24, fontWeight: '700', marginTop: 2},
  familyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  familyBadgeText: {fontSize: 13, fontWeight: '600'},
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  tile: {
    width: TILE_SIZE,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emoji: {fontSize: 26},
  tileLabel: {fontSize: 15, fontWeight: '600'},
});
