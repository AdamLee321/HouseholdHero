import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { useAuthStore } from './src/store/authStore';
import { useFamilyStore } from './src/store/familyStore';
import { useTheme } from './src/theme/useTheme';

export default function App() {
  const { isDark } = useTheme();
  const initialising = useAuthStore(s => s.initialising);
  const familyLoading = useFamilyStore(s => s.loading);

  useEffect(() => {
    if (!initialising && !familyLoading) {
      BootSplash.hide({ fade: true });
    }
  }, [initialising, familyLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={isDark ? '#000000' : '#F2F2F7'}
        />
        <NavigationContainer ref={navigationRef} theme={isDark ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
