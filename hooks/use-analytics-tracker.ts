import { useCallback, useRef } from 'react';

import { AnalyticsEventName, AnalyticsEventParams } from '@/lib/analytics.schema';
import { trackEvent } from '@/lib/analytics';

export const useAnalyticsTracker = () => {
  const onceKeysRef = useRef(new Set<string>());

  const track = useCallback(
    <TEventName extends AnalyticsEventName>(
      eventName: TEventName,
      params: AnalyticsEventParams<TEventName>
    ) => {
      void trackEvent(eventName, params);
    },
    []
  );

  const trackOnce = useCallback(
    <TEventName extends AnalyticsEventName>(
      onceKey: string,
      eventName: TEventName,
      params: AnalyticsEventParams<TEventName>
    ) => {
      // Milestone interactions like scroll depth and gallery engagement should be counted once
      // per screen instance so analysts can trust the signal and marketers can build audiences
      // without duplicate inflation.
      if (onceKeysRef.current.has(onceKey)) {
        return false;
      }

      onceKeysRef.current.add(onceKey);
      void trackEvent(eventName, params);
      return true;
    },
    []
  );

  const resetOnceKey = useCallback((onceKey?: string) => {
    if (!onceKey) {
      onceKeysRef.current.clear();
      return;
    }

    onceKeysRef.current.delete(onceKey);
  }, []);

  return {
    track,
    trackOnce,
    resetOnceKey,
  };
};
