import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { LoadingImage } from '@/components/LoadingImage';
import { dismissCurrentActivityFeed, useActivityFeedStore } from '@/lib/activityFeedStore';

const DISPLAY_DURATION_MS = 10000;

const formatRelativeTime = (value: string) => {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';

  const diffInSeconds = Math.max(Math.floor((Date.now() - timestamp) / 1000), 0);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} ${diffInSeconds === 1 ? 'second' : 'seconds'} ago`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
};

export function ActivityFeedOverlay({ hidden = false }: { hidden?: boolean }) {
  const insets = useSafeAreaInsets();
  const { currentEntryId, entries } = useActivityFeedStore();
  const progress = useRef(new Animated.Value(1)).current;
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const currentEntry = useMemo(() => {
    return entries.find((entry) => entry.id === currentEntryId) ?? null;
  }, [currentEntryId, entries]);

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    progress.stopAnimation();

    if (!currentEntry || hidden) {
      setIsVisible(false);
      progress.setValue(1);
      return;
    }

    console.log('Activity feed entry to display', currentEntry);
    setIsVisible(true);
    progress.setValue(1);

    Animated.timing(progress, {
      toValue: 0,
      duration: DISPLAY_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();

    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, DISPLAY_DURATION_MS);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      progress.stopAnimation();
    };
  }, [currentEntry, hidden, progress]);

  if (hidden || !currentEntry || !isVisible) return null;

  const metaLine = [currentEntry.actorName, currentEntry.listingNameSnapshot || currentEntry.areaSnapshot]
    .filter((value) => value.trim().length > 0)
    .join(' • ');

  const bookingLine = [
    currentEntry.booking?.formattedCheckIn,
    currentEntry.booking?.formattedCheckOut,
  ]
    .filter((value) => value && value.trim().length > 0)
    .join(' - ');
  const happenedAtLabel = formatRelativeTime(currentEntry.happenedAt);
  const bottomOffset = Math.max(insets.bottom + 84, 96);
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressTrackWidth],
  });
  const avatarUri = currentEntry.listing?.coverAvatar?.trim() ?? '';
  const avatarFallback = (currentEntry.actorName || currentEntry.listingNameSnapshot || 'A')
    .trim()
    .charAt(0)
    .toUpperCase();

  const handleClose = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    progress.stopAnimation();
    progress.setValue(1);
    setIsVisible(false);
    void dismissCurrentActivityFeed();
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 16,
        right: 16,
        zIndex: 1000,
      }}>
      <View className="overflow-hidden rounded-[24px] border border-slate-200 bg-white px-4 py-3 shadow-lg shadow-slate-300">
        <View className="flex-row items-start gap-3">
          {avatarUri ? (
            <LoadingImage
              source={{ uri: avatarUri }}
              className="h-12 w-12 rounded-[16px]"
              contentFit="cover"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-blue-100">
              <Text className="text-base font-bold text-blue-700">{avatarFallback}</Text>
            </View>
          )}

          <View className="flex-1">
            <View className="flex-row items-start justify-between gap-3">
              <Text className="flex-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-600">
                Activity Feed
              </Text>
              <Pressable
                className="mt-[-2px] rounded-full border border-slate-200 bg-slate-50 p-1.5"
                onPress={handleClose}
                hitSlop={8}>
                <Feather name="x" size={14} color="#475569" />
              </Pressable>
            </View>
            <Text className="mt-1 text-sm font-semibold text-slate-900" numberOfLines={2}>
              {currentEntry.message || 'New activity'}
            </Text>
            {metaLine ? (
              <Text className="mt-1 text-xs text-slate-500" numberOfLines={1}>
                {metaLine}
              </Text>
            ) : null}
            {bookingLine ? (
              <Text className="mt-1 text-[11px] font-medium text-slate-400" numberOfLines={1}>
                {bookingLine}
              </Text>
            ) : null}
            {happenedAtLabel ? (
              <Text className="mt-1 text-[11px] font-medium text-slate-400" numberOfLines={1}>
                {happenedAtLabel}
              </Text>
            ) : null}
          </View>
        </View>
        <View
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"
          onLayout={(event) => {
            setProgressTrackWidth(event.nativeEvent.layout.width);
          }}>
          <Animated.View
            className="h-full rounded-full bg-blue-500"
            style={{ width: progressWidth }}
          />
        </View>
      </View>
    </View>
  );
}
