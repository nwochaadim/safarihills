import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect } from 'react';
import { Alert, Linking, Platform } from 'react-native';

import { apolloClient } from '@/lib/apolloClient';
import { AuthStatus } from '@/lib/authStatus';
import { ADD_DEVICE } from '@/mutations/addDevice';

let hasPromptedThisSession = false;
let lastHandledNotificationId: string | null = null;
let registrationInFlight = false;
let promptInFlight = false;

const PUSH_NOTIFICATIONS_REGISTERED_KEY = 'pushNotificationsRegistered';
const PUSH_NOTIFICATIONS_TOKEN_KEY = 'pushNotificationsToken';

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

const hasRegisteredPushNotifications = async (): Promise<boolean> => {
  const registered = await SecureStore.getItemAsync(PUSH_NOTIFICATIONS_REGISTERED_KEY);
  return registered === 'true';
};

const setRegisteredPushNotifications = async (token: string): Promise<void> => {
  await Promise.all([
    SecureStore.setItemAsync(PUSH_NOTIFICATIONS_REGISTERED_KEY, 'true'),
    SecureStore.setItemAsync(PUSH_NOTIFICATIONS_TOKEN_KEY, token),
  ]);
};

const getExpoPushToken = async (): Promise<string | null> => {
  const projectId =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const token = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();
  return token?.data ?? null;
};

const registerDeviceWithBackend = async (): Promise<void> => {
  if (registrationInFlight) return;
  registrationInFlight = true;
  try {
    if (await hasRegisteredPushNotifications()) return;

    const pushToken = await getExpoPushToken();
    if (!pushToken) return;

    const { data } = await apolloClient.mutate({
      mutation: ADD_DEVICE,
      variables: {
        pushToken,
        brand: Device.brand ?? undefined,
        manufacturer: Device.manufacturer ?? undefined,
        model: Device.modelName ?? undefined,
        osName: Device.osName ?? undefined,
        osVersion: Device.osVersion ?? undefined,
        deviceType: Device.deviceType ?? undefined,
      },
    });

    if (data?.addDevice?.id) {
      await setRegisteredPushNotifications(pushToken);
    }
  } catch {
    // Swallow registration errors; we'll retry on the next app open.
  } finally {
    registrationInFlight = false;
  }
};

const requestAndRegisterPushNotifications = async (): Promise<void> => {
  const permissions = await Notifications.requestPermissionsAsync();
  if (permissions.status === 'granted') {
    await registerDeviceWithBackend();
  }
};

export const maybePromptForPushNotifications = async (): Promise<void> => {
  if (Platform.OS === 'web') return;

  const signedIn = await AuthStatus.isSignedIn();
  if (!signedIn) return;

  const permissions = await Notifications.getPermissionsAsync();
  if (permissions.status === 'granted') {
    await registerDeviceWithBackend();
    return;
  }

  if (hasPromptedThisSession || promptInFlight) return;
  promptInFlight = true;
  hasPromptedThisSession = true;

  const primaryAction = permissions.canAskAgain
    ? {
        text: 'Enable',
        onPress: () => {
          void requestAndRegisterPushNotifications();
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
  promptInFlight = false;
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
