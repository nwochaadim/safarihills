import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';

import { initializeAnalytics, trackScreenView } from '@/lib/analytics';

export function AnalyticsManager() {
  const pathname = usePathname();
  const lastTrackedPathRef = useRef<string | null>(null);

  useEffect(() => {
    void initializeAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname || pathname === '/' || pathname === lastTrackedPathRef.current) {
      return;
    }

    lastTrackedPathRef.current = pathname;

    void (async () => {
      await initializeAnalytics();
      await trackScreenView(pathname);
    })();
  }, [pathname]);

  return null;
}
