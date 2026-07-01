import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../stores/useAuthStore';
import { registerPushToken } from '../api/push';

// Show notifications while the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function register(idToken: string): Promise<void> {
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted;
  }
  if (!granted) return; // permission is optional; degrade gracefully

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await registerPushToken(idToken, token, platform);
}

/**
 * Registers the device push token once signed in (FR11) and deep-links to the relevant
 * session when a notification is tapped. Permission is requested just-in-time and optional —
 * denial degrades gracefully (no pushes, no crash).
 */
export function usePushRegistration(): void {
  const idToken = useAuthStore((s) => s.idToken);
  const status = useAuthStore((s) => s.status);
  const router = useRouter();

  useEffect(() => {
    if (status === 'signedIn' && idToken) {
      void register(idToken).catch(() => {});
    }
  }, [status, idToken]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    });
    return () => sub.remove();
  }, [router]);
}
