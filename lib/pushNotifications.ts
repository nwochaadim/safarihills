import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

import { AuthStatus } from '@/lib/authStatus';

let hasPromptedThisSession = false;
let lastHandledNotificationId: string | null = null;

type NotificationPayload = {
  path?: string;
  params?: Record<string, unknown>;
  message?: string | null;
};

type Router = ReturnType<typeof useRouter>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseNotificationPayload = (data: unknown): NotificationPayload | null => {
  if (!isRecord(data)) return null;

  const path = typeof data.path === 'string' ? data.path.trim() : '';
  const params = isRecord(data.params) ? data.params : undefined;
  const message = typeof data.message === 'string' ? data.message.trim() : '';

  return {
    path: path.length ? path : undefined,
    params,
    message: message.length ? message : null,
  };
};

const handleNotificationResponse = (
  response: Notifications.NotificationResponse,
  router: Router
) => {
  const notificationId = response.notification.request.identifier;
  if (notificationId && notificationId === lastHandledNotificationId) return;
  lastHandledNotificationId = notificationId ?? null;

  const payload = parseNotificationPayload(response.notification.request.content.data);
  if (!payload) return;

  if (payload.path && payload.params) {
    router.push({ pathname: payload.path, params: payload.params });
  }

  if (payload.message) {
    Alert.alert('Notification', payload.message);
  }
};

export const maybePromptForPushNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  const signedIn = await AuthStatus.isSignedIn();
  if (!signedIn) return;

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === 'granted') return;

  if (hasPromptedThisSession) return;
  hasPromptedThisSession = true;

  const primaryAction = permissions.canAskAgain
    ? {
        text: 'Enable',
        onPress: () => {
          void Notifications.requestPermissionsAsync();
        },
      }
    : {
        text: 'Open settings',
        onPress: () => {
          void Linking.openSettings();
        },
      };

  Alert.alert(
    'Enable notifications',
    'Turn on push notifications to stay updated on bookings and offers.',
    [{ text: 'Not now', style: 'cancel' }, primaryAction]
  );
};

export const usePushNotificationHandler = (): void => {
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response, router);
    });

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleNotificationResponse(response, router);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
};
