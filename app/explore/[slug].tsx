import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BackButton } from '@/components/BackButton';
import { ExploreListingCard } from '@/components/explore/ExploreListingCard';
import { useAnalyticsTracker } from '@/hooks/use-analytics-tracker';
import {
  ANALYTICS_EVENTS,
  buildListingAnalyticsItem,
  toFlag,
} from '@/lib/analytics.schema';
import {
  ExploreFilterInput,
  RemoteExploreSection,
  deserializeExploreFilterInput,
  mapExploreSection,
} from '@/lib/explore';
import { EXPLORE_SECTION } from '@/queries/exploreSections';

const PAGE_SIZE = 10;

type ExploreSectionResponse = {
  exploreSection?: RemoteExploreSection | null;
};

type ExploreSectionVariables = {
  slug: string;
  filters?: ExploreFilterInput;
};

const rgbaFromHex = (color: string, alpha: string) => {
  const normalized = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return `${normalized}${alpha}`;
  return normalized;
};

export default function ExploreSectionScreen() {
  const router = useRouter();
  const { track } = useAnalyticsTracker();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ slug?: string | string[]; filters?: string | string[] }>();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(true);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const scrollY = useState(() => new Animated.Value(0))[0];

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug ?? '';
  const baseFilters = useMemo(() => deserializeExploreFilterInput(params.filters), [params.filters]);
  const initialFilters = useMemo(
    () => ({
      ...baseFilters,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    [baseFilters]
  );

  const { data, error, loading, fetchMore, refetch } = useQuery<
    ExploreSectionResponse,
    ExploreSectionVariables
  >(
    EXPLORE_SECTION,
    {
      variables: { slug, filters: initialFilters },
      skip: !slug,
      notifyOnNetworkStatusChange: true,
    }
  );

  const section = useMemo(
    () => (data?.exploreSection ? mapExploreSection(data.exploreSection) : null),
    [data]
  );
  const listings = section?.listings ?? [];
  const matchingCount = section?.matchingCount ?? 0;
  const hasMore = !error && remoteHasMore && listings.length < matchingCount;
  const isNetworkError = Boolean(error?.networkError);
  const listViewSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    setRemoteHasMore(true);
  }, [initialFilters, slug]);

  useEffect(() => {
    if (!section) return;
    if (section.listings.length < PAGE_SIZE || section.listings.length >= section.matchingCount) {
      setRemoteHasMore(false);
    }
  }, [section]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setShowCompactHeader((current) => {
        if (value > 56 && !current) return true;
        if (value < 32 && current) return false;
        return current;
      });
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY]);

  useEffect(() => {
    if (!section || loading || error || listings.length === 0) {
      return;
    }

    const signature = `${section.slug}:${listings.length}:${matchingCount}:${JSON.stringify(
      baseFilters
    )}`;
    if (listViewSignatureRef.current === signature) {
      return;
    }

    listViewSignatureRef.current = signature;

    track(ANALYTICS_EVENTS.ViewItemList, {
      item_list_id: section.slug,
      item_list_name: section.title,
      source_screen: 'explore_section',
      source_surface: 'section_results',
      source_section: section.slug,
      city: section.location?.area || section.location?.name || undefined,
      list_size: listings.length,
      items: listings.slice(0, 10).map((listing) =>
        buildListingAnalyticsItem({
          id: listing.id,
          name: listing.name,
          apartmentType: listing.apartmentType,
          city: listing.area,
          price: listing.minimumPrice,
          itemListId: section.slug,
          itemListName: section.title,
        })
      ),
    });
  }, [baseFilters, error, listings, loading, matchingCount, section, track]);

  const handleRetry = () => {
    refetch({ slug, filters: initialFilters }).catch(() => undefined);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRemoteHasMore(true);
    try {
      await refetch({ slug, filters: initialFilters });
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!slug || !hasMore || loadingMore || loading) return;

    setLoadingMore(true);

    try {
      const result = await fetchMore({
        variables: {
          slug,
          filters: {
            ...baseFilters,
            limit: PAGE_SIZE,
            offset: listings.length,
          },
        },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult?.exploreSection) return previous;

          return {
            exploreSection: {
              ...fetchMoreResult.exploreSection,
              listings: [
                ...(previous?.exploreSection?.listings ?? []),
                ...(fetchMoreResult.exploreSection.listings ?? []),
              ],
            },
          };
        },
      });

      const newItems = result.data?.exploreSection?.listings ?? [];
      const totalLoaded = listings.length + newItems.length;

      if (newItems.length < PAGE_SIZE || totalLoaded >= matchingCount) {
        setRemoteHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  if (!slug) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 px-6 pt-4">
          <BackButton onPress={() => router.back()} />
          <View className="flex-1 items-center justify-center">
            <Text className="text-base font-semibold text-slate-900">Missing explore section</Text>
            <Text className="mt-2 text-center text-sm text-slate-500">
              The section slug was not provided.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const sectionTextColor = section?.textColor ?? '#0f172a';
  const sectionBackgroundColor = section?.backgroundColor ?? '#eff6ff';
  const sectionBorderColor = section?.borderColor ?? '#bfdbfe';
  const compactHeaderTop = insets.top + 8;
  const heroScale = scrollY.interpolate({
    inputRange: [0, 140],
    outputRange: [1, 0.97],
    extrapolate: 'clamp',
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 180],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });
  const heroOpacity = scrollY.interpolate({
    inputRange: [0, 90, 190],
    outputRange: [1, 0.96, 0.86],
    extrapolate: 'clamp',
  });
  const compactOpacity = scrollY.interpolate({
    inputRange: [30, 110],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const compactTranslateY = scrollY.interpolate({
    inputRange: [20, 120],
    outputRange: [-18, 0],
    extrapolate: 'clamp',
  });
  const compactScale = scrollY.interpolate({
    inputRange: [20, 120],
    outputRange: [0.94, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <Animated.View
        pointerEvents={showCompactHeader ? 'box-none' : 'none'}
        style={{
          position: 'absolute',
          top: compactHeaderTop,
          left: 24,
          right: 24,
          zIndex: 40,
          opacity: compactOpacity,
          transform: [{ translateY: compactTranslateY }, { scale: compactScale }],
        }}>
        <View className="flex-row items-center gap-3">
          <BackButton onPress={() => router.back()} />
          <View
            className="flex-1 flex-row items-center justify-between rounded-[24px] border px-4 py-3 shadow-lg shadow-slate-200"
            style={{
              backgroundColor: sectionBackgroundColor,
              borderColor: sectionBorderColor,
            }}>
            <View className="mr-3 flex-1">
              <Text
                className="text-[10px] font-semibold uppercase tracking-[0.24em]"
                style={{ color: sectionTextColor, opacity: 0.72 }}
                numberOfLines={1}>
                {section?.eyebrow ?? 'Explore'}
              </Text>
              <Text
                className="mt-1 text-sm font-bold"
                style={{ color: sectionTextColor }}
                numberOfLines={1}>
                {section?.title ?? 'Explore section'}
              </Text>
            </View>
            <View
              className="rounded-2xl border px-3 py-2.5"
              style={{
                borderColor: sectionBorderColor,
                backgroundColor: rgbaFromHex(sectionTextColor, '14'),
              }}>
              <Feather name={section?.iconName ?? 'compass'} size={16} color={sectionTextColor} />
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.FlatList
        data={listings}
        renderItem={({ item }) => (
          <ExploreListingCard
            item={item}
            onPress={(listing) => {
              track(ANALYTICS_EVENTS.SelectItem, {
                source_screen: 'explore_section',
                source_surface: 'section_results_card',
                source_section: slug,
                item_list_id: section?.slug || slug,
                item_list_name: section?.title || slug,
                listing_id: listing.id,
                listing_name: listing.name,
                city: listing.area,
                apartment_type: listing.apartmentType,
                price: listing.minimumPrice,
                has_offer: toFlag(listing.promoTags.length > 0),
                items: [
                  buildListingAnalyticsItem({
                    id: listing.id,
                    name: listing.name,
                    apartmentType: listing.apartmentType,
                    city: listing.area,
                    price: listing.minimumPrice,
                    itemListId: section?.slug || slug,
                    itemListName: section?.title || slug,
                  }),
                ],
              });

              router.push({
                pathname: '/listing/[id]',
                params: {
                  id: listing.id,
                  source_screen: 'explore_section',
                  source_surface: 'section_results_card',
                  source_section: slug,
                  item_list_id: section?.slug || slug,
                  item_list_name: section?.title || slug,
                },
              });
            }}
          />
        )}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1d4ed8"
            colors={['#1d4ed8']}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!loadingMore && hasMore) {
            handleLoadMore();
          }
        }}
        ListHeaderComponent={
          <View>
            <View className="mb-5 flex-row items-center justify-between">
              <BackButton onPress={() => router.back()} />
              <View className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                <Feather name="sliders" size={14} color="#475569" />
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Filters kept
                </Text>
              </View>
            </View>

            <Animated.View
              className="mb-6 rounded-[32px] border px-5 py-5"
              style={{
                backgroundColor: sectionBackgroundColor,
                borderColor: sectionBorderColor,
                opacity: heroOpacity,
                transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
              }}>
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                    style={{ color: sectionTextColor, opacity: 0.72 }}>
                    {section?.eyebrow ?? 'Explore'}
                  </Text>
                  <Text
                    className="mt-3 text-[28px] font-bold leading-8"
                    style={{ color: sectionTextColor }}>
                    {section?.title ?? 'Loading section'}
                  </Text>
                </View>
                <View
                  className="rounded-2xl border px-3 py-3"
                  style={{
                    borderColor: sectionBorderColor,
                    backgroundColor: rgbaFromHex(sectionTextColor, '1a'),
                  }}>
                  <Feather
                    name={section?.iconName ?? 'compass'}
                    size={18}
                    color={sectionTextColor}
                  />
                </View>
              </View>

              <Text
                className="mt-4 text-sm leading-6"
                style={{ color: sectionTextColor, opacity: 0.88 }}>
                {section?.subtitle ?? 'Finding the best stays for your selected filters.'}
              </Text>

              <View className="mt-5 flex-row items-center justify-between">
                <View>
                  <Text
                    className="text-[11px] font-semibold uppercase tracking-[0.2em]"
                    style={{ color: sectionTextColor, opacity: 0.68 }}>
                    Matches
                  </Text>
                  <Text className="mt-1 text-lg font-bold" style={{ color: sectionTextColor }}>
                    {matchingCount} {matchingCount === 1 ? 'stay' : 'stays'}
                  </Text>
                </View>
                {section?.location ? (
                  <View className="flex-row items-center gap-2">
                    <Feather name="map-pin" size={14} color={sectionTextColor} />
                    <Text className="text-sm font-medium" style={{ color: sectionTextColor }}>
                      {section.location.area || section.location.name}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>

            {error && listings.length > 0 ? (
              <View className="mb-5 rounded-3xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                <Text className="text-sm font-semibold text-rose-700">
                  {isNetworkError ? 'Network error' : 'Unable to refresh this section'}
                </Text>
                <Text className="mt-1 text-xs text-rose-600">
                  {isNetworkError
                    ? 'Check your connection and pull to refresh.'
                    : 'Something went wrong while updating this section.'}
                </Text>
                <Pressable
                  className="mt-3 self-start rounded-full bg-rose-600 px-4 py-2"
                  onPress={handleRetry}>
                  <Text className="text-xs font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View className="py-4">
            {loadingMore ? (
              <View className="items-center justify-center py-2">
                <ActivityIndicator color="#1d4ed8" />
              </View>
            ) : null}
            {!loadingMore && !hasMore && listings.length > 0 ? (
              <Text className="text-center text-sm text-slate-400">You are all caught up.</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="py-24">
            {error ? (
              <View className="items-center justify-center px-6">
                <Text className="text-base font-semibold text-slate-900">
                  {isNetworkError ? 'Network error' : 'Unable to load this section'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  {isNetworkError
                    ? 'Check your connection and try again.'
                    : 'Something went wrong while fetching this section.'}
                </Text>
                <Pressable
                  className="mt-4 rounded-full bg-blue-600 px-5 py-2.5"
                  onPress={handleRetry}>
                  <Text className="text-sm font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : loading || refreshing ? (
              <View className="items-center justify-center">
                <ActivityIndicator color="#1d4ed8" size="large" />
                <Text className="mt-3 text-sm font-semibold text-slate-500">
                  Loading section listings...
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center px-6">
                <Text className="text-center text-base font-semibold text-slate-900">
                  {section ? `No stays found for ${section.title}.` : 'Section not found.'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  {section
                    ? 'Try adjusting your filters and open the section again.'
                    : 'This explore section may no longer be available.'}
                </Text>
              </View>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
