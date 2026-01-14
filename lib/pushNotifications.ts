import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { AuthStatus } from '@/lib/authStatus';

let hasPromptedThisSession = false;

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
