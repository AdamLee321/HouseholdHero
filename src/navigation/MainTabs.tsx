import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import HomeStack from './HomeStack';
import SettingsStack from './SettingsStack';
import FloatingTabBar from './FloatingTabBar';
import { useBackgroundNotifications } from '../hooks/useBackgroundNotifications';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabs() {
  useBackgroundNotifications();
  return (
    <Tab.Navigator
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}
