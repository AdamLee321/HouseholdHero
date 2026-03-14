import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform, PermissionsAndroid } from 'react-native';
import notifee, { AndroidImportance } from '@notifee/react-native';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  return true; // Android < 13 grants automatically
}

export async function registerFCMToken(): Promise<void> {
  const uid = auth().currentUser?.uid;
  if (!uid) { return; }

  try {
    const granted = await requestNotificationPermission();
    if (!granted) { return; }

    await messaging().registerDeviceForRemoteMessages();
    const token = await messaging().getToken();
    await saveFCMToken(uid, token);

    // Refresh token if it rotates
    messaging().onTokenRefresh(newToken => saveFCMToken(uid, newToken));
  } catch (e) {
    console.warn('FCM registration failed:', e);
  }
}

export async function bootstrapNotifications(): Promise<void> {
  await notifee.createChannel({
    id: 'default',
    name: 'General',
    importance: AndroidImportance.HIGH,
  });
}

export function setupForegroundNotifications(): () => void {
  return messaging().onMessage(async remoteMessage => {
    const title = remoteMessage.notification?.title ?? (remoteMessage.data?.title as string | undefined);
    const body = remoteMessage.notification?.body ?? (remoteMessage.data?.body as string | undefined);
    if (!title && !body) { return; }

    try {
      await notifee.displayNotification({
        title,
        body,
        android: { channelId: 'default', pressAction: { id: 'default' } },
        ios: { sound: 'default' },
      });
    } catch (e) {
      console.warn('Notifee foreground display failed:', e);
    }
  });
}

async function saveFCMToken(uid: string, token: string): Promise<void> {
  await firestore().collection('users').doc(uid).update({ fcmToken: token });
}
