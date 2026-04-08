import { ApolloProvider } from '@apollo/client';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '../global.css';

import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ActivityFeedManager } from '@/components/ActivityFeedManager';
import { apolloClient } from '@/lib/apolloClient';
import { maybePromptForPushNotifications, usePushNotificationHandler } from '@/lib/pushNotifications';
import { hydrateWishlistStore } from '@/lib/wishlistStore';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  usePushNotificationHandler();

  useEffect(() => {
    void maybePromptForPushNotifications();
    void hydrateWishlistStore();
  }, []);

  return (
    <ApolloProvider client={apolloClient}>
      <SafeAreaProvider>
        <AnalyticsProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <ActivityFeedManager />
            <StatusBar style="auto" />
          </ThemeProvider>
        </AnalyticsProvider>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
