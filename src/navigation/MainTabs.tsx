import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTheme} from '../theme/useTheme';
import {MainTabParamList} from '../types';
import HomeStack from './HomeStack';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  const {colors} = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: 'Home',
          tabBarIcon: ({focused}) => (
            <Text style={{fontSize: 22, opacity: focused ? 1 : 0.5}}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerShown: true,
          headerStyle: {backgroundColor: colors.surface},
          headerTitleStyle: {color: colors.text, fontWeight: '700'},
          headerShadowVisible: false,
          tabBarIcon: ({focused}) => (
            <Text style={{fontSize: 22, opacity: focused ? 1 : 0.5}}>⚙️</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
