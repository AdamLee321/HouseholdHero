import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import OcticonIcon from '@react-native-vector-icons/octicons';
import { MoreStackParamList } from '../types';
import MoreScreen from '../screens/More/MoreScreen';
import ContactsScreen from '../screens/Contacts/ContactsScreen';
import LocationScreen from '../screens/Location/LocationScreen';
import DocumentsScreen from '../screens/Documents/DocumentsScreen';
import { useTheme } from '../theme/useTheme';

const Stack = createNativeStackNavigator<MoreStackParamList>();

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

export default function MoreStack() {
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
        name="MoreHome"
        component={MoreScreen}
        options={{ title: 'More', headerLeft: undefined }}
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
    </Stack.Navigator>
  );
}
