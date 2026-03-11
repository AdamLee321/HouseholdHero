import {useColorScheme} from 'react-native';
import {lightColors, darkColors, AppColors} from './colors';

export function useTheme(): {colors: AppColors; isDark: boolean} {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {colors: isDark ? darkColors : lightColors, isDark};
}
