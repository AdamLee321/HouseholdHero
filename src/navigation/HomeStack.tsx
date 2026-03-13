import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import OcticonIcon from '@react-native-vector-icons/octicons';
import { useTheme } from '../theme/useTheme';
import { HomeStackParamList } from '../types';
import HomeScreen from '../screens/Home/HomeScreen';
import ShoppingScreen from '../screens/Shopping/ShoppingScreen';
import TodosScreen from '../screens/Todos/TodosScreen';
import TodoListScreen from '../screens/Todos/TodoListScreen';
import ChoresScreen from '../screens/Chores/ChoresScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import MessagesScreen from '../screens/Messages/MessagesScreen';
import ContactsScreen from '../screens/Contacts/ContactsScreen';
import LocationScreen from '../screens/Location/LocationScreen';
import DocumentsScreen from '../screens/Documents/DocumentsScreen';
import MyFamilyScreen from '../screens/MyFamily/MyFamilyScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import GalleryScreen from '../screens/Gallery/GalleryScreen';
import RecipesScreen from '../screens/Recipes/RecipesScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeBackButton() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      style={{ paddingRight: 8 }}
    >
      <OcticonIcon name="home-fill" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

export default function HomeStack() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        headerLeft: () => <HomeBackButton />,
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
        name="TodoList"
        component={TodoListScreen}
        options={({ route }) => ({ title: route.params.title })}
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
        options={{ title: 'Map' }}
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
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ title: 'Budget' }}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ title: 'Gallery' }}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{ title: 'Recipes' }}
      />
    </Stack.Navigator>
  );
}
