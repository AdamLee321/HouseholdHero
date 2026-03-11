import {useColorScheme} from 'react-native';
import {lightColors, darkColors, AppColors} from './colors';
import {useThemeStore} from '../store/themeStore';

export function useTheme(): {colors: AppColors; isDark: boolean} {
  const systemScheme = useColorScheme();
  const {preference} = useThemeStore();

  const isDark =
    preference === 'dark' ||
    (preference === 'system' && systemScheme === 'dark');

  return {colors: isDark ? darkColors : lightColors, isDark};
}
