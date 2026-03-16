import React, { useEffect, useRef } from 'react';
import Orientation from 'react-native-orientation-locker';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { RootStackParamList } from '../types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/Auth/LoginScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import { useAuthStore } from '../store/authStore';
import { useFamilyStore } from '../store/familyStore';
import { loadFamily, UserProfile } from '../services/familyService';
import { registerFCMToken, setupForegroundNotifications, bootstrapNotifications } from '../services/notificationService';
import { subscribeTileAccess } from '../services/tileAccessService';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  useEffect(() => {
    Orientation.lockToPortrait();
  }, []);

  const { user, initialising, setUser, setInitialising } = useAuthStore();
  const { family, loading: familyLoading, setFamily, setProfile, setTileAccess, setLoading } = useFamilyStore();
  const profileUnsubRef = useRef<(() => void) | null>(null);
  const foregroundUnsubRef = useRef<(() => void) | null>(null);
  const tileAccessUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async u => {
      // Tear down any previous profile listener
      profileUnsubRef.current?.();
      profileUnsubRef.current = null;

      setUser(u);
      if (u) {
        setLoading(true);
        try {
          // One-time fetch to get familyId for the family load
          const snap = await firestore().collection('users').doc(u.uid).get();
          const snapExists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
          const profile = snapExists ? ({ uid: u.uid, ...snap.data() } as UserProfile) : null;
          setProfile(profile);

          if (profile?.familyId) {
            const familyData = await loadFamily(profile.familyId);
            setFamily(familyData);
            tileAccessUnsubRef.current?.();
            tileAccessUnsubRef.current = subscribeTileAccess(profile.familyId, setTileAccess);
          }

          await bootstrapNotifications();
          await registerFCMToken();
          foregroundUnsubRef.current?.();
          foregroundUnsubRef.current = setupForegroundNotifications();
        } finally {
          setLoading(false);
          setInitialising(false);
        }

        // Real-time listener — keeps profile (including role) in sync
        profileUnsubRef.current = firestore()
          .collection('users')
          .doc(u.uid)
          .onSnapshot(snap => {
            const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
            if (exists) {
              setProfile({ uid: u.uid, ...snap.data() } as UserProfile);
            }
          });
      } else {
        foregroundUnsubRef.current?.();
        foregroundUnsubRef.current = null;
        tileAccessUnsubRef.current?.();
        tileAccessUnsubRef.current = null;
        useFamilyStore.getState().reset();
        setInitialising(false);
      }
    });
    return () => {
      unsubscribe();
      profileUnsubRef.current?.();
      foregroundUnsubRef.current?.();
      tileAccessUnsubRef.current?.();
    };
  }, []);

  if (initialising || familyLoading) {
    return <View style={{ flex: 1, backgroundColor: '#00C9A7' }} />;
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
