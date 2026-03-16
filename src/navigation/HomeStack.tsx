import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import OcticonIcon from '@react-native-vector-icons/octicons';
import { useTheme } from '../theme/useTheme';
import { HomeStackParamList } from '../types';
import HomeScreen from '../screens/Home/HomeScreen';
import ShoppingScreen from '../screens/Shopping/ShoppingScreen';
import ShoppingListScreen from '../screens/Shopping/ShoppingListScreen';
import ManageCategoriesScreen from '../screens/Shopping/ManageCategoriesScreen';
import TodosScreen from '../screens/Todos/TodosScreen';
import TodoListScreen from '../screens/Todos/TodoListScreen';
import ChoresScreen from '../screens/Chores/ChoresScreen';
import CalendarScreen from '../screens/Calendar/CalendarScreen';
import ChatsScreen from '../screens/Messages/ChatsScreen';
import ChatScreen from '../screens/Messages/ChatScreen';
import ContactsScreen from '../screens/Contacts/ContactsScreen';
import LocationScreen from '../screens/Location/LocationScreen';
import DocumentsScreen from '../screens/Documents/DocumentsScreen';
import MyFamilyScreen from '../screens/MyFamily/MyFamilyScreen';
import BudgetScreen from '../screens/Budget/BudgetScreen';
import FolderScreen from '../screens/Documents/FolderScreen';
import GalleryScreen from '../screens/Gallery/GalleryScreen';
import GalleryGroupScreen from '../screens/Gallery/GalleryGroupScreen';
import RecipesScreen from '../screens/Recipes/RecipesScreen';
import ActivityFeedScreen from '../screens/Home/ActivityFeedScreen';
import MealPlannerScreen from '../screens/MealPlanner/MealPlannerScreen';
import TimetableScreen from '../screens/Timetable/TimetableScreen';
import SpecialDaysScreen from '../screens/SpecialDays/SpecialDaysScreen';

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
        options={{ title: 'Shopping Lists' }}
      />
      <Stack.Screen
        name="ShoppingList"
        component={ShoppingListScreen}
        options={({ route }) => ({
          title: route.params.listName,
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="ManageCategories"
        component={ManageCategoriesScreen}
        options={{ title: 'Manage Categories', headerLeft: undefined }}
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
        component={ChatsScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: '' }}
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
        name="FolderScreen"
        component={FolderScreen}
        options={({ route }) => ({
          title: `${route.params.folderEmoji}  ${route.params.folderName}`,
          headerLeft: undefined, // use native back arrow instead of home icon
        })}
      />
      <Stack.Screen
        name="Gallery"
        component={GalleryScreen}
        options={{ title: 'Gallery' }}
      />
      <Stack.Screen
        name="GalleryGroup"
        component={GalleryGroupScreen}
        options={({ route }) => ({
          title: route.params.groupName,
          headerLeft: undefined,
        })}
      />
      <Stack.Screen
        name="Recipes"
        component={RecipesScreen}
        options={{ title: 'Recipes' }}
      />
      <Stack.Screen
        name="Activity"
        component={ActivityFeedScreen}
        options={{ title: 'Family Activity' }}
      />
      <Stack.Screen
        name="MealPlanner"
        component={MealPlannerScreen}
        options={{ title: 'Meal Planner' }}
      />
      <Stack.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{ title: 'Timetable' }}
      />
      <Stack.Screen
        name="SpecialDays"
        component={SpecialDaysScreen}
        options={{ title: 'Special Days' }}
      />
    </Stack.Navigator>
  );
}
