import 'react-native-reanimated';
import React, { useEffect } from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  useEffect(() => {
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <NavigationContainer theme={isDark ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
