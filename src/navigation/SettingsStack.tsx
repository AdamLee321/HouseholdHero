import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import LucideIcon from '@react-native-vector-icons/lucide';
import { useTheme } from '../theme/useTheme';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import OrganiseTilesScreen from '../screens/Settings/OrganiseTilesScreen';
import AccountScreen from '../screens/Settings/AccountScreen';
import InviteScreen from '../screens/Settings/InviteScreen';

export type SettingsStackParamList = {
  SettingsHome: undefined;
  OrganiseTiles: undefined;
  Account: undefined;
  Invite: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

function SettingsBackButton() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 8 }}>
      <LucideIcon name="settings" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

export default function SettingsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        headerLeft: () => <SettingsBackButton />,
      }}
    >
      <Stack.Screen
        name="SettingsHome"
        component={SettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrganiseTiles"
        component={OrganiseTilesScreen}
        options={{ title: 'Organise Tiles' }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{ title: 'Account' }}
      />
      <Stack.Screen
        name="Invite"
        component={InviteScreen}
        options={{ title: 'Invite Members' }}
      />
    </Stack.Navigator>
  );
}
