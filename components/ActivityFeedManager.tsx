import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { ActivityFeedOverlay } from '@/components/ActivityFeedOverlay';
import {
  ACTIVITY_FEED_DISPLAY_INTERVAL_MS,
  advanceActivityFeedDisplay,
  hydrateAndRefreshActivityFeed,
  initializeActivityFeedStore,
  refreshActivityFeedIfNeeded,
  useActivityFeedStore
} from '@/lib/activityFeedStore';

const ACTIVITY_FEED_REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const ACTIVITY_FEED_EMPTY_RETRY_INTERVAL_MS = 10 * 60 * 1000;

const isOverlayHiddenForPath = (pathname: string) => pathname === '/' || pathname.startsWith('/auth');

export function ActivityFeedManager() {
  const pathname = usePathname();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(true);
  const { entries, hydrated, lastFetchedAt } = useActivityFeedStore();

  const bootstrap = useCallback(async () => {
    setIsSilentRefreshing(true);

    try {
      await initializeActivityFeedStore();
      await hydrateAndRefreshActivityFeed({ forceRefresh: true });
    } finally {
      setIsSilentRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;

      if (!wasActive && nextState === 'active') {
        void bootstrap();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [bootstrap]);

  useEffect(() => {
    if (!hydrated || isSilentRefreshing) return;

    const refreshIntervalMs =
      entries.length > 0 ? ACTIVITY_FEED_REFRESH_INTERVAL_MS : ACTIVITY_FEED_EMPTY_RETRY_INTERVAL_MS;
    const lastFetchedAtMs = lastFetchedAt ? Date.parse(lastFetchedAt) : 0;
    const elapsedMs =
      lastFetchedAtMs > 0 && Number.isFinite(lastFetchedAtMs)
        ? Math.max(Date.now() - lastFetchedAtMs, 0)
        : refreshIntervalMs;
    const delayMs = Math.max(refreshIntervalMs - elapsedMs, 0);

    const timeout = setTimeout(() => {
      if (appStateRef.current !== 'active') return;

      void refreshActivityFeedIfNeeded({ force: entries.length === 0 }).then(() =>
        advanceActivityFeedDisplay()
      );
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [entries.length, hydrated, isSilentRefreshing, lastFetchedAt]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      void advanceActivityFeedDisplay();
    }, ACTIVITY_FEED_DISPLAY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return <ActivityFeedOverlay hidden={isSilentRefreshing || isOverlayHiddenForPath(pathname)} />;
}
