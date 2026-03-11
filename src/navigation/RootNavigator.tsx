import React, {useEffect} from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import {RootStackParamList} from '../types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/Auth/LoginScreen';
import {useAuthStore} from '../store/authStore';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const {user, initialising, setUser, setInitialising} = useAuthStore();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(u => {
      setUser(u);
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
    <Stack.Navigator screenOptions={{headerShown: false}}>
      {user ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}
