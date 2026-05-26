import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { getHrefFromNotificationContent } from '@/services/pushNotifications.service';

let didConsumeInitialNotificationResponse = false;

function navigateFromNotification(
  router: ReturnType<typeof useRouter>,
  response: Notifications.NotificationResponse | null | undefined,
) {
  if (!response) return;
  const href = getHrefFromNotificationContent(response.notification.request.content);
  if (href) {
    router.push(href as any);
  }
}

/**
 * Opens the screen referenced by push `data.href` when the user taps a notification,
 * including when the app was opened from a cold start via that notification.
 */
export function useNotificationResponseRouting() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      navigateFromNotification(router, response);
    });

    if (!didConsumeInitialNotificationResponse) {
      didConsumeInitialNotificationResponse = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        navigateFromNotification(router, response);
      });
    }

    return () => sub.remove();
  }, [router]);
}
