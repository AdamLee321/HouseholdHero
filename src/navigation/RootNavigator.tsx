import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import { RootStackParamList } from '../types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/Auth/LoginScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { useAuthStore } from '../store/authStore';
import { useFamilyStore } from '../store/familyStore';
import { loadUserProfile, loadFamily } from '../services/familyService';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, initialising, setUser, setInitialising } = useAuthStore();
  const { family, setFamily, setProfile, setLoading } = useFamilyStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async u => {
      setUser(u);
      if (u) {
        // Load family data when user signs in
        setLoading(true);
        try {
          const profile = await loadUserProfile();
          setProfile(profile);
          if (profile?.familyId) {
            const familyData = await loadFamily(profile.familyId);
            setFamily(familyData);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Clear family data on sign out
        useFamilyStore.getState().reset();
      }
      if (initialising) {
        setInitialising(false);
      }
    });
    return unsubscribe;
  }, []);

  if (initialising) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth" component={LoginScreen} />
      ) : !family ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
