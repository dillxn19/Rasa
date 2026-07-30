import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { updatePushToken } from '@/services/users';

/**
 * Expo push-notification registration. Mirrors the analytics.ts philosophy:
 * completely defensive — never throws into a user flow. A missing EAS projectId,
 * a denied permission, or running on a simulator all no-op quietly.
 *
 * Requires a DEV/PRODUCTION build — push tokens are NOT available in Expo Go
 * or on simulators (getExpoPushTokenAsync throws there → we swallow it).
 */

// Foreground presentation: show a banner + list entry, no sound by default.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function easProjectId(): string | undefined {
  // Populated once the project is EAS-linked (eas init / build).
  const fromExtra = (Constants.expoConfig as any)?.extra?.eas?.projectId;
  const fromEas = (Constants as any)?.easConfig?.projectId;
  return fromExtra ?? fromEas;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#D94841',
  });
}

/**
 * Ask for permission (if not already decided), fetch the Expo push token, and
 * persist it against the user. Safe to call on every sign-in — it's idempotent
 * and cheap. Returns the token, or null if unavailable/denied.
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return null;

    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') return null;

    const projectId = easProjectId();
    // Before the project is EAS-linked, a token can't be minted — skip quietly.
    if (!projectId) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (token) {
      await updatePushToken(userId, token).catch(() => {});
    }
    return token ?? null;
  } catch {
    // Simulator / Expo Go / no network / permission race — never break the app.
    return null;
  }
}
