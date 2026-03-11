import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {BottomTabBarProps} from '@react-navigation/bottom-tabs';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../theme/useTheme';
import {useTabBarStore} from '../store/tabBarStore';

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_BAR_WIDTH = 180;
const TAB_BAR_HEIGHT = 62;

const ICONS: Record<string, string> = {
  HomeTab: '🏠',
  Settings: '⚙️',
};

const LABELS: Record<string, string> = {
  HomeTab: 'Home',
  Settings: 'Settings',
};

export default function FloatingTabBar({state, navigation}: BottomTabBarProps) {
  const {colors, isDark} = useTheme();
  const insets = useSafeAreaInsets();
  const visible = useTabBarStore(s => s.visible);
  const bottomOffset = insets.bottom > 0 ? insets.bottom : 16;

  // Hide when navigated into a nested screen
  const activeRoute = state.routes[state.index];
  const nestedState = activeRoute?.state;
  const isNestedDeep =
    nestedState !== undefined &&
    nestedState.index !== undefined &&
    nestedState.index > 0;

  const shouldShow = visible && !isNestedDeep;

  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: shouldShow ? 0 : TAB_BAR_HEIGHT + bottomOffset + 20,
      useNativeDriver: true,
      tension: 80,
      friction: 14,
    }).start();
  }, [shouldShow, bottomOffset]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          left: (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2,
          width: TAB_BAR_WIDTH,
          height: TAB_BAR_HEIGHT,
          backgroundColor: colors.tabBar,
          shadowOpacity: isDark ? 0.5 : 0.12,
          transform: [{translateY}],
        },
      ]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;

        function onPress() {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}>
            <Text style={[styles.icon, {opacity: isFocused ? 1 : 0.4}]}>
              {ICONS[route.name]}
            </Text>
            <Text style={[styles.label, {color: isFocused ? colors.primary : colors.textTertiary}]}>
              {LABELS[route.name]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flexDirection: 'row',
    borderRadius: TAB_BAR_HEIGHT / 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowRadius: 16,
    elevation: 12,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: {fontSize: 22, lineHeight: 26},
  label: {fontSize: 11, fontWeight: '600'},
});
