import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { ActivityFeedOverlay } from '@/components/ActivityFeedOverlay';
import {
  ACTIVITY_FEED_DISPLAY_INTERVAL_MS,
  ACTIVITY_FEED_INITIAL_DISPLAY_DELAY_MS,
  advanceActivityFeedDisplay,
  getActivityFeedFetchDelayMs,
  hydrateAndRefreshActivityFeed,
  initializeActivityFeedStore,
  refreshActivityFeedIfNeeded,
  useActivityFeedStore
} from '@/lib/activityFeedStore';

const isOverlayHiddenForPath = (pathname: string) => pathname === '/' || pathname.startsWith('/auth');

export function ActivityFeedManager() {
  const pathname = usePathname();
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hasScheduledFirstDisplayRef = useRef(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(true);
  const { entries, fetchJitterOffsetMs, hydrated, lastFetchedAt, lastDisplayedAt } =
    useActivityFeedStore();

  const bootstrap = useCallback(async () => {
    setIsSilentRefreshing(true);

    try {
      await initializeActivityFeedStore();
      await hydrateAndRefreshActivityFeed({ forceIfEmpty: true });
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

    const delayMs = getActivityFeedFetchDelayMs({
      lastFetchedAt,
      fetchJitterOffsetMs,
    });

    const timeout = setTimeout(() => {
      if (appStateRef.current !== 'active') return;

      void refreshActivityFeedIfNeeded({ force: true }).then(() => {
        void advanceActivityFeedDisplay();
      });
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [entries.length, fetchJitterOffsetMs, hydrated, isSilentRefreshing, lastFetchedAt]);

  useEffect(() => {
    if (!hydrated || isSilentRefreshing) return;

    const delayMs = hasScheduledFirstDisplayRef.current
      ? ACTIVITY_FEED_DISPLAY_INTERVAL_MS
      : ACTIVITY_FEED_INITIAL_DISPLAY_DELAY_MS;

    const timeout = setTimeout(() => {
      if (appStateRef.current !== 'active') return;
      hasScheduledFirstDisplayRef.current = true;
      void advanceActivityFeedDisplay();
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [entries.length, hydrated, isSilentRefreshing, lastDisplayedAt, lastFetchedAt]);

  return <ActivityFeedOverlay hidden={isSilentRefreshing || isOverlayHiddenForPath(pathname)} />;
}
