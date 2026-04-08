import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getAnalyticsScreenMetadata } from '@/lib/analytics.common';
import {
  ANALYTICS_EVENTS,
  AnalyticsActorType,
  AnalyticsAuthState,
  AnalyticsContextParams,
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsLeadTemperature,
  AnalyticsUserProperties,
  getLeadTemperatureForEvent,
} from '@/lib/analytics.schema';

type AnalyticsFactory = typeof import('@react-native-firebase/analytics').default;
type AnalyticsInstance = ReturnType<AnalyticsFactory>;

type AnalyticsIdentityState = AnalyticsContextParams & {
  leadTemperature: AnalyticsLeadTemperature;
  userTier?: string;
  initializedAt: number;
};

type AnalyticsContextListener = (
  context: (AnalyticsContextParams & { lead_temperature: AnalyticsLeadTemperature }) | null
) => void;

type AuthCompletionOptions = {
  eventName: 'login' | 'sign_up';
  method: string;
  sourceScreen?: string;
  sourceSurface?: string;
};

const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? 'http://localhost:3000/graphql';
const ANALYTICS_GUEST_ID_KEY = 'analytics_guest_actor_id';
const ANALYTICS_SESSION_ID_KEY = 'analytics_session_id';
const ANALYTICS_USER_ID_KEY = 'analytics_authenticated_user_id';
const ANALYTICS_PROFILE_QUERY = `
  query AnalyticsIdentityUser {
    user {
      id
      tier
    }
  }
`;

let initializationPromise: Promise<AnalyticsIdentityState> | null = null;
let analyticsFactoryPromise: Promise<AnalyticsFactory | null> | null = null;
let currentContext: AnalyticsIdentityState | null = null;
let hasLoggedUnavailableWarning = false;
let eventChain: Promise<void> = Promise.resolve();
let lastUserProperties: Partial<AnalyticsUserProperties> = {};
const contextListeners = new Set<AnalyticsContextListener>();

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
  if (Platform.OS === 'web') {
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
  if (!analyticsFactory) {
    return null;
  }

  try {
    return analyticsFactory();
  } catch (error) {
    logUnavailableWarning();
    console.warn(
      'Firebase Analytics was imported but the native bridge is unavailable. Rebuild the development client or native app after native dependency changes.',
      error
    );
    return null;
  }
};

const enqueueAnalyticsTask = async <T>(task: () => Promise<T>): Promise<T> => {
  const nextTask = eventChain.then(task, task);
  eventChain = nextTask.then(
    () => undefined,
    () => undefined
  );
  return nextTask;
};

