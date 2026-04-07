import { usePathname } from 'expo-router';
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { getAnalyticsScreenMetadata } from '@/lib/analytics.common';
import {
  getAnalyticsContext,
  initializeAnalyticsIdentity,
  subscribeAnalyticsContext,
  trackEvent,
  trackScreen,
} from '@/lib/analytics';
import { ANALYTICS_EVENTS, AnalyticsLeadTemperature } from '@/lib/analytics.schema';

type AnalyticsProviderContextValue = {
  actor_type: 'user' | 'guest';
  analytics_actor_id: string;
  auth_state: 'signed_in' | 'guest';
  session_id: string;
  lead_temperature: AnalyticsLeadTemperature;
} | null;

const AnalyticsIdentityContext =
  createContext<AnalyticsProviderContextValue>(null);

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [context, setContext] = useState<AnalyticsProviderContextValue>(
    getAnalyticsContext()
  );
  const lastTrackedPathRef = useRef<string | null>(null);
  const hasTrackedAppOpenRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    void initializeAnalyticsIdentity().then(() => {
      if (isMounted) {
        setContext(getAnalyticsContext());
      }
    });

    const unsubscribe = subscribeAnalyticsContext((nextContext) => {
      if (isMounted) {
        setContext(nextContext);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname === '/') {
      return;
    }

    void (async () => {
      await initializeAnalyticsIdentity();

      if (!hasTrackedAppOpenRef.current) {
        const metadata = getAnalyticsScreenMetadata(pathname);
        hasTrackedAppOpenRef.current = true;
        // Manual app-open plus screen tracking gives us stable route names in React Native and
        // preserves the first landing surface for attribution and lifecycle analysis.
        await trackEvent(ANALYTICS_EVENTS.AppOpened, {
          landing_route: metadata.routeKey,
          landing_screen: metadata.screenName,
          screen_group: metadata.screenGroup,
        });
      }

      if (lastTrackedPathRef.current === pathname) {
        return;
      }

      lastTrackedPathRef.current = pathname;
      await trackScreen(pathname);
    })();
  }, [pathname]);

  return (
    <AnalyticsIdentityContext.Provider value={context}>
      {children}
    </AnalyticsIdentityContext.Provider>
  );
}

export const useAnalyticsIdentity = () => useContext(AnalyticsIdentityContext);
