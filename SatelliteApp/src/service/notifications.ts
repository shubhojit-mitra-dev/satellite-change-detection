import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Controls how notifications appear when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (error) {
  console.warn("Push notifications are not available in Expo Go SDK 53+", error);
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn('Push notifications only work on a physical device.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Push notification permission denied.');
      return null;
    }

    // Get the FCM token
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('FCM Token:', tokenData.data); // Copy this for testing
    return tokenData.data;
  } catch (error) {
    console.warn("Could not get push token - if using Expo Go, you must use a development build instead.", error);
    return null;
  }
}
