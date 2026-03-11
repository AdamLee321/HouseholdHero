export const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceSecondary: '#F2F2F7',
  primary: '#4F6EF7',
  primaryLight: '#EEF1FE',
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#ABABAB',
  border: '#E5E5EA',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E5EA',
  danger: '#FF3B30',
  success: '#34C759',

  // Feature tile accent colours
  tiles: {
    shopping: { bg: '#EEF1FE', icon: '#4F6EF7' },
    todos: { bg: '#E8F8EE', icon: '#34C759' },
    chores: { bg: '#FEF3E8', icon: '#FF9500' },
    calendar: { bg: '#F2EEFE', icon: '#AF52DE' },
    messages: { bg: '#E8F8F8', icon: '#00C7BE' },
    contacts: { bg: '#FEE8E8', icon: '#FF3B30' },
    location: { bg: '#E8EEFE', icon: '#5856D6' },
    documents: { bg: '#FEFBE8', icon: '#FFCC00' },
    family: { bg: '#E8F8F8', icon: '#00C7BE' },
  },
};

export const darkColors: typeof lightColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceSecondary: '#2C2C2E',
  primary: '#6B8AFF',
  primaryLight: '#1A2040',
  text: '#FFFFFF',
  textSecondary: '#ABABAB',
  textTertiary: '#636366',
  border: '#38383A',
  tabBar: '#1C1C1E',
  tabBarBorder: '#38383A',
  danger: '#FF453A',
  success: '#32D74B',

  tiles: {
    shopping: { bg: '#1A2040', icon: '#6B8AFF' },
    todos: { bg: '#0D2B17', icon: '#32D74B' },
    chores: { bg: '#2B1D00', icon: '#FF9F0A' },
    calendar: { bg: '#200D2B', icon: '#BF5AF2' },
    messages: { bg: '#0D2B2B', icon: '#5AC8FA' },
    contacts: { bg: '#2B0D0D', icon: '#FF453A' },
    location: { bg: '#0D0D2B', icon: '#6E6CF0' },
    documents: { bg: '#2B2700', icon: '#FFD60A' },
    family: { bg: '#0D2B2B', icon: '#5AC8FA' },
  },
};

export type AppColors = typeof lightColors;
