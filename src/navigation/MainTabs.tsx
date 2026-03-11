import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {Text} from 'react-native';
import {MainTabParamList} from '../types';
import ShoppingScreen from '../screens/Shopping/ShoppingScreen';
import TodosScreen from '../screens/Todos/TodosScreen';
import ChoresScreen from '../screens/Chores/ChoresScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import MessagesScreen from '../screens/Messages/MessagesScreen';
import MoreStack from './MoreStack';

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, string> = {
  Shopping: '🛒',
  Todos: '✅',
  Chores: '🧹',
  Calendar: '📅',
  Messages: '💬',
  More: '☰',
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused}) => (
          <Text style={{fontSize: 22, opacity: focused ? 1 : 0.5}}>
            {icons[route.name]}
          </Text>
        ),
        tabBarActiveTintColor: '#4F6EF7',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
      })}>
      <Tab.Screen name="Shopping" component={ShoppingScreen} options={{title: 'Shopping'}} />
      <Tab.Screen name="Todos" component={TodosScreen} options={{title: 'To-Do'}} />
      <Tab.Screen name="Chores" component={ChoresScreen} options={{title: 'Chores'}} />
      <Tab.Screen name="Calendar" component={CalendarScreen} options={{title: 'Calendar'}} />
      <Tab.Screen name="Messages" component={MessagesScreen} options={{title: 'Messages'}} />
      <Tab.Screen name="More" component={MoreStack} options={{headerShown: false, title: 'More'}} />
    </Tab.Navigator>
  );
}
