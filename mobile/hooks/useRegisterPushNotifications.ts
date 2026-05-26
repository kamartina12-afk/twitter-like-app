import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { registerDevicePushToken } from '@/services/pushNotifications.service';

export function useRegisterPushNotifications() {
  const { user, isAuthenticated } = useAuth();
  const registeredForUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!user) {
      registeredForUserIdRef.current = undefined;
      return;
    }

    if (!isAuthenticated) return;
    if (registeredForUserIdRef.current === user.uid) return;

    let cancelled = false;

    (async () => {
      try {
        const authToken = await user.getIdToken();
        if (cancelled) return;
        const result = await registerDevicePushToken({ authToken });
        if (!cancelled && result.ok) {
          registeredForUserIdRef.current = user.uid;
        }
      } catch {
        // Will retry when this effect runs again (e.g. after auth state change).
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user]);
}

