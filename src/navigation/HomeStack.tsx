import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/useTheme';
import { HomeStackParamList } from '../types';
import HomeScreen from '../screens/Home/HomeScreen';
import ShoppingScreen from '../screens/Shopping/ShoppingScreen';
import TodosScreen from '../screens/Todos/TodosScreen';
import ChoresScreen from '../screens/Chores/ChoresScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import MessagesScreen from '../screens/Messages/MessagesScreen';
import ContactsScreen from '../screens/Contacts/ContactsScreen';
import LocationScreen from '../screens/Location/LocationScreen';
import DocumentsScreen from '../screens/Documents/DocumentsScreen';
import MyFamilyScreen from '../screens/MyFamily/MyFamilyScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Shopping"
        component={ShoppingScreen}
        options={{ title: 'Shopping List' }}
      />
      <Stack.Screen
        name="Todos"
        component={TodosScreen}
        options={{ title: 'To-Do Lists' }}
      />
      <Stack.Screen
        name="Chores"
        component={ChoresScreen}
        options={{ title: 'Chores' }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ title: 'Calendar' }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ title: 'Emergency Contacts' }}
      />
      <Stack.Screen
        name="Location"
        component={LocationScreen}
        options={{ title: 'Live Location' }}
      />
      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
      <Stack.Screen
        name="MyFamily"
        component={MyFamilyScreen}
        options={{ title: 'My Family' }}
      />
    </Stack.Navigator>
  );
}
