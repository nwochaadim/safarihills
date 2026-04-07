import { NativeModules, Platform } from 'react-native';

import { getAnalyticsScreenMetadata } from '@/lib/analytics.common';

type AnalyticsFactory = typeof import('@react-native-firebase/analytics').default;
type AnalyticsInstance = ReturnType<AnalyticsFactory>;

let initializationPromise: Promise<void> | null = null;
let analyticsFactoryPromise: Promise<AnalyticsFactory | null> | null = null;
let hasLoggedUnavailableWarning = false;

const hasNativeAnalyticsModules = () =>
  Platform.OS !== 'web' &&
  NativeModules.RNFBAppModule != null &&
  NativeModules.RNFBAnalyticsModule != null;

const logUnavailableWarning = () => {
  if (hasLoggedUnavailableWarning) {
    return;
  }

  hasLoggedUnavailableWarning = true;
  console.warn(
    'Firebase Analytics native modules are not available in this build. Use an Expo development build or EAS build that includes React Native Firebase.',
  );
};

const loadAnalyticsFactory = async () => {
  if (!hasNativeAnalyticsModules()) {
    logUnavailableWarning();
    return null;
  }

  if (!analyticsFactoryPromise) {
    analyticsFactoryPromise = (async () => {
      try {
        const module = await import('@react-native-firebase/analytics');
        return module.default as AnalyticsFactory;
      } catch (error) {
        console.warn('Failed to load Firebase Analytics.', error);
        return null;
      }
    })();
  }

  return analyticsFactoryPromise;
};

const getAnalyticsInstance = async (): Promise<AnalyticsInstance | null> => {
  const analyticsFactory = await loadAnalyticsFactory();
  return analyticsFactory ? analyticsFactory() : null;
};

export const initializeAnalytics = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const analytics = await getAnalyticsInstance();

      if (!analytics) {
        return;
      }

      try {
        await analytics.setAnalyticsCollectionEnabled(true);
        await analytics.logEvent('analytics_ready', { platform: Platform.OS });
      } catch (error) {
        console.warn('Failed to initialize Firebase Analytics.', error);
      }
    })();
  }

  return initializationPromise;
};

export const trackScreenView = async (pathname: string) => {
  const analytics = await getAnalyticsInstance();

  if (!analytics) {
    return;
  }

  const { screenClass, screenName } = getAnalyticsScreenMetadata(pathname);

  await analytics.logScreenView({
    screen_class: screenClass,
    screen_name: screenName,
  });
};