const buildSessionId = () =>
  `session_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const buildGuestActorId = (sessionId: string) => `guest_${sessionId}`;

const compareLeadTemperature = (
  left: AnalyticsLeadTemperature,
  right: AnalyticsLeadTemperature
) => {
  const order: AnalyticsLeadTemperature[] = ['cold', 'warm', 'hot'];
  return order.indexOf(left) - order.indexOf(right);
};

const emitContext = () => {
  const nextContext = currentContext
    ? {
        actor_type: currentContext.actor_type,
        analytics_actor_id: currentContext.analytics_actor_id,
        auth_state: currentContext.auth_state,
        session_id: currentContext.session_id,
        lead_temperature: currentContext.leadTemperature,
      }
    : null;

  contextListeners.forEach((listener) => listener(nextContext));
};

const sanitizeString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed.slice(0, 100) : undefined;
};

const sanitizeArrayValue = (value: unknown[]) =>
  value
    .map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return null;
      }

      const cleanedEntry = Object.entries(entry as Record<string, unknown>).reduce<
        Record<string, string | number>
      >((acc, [key, nestedValue]) => {
        if (typeof nestedValue === 'number' && Number.isFinite(nestedValue)) {
          acc[key] = nestedValue;
        } else if (typeof nestedValue === 'string') {
          const cleaned = sanitizeString(nestedValue);
          if (cleaned) {
            acc[key] = cleaned;
          }
        }
        return acc;
      }, {});

      return Object.keys(cleanedEntry).length ? cleanedEntry : null;
    })
    .filter((entry): entry is Record<string, string | number> => Boolean(entry))
    .slice(0, 10);

const sanitizeAnalyticsParams = (params: Record<string, unknown>) =>
  Object.entries(params).reduce<Record<string, string | number | Record<string, string | number>[]>>(
    (acc, [key, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        acc[key] = value;
        return acc;
      }

      if (typeof value === 'string') {
        const cleaned = sanitizeString(value);
        if (cleaned) {
          acc[key] = cleaned;
        }
        return acc;
      }

      if (Array.isArray(value)) {
        const cleanedArray = sanitizeArrayValue(value);
        if (cleanedArray.length > 0) {
          acc[key] = cleanedArray;
        }
      }

      return acc;
    },
    {}
  );

const setFirebaseUserId = async (userId: string | null) => {
  const analytics = await getAnalyticsInstance();

  if (!analytics) {
    return;
  }

  try {
    await analytics.setUserId(userId);
  } catch (error) {
    console.warn('Failed to set Firebase Analytics user ID.', error);
  }
};

const setFirebaseUserProperties = async (properties: AnalyticsUserProperties) => {
  const analytics = await getAnalyticsInstance();

  if (!analytics) {
    return;
  }

  const nextProperties = Object.entries(properties).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (!value) {
        return acc;
      }

      acc[key] = String(value);
      return acc;
    },
    {}
  );

  if (Object.keys(nextProperties).length === 0) {
    return;
  }

  try {
    await analytics.setUserProperties(nextProperties);
  } catch (error) {
    console.warn('Failed to set Firebase Analytics user properties.', error);
  }
};

const syncIdentityProperties = async (context: AnalyticsIdentityState) => {
  const nextProperties: AnalyticsUserProperties = {
    actor_type: context.actor_type,
    auth_state: context.auth_state,
    lead_temperature: context.leadTemperature,
    user_tier: context.userTier,
  };

  const changedProperties = Object.entries(nextProperties).reduce<AnalyticsUserProperties>(
    (acc, [key, value]) => {
      const typedKey = key as keyof AnalyticsUserProperties;
      if (!value || lastUserProperties[typedKey] === value) {
        return acc;
      }

      acc[typedKey] = value as never;
      return acc;
    },
    {}
  );

  if (Object.keys(changedProperties).length === 0) {
    return;
  }

  lastUserProperties = { ...lastUserProperties, ...changedProperties };
  await setFirebaseUserProperties(changedProperties);
};

const persistGuestIdentity = async (sessionId: string, guestActorId: string) => {
  await Promise.all([
    SecureStore.setItemAsync(ANALYTICS_SESSION_ID_KEY, sessionId),
    SecureStore.setItemAsync(ANALYTICS_GUEST_ID_KEY, guestActorId),
  ]);
};

const persistAuthenticatedUserId = async (userId: string) => {
  await SecureStore.setItemAsync(ANALYTICS_USER_ID_KEY, userId);
};

const getStoredAuthenticatedUserId = async () =>
  SecureStore.getItemAsync(ANALYTICS_USER_ID_KEY);

const fetchAuthenticatedUserProfile = async () => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      return null;
    }

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: ANALYTICS_PROFILE_QUERY,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      data?: {
        user?: {
          id?: string | null;
          tier?: string | null;
        } | null;
      };
    };
    const userId = payload?.data?.user?.id?.trim();

    if (!userId) {
      return null;
    }

    return {
      userId,
      userTier: payload?.data?.user?.tier?.trim() || undefined,
    };
  } catch {
    return null;
  }
};

const promoteLeadTemperature = async (eventName: AnalyticsEventName) => {
  if (!currentContext) {
    return;
  }

  const nextTemperature = getLeadTemperatureForEvent(eventName);
  if (!nextTemperature) {
    return;
  }

  if (compareLeadTemperature(nextTemperature, currentContext.leadTemperature) <= 0) {
    return;
  }

  currentContext = {
    ...currentContext,
    leadTemperature: nextTemperature,
  };

  emitContext();
  await syncIdentityProperties(currentContext);
};

const applyIdentityToFirebase = async (context: AnalyticsIdentityState) => {
  if (context.actor_type === 'user') {
    await setFirebaseUserId(context.analytics_actor_id);
  } else {
    await setFirebaseUserId(null);
  }

  await syncIdentityProperties(context);
};

const resolveAuthenticatedIdentity = async () => {
  const remoteProfile = await fetchAuthenticatedUserProfile();
  if (remoteProfile?.userId) {
    await persistAuthenticatedUserId(remoteProfile.userId);
    return remoteProfile;
  }

  const storedUserId = await getStoredAuthenticatedUserId();
  if (storedUserId?.trim()) {
    return {
      userId: storedUserId.trim(),
      userTier: undefined,
    };
  }

  return null;
};

export const initializeAnalytics = () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const analytics = await getAnalyticsInstance();

      if (analytics) {
        try {
          await analytics.setAnalyticsCollectionEnabled(true);
        } catch (error) {
          console.warn('Failed to initialize Firebase Analytics.', error);
        }
      }

      const isSignedIn = Boolean(await SecureStore.getItemAsync('authToken'));
      if (isSignedIn) {
        const sessionId = buildSessionId();
        const resolvedIdentity = await resolveAuthenticatedIdentity();
        const userId = resolvedIdentity?.userId ?? `user_unresolved_${sessionId}`;

        currentContext = {
          actor_type: 'user',
          analytics_actor_id: userId,
          auth_state: 'signed_in',
          session_id: sessionId,
          leadTemperature: 'cold',
          userTier: resolvedIdentity?.userTier,
          initializedAt: Date.now(),
        };

        await applyIdentityToFirebase(currentContext);
        emitContext();
        return currentContext;
      }

      return initializeGuestSession({ resetInitializationPromise: false });
    })();
  }

  return initializationPromise;
};

const ensureAnalyticsIdentity = async () => {
  if (currentContext) {
    return currentContext;
  }

  return initializeAnalytics();
};

export const initializeAnalyticsIdentity = async () => ensureAnalyticsIdentity();

export const initializeGuestSession = async (
  options: { resetInitializationPromise?: boolean; preserveLeadTemperature?: boolean } = {}
) => {
  const sessionId = buildSessionId();
  const guestActorId = buildGuestActorId(sessionId);
  const leadTemperature =
    options.preserveLeadTemperature && currentContext
      ? currentContext.leadTemperature
      : 'cold';

  currentContext = {
    actor_type: 'guest',
    analytics_actor_id: guestActorId,
    auth_state: 'guest',
    session_id: sessionId,
    leadTemperature,
    initializedAt: Date.now(),
  };

  await persistGuestIdentity(sessionId, guestActorId);
  await applyIdentityToFirebase(currentContext);
  emitContext();

  if (options.resetInitializationPromise !== false) {
    initializationPromise = Promise.resolve(currentContext);
  }

  return currentContext;
};

export const setUserId = async (userId: string | null) => setFirebaseUserId(userId);

export const setUserProperties = async (properties: AnalyticsUserProperties) => {
  lastUserProperties = { ...lastUserProperties, ...properties };
  await setFirebaseUserProperties(properties);
};

export const setAuthenticatedUser = async (
  userId: string,
  options: {
    method?: string;
    sourceScreen?: string;
    sourceSurface?: string;
    userTier?: string;
    authEventName?: 'login' | 'sign_up';
  } = {}
) => {
  await initializeAnalytics();
  const previousContext = currentContext;
  const sessionId = previousContext?.session_id ?? buildSessionId();
  const nextLeadTemperature = previousContext?.leadTemperature ?? 'cold';

  currentContext = {
    actor_type: 'user',
    analytics_actor_id: userId,
    auth_state: 'signed_in',
    session_id: sessionId,
    leadTemperature: nextLeadTemperature,
    userTier: options.userTier ?? previousContext?.userTier,
    initializedAt: Date.now(),
  };

  await persistAuthenticatedUserId(userId);
  await applyIdentityToFirebase(currentContext);
  emitContext();

  if (previousContext?.actor_type === 'guest') {
    await trackEvent(ANALYTICS_EVENTS.GuestIdentified, {
      guest_actor_id: previousContext.analytics_actor_id,
      user_id: userId,
      method: options.method ?? 'unknown',
      source_screen: options.sourceScreen,
    });
  }

  if (options.authEventName) {
    await trackEvent(options.authEventName, {
      method: options.method ?? 'unknown',
      source_screen: options.sourceScreen,
      source_surface: options.sourceSurface,
    });
  }

  return currentContext;
};

export const completeAuthentication = async (options: AuthCompletionOptions) => {
  const resolvedIdentity = await resolveAuthenticatedIdentity();

  if (!resolvedIdentity?.userId) {
    return initializeAnalytics();
  }

  return setAuthenticatedUser(resolvedIdentity.userId, {
    method: options.method,
    sourceScreen: options.sourceScreen,
    sourceSurface: options.sourceSurface,
    userTier: resolvedIdentity.userTier,
    authEventName: options.eventName,
  });
};

export const clearAuthenticatedUser = async (options: { sourceScreen?: string; reason?: string } = {}) => {
  await initializeAnalytics();

  if (currentContext?.actor_type === 'user') {
    await trackEvent(ANALYTICS_EVENTS.Logout, {
      source_screen: options.sourceScreen,
      reason: options.reason,
    });
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ANALYTICS_USER_ID_KEY),
    setFirebaseUserId(null),
  ]);

  return initializeGuestSession({
    preserveLeadTemperature: false,
  });
};

export const subscribeAnalyticsContext = (listener: AnalyticsContextListener) => {
  contextListeners.add(listener);
  listener(
    currentContext
      ? {
          actor_type: currentContext.actor_type,
          analytics_actor_id: currentContext.analytics_actor_id,
          auth_state: currentContext.auth_state,
          session_id: currentContext.session_id,
          lead_temperature: currentContext.leadTemperature,
        }
      : null
  );

  return () => {
    contextListeners.delete(listener);
  };
};

export const getAnalyticsContext = () =>
  currentContext
    ? {
        actor_type: currentContext.actor_type,
        analytics_actor_id: currentContext.analytics_actor_id,
        auth_state: currentContext.auth_state,
        session_id: currentContext.session_id,
        lead_temperature: currentContext.leadTemperature,
      }
    : null;

export const trackEvent = async <TEventName extends AnalyticsEventName>(
  eventName: TEventName,
  params: AnalyticsEventParams<TEventName>
) => {
  const context = await ensureAnalyticsIdentity();
  const analytics = await getAnalyticsInstance();
  // Every event is enriched centrally so downstream funnels and audiences can be segmented
  // by signed-in users versus guest sessions without relying on screen-level discipline.
  const payload = sanitizeAnalyticsParams({
    ...params,
    actor_type: context.actor_type,
    analytics_actor_id: context.analytics_actor_id,
    auth_state: context.auth_state,
    session_id: context.session_id,
  });

  if (analytics) {
    await enqueueAnalyticsTask(async () => {
      try {
        await analytics.logEvent(eventName, payload);
      } catch (error) {
        console.warn(`Failed to log Firebase Analytics event "${eventName}".`, error);
      }
    });
  }

  await promoteLeadTemperature(eventName);
};

export const trackScreen = async (pathname: string) => {
  const { routeKey, screenClass, screenGroup, screenName } =
    getAnalyticsScreenMetadata(pathname);

  await trackEvent(ANALYTICS_EVENTS.ScreenView, {
    screen_name: screenName,
    screen_class: screenClass,
    route_key: routeKey,
    screen_group: screenGroup,
  });
};
