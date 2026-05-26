import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { API_URL } from '@/constants/api';

function getEasProjectId(): string | undefined {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromConfig = extra?.eas?.projectId;
  return typeof fromConfig === 'string' && fromConfig.trim().length > 0
    ? fromConfig.trim()
    : undefined;
}

/** Call once at app startup so foreground pushes show an alert (iOS) / heads-up (Android). */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function getHrefFromNotificationContent(
  content: Notifications.NotificationContent,
): string | null {
  const data = content.data as Record<string, unknown> | undefined;
  const href = data?.href;
  if (typeof href === 'string' && href.length > 0) {
    return href;
  }
  const postId = data?.postId;
  if (typeof postId === 'string' && postId.length > 0) {
    const commentId = data?.commentId;
    if (typeof commentId === 'string' && commentId.length > 0) {
      return `/post/${postId}?focusCommentId=${encodeURIComponent(commentId)}`;
    }
    return `/post/${postId}`;
  }
  return null;
}

export type RegisterPushResult =
  | { ok: true; token: string }
  | { ok: false; reason: 'not-device' | 'permission-denied' | 'api-url-missing' | 'network'; error?: unknown };

  async function getBestPushToken(): Promise<string> {
    const projectId = getEasProjectId();
  
    if (!projectId) {
      throw new Error(
        'Missing EAS project ID. Run `eas init` and rebuild the app.',
      );
    }
  
    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
  
    return data;
  }
  

export async function registerDevicePushToken(params: {
  authToken: string;
}): Promise<RegisterPushResult> {
  if (!Device.isDevice) {
    return { ok: false, reason: 'not-device' };
  }

  if (!API_URL) {
    return { ok: false, reason: 'api-url-missing' };
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    granted =
      requested.granted ||
      requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  }

  if (!granted) {
    return { ok: false, reason: 'permission-denied' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const token = await getBestPushToken();

  try {
    const res = await fetch(`${API_URL}/notifications/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
      }),
    });

    if (!res.ok) {
      return { ok: false, reason: 'network' };
    }

    return { ok: true, token };
  } catch (error) {
    return { ok: false, reason: 'network', error };
  }
}

export async function clearDevicePushToken(params: {
  authToken: string;
}): Promise<void> {
  if (!API_URL) return;

  try {
    await fetch(`${API_URL}/notifications/token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: '',
      }),
    });
  } catch {
    // Best-effort cleanup on logout.
  }
}

