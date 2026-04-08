import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';
import { SafeAreaView } from '@/components/tab-safe-area-view';
import { WishlistListingCard } from '@/components/wishlist/WishlistListingCard';
import { useAnalyticsTracker } from '@/hooks/use-analytics-tracker';
import { useListingWishlistToggle } from '@/hooks/use-listing-wishlist';
import {
  ANALYTICS_EVENTS,
  buildListingAnalyticsItem,
  toFlag,
} from '@/lib/analytics.schema';
import { AuthStatus } from '@/lib/authStatus';
import {
  ListingWishlistRecord,
  normalizeListingWishlistRecord,
} from '@/lib/listingWishlist';
import { WISHLISTED_LISTINGS } from '@/queries/wishlistedListings';

type RemoteWishlistedListing = {
  id?: string | null;
  name?: string | null;
  apartmentType?: string | null;
  description?: string | null;
  coverPhoto?: string | null;
  minimumPrice?: number | null;
  rating?: number | null;
  area?: string | null;
  maxNumberOfGuestsAllowed?: number | null;
  isWishlisted?: boolean | null;
  wishlistedAt?: string | null;
  unwishlistedAt?: string | null;
};

type WishlistedListingsResponse = {
  wishlistedListings?: RemoteWishlistedListing[] | null;
};

const formatSavedLabel = (savedAt: string | null) => {
  const savedTime = savedAt ? Date.parse(savedAt) : Number.NaN;
  if (Number.isNaN(savedTime)) return 'Saved recently';

  const diffMs = Date.now() - savedTime;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) return 'Saved today';
  if (diffDays === 1) return 'Saved yesterday';
  if (diffDays < 7) return `Saved ${diffDays} days ago`;

  return `Saved ${new Date(savedAt ?? '').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
};

export default function WishlistScreen() {
  const router = useRouter();
  const { track } = useAnalyticsTracker();
  const { toggleListingWishlist } = useListingWishlistToggle();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, refetch } = useQuery<WishlistedListingsResponse>(
    WISHLISTED_LISTINGS,
    {
      skip: authStatus !== 'signed-in',
      notifyOnNetworkStatusChange: true,
    }
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');

      AuthStatus.isSignedIn().then((signedIn) => {
        if (isActive) {
          setAuthStatus(signedIn ? 'signed-in' : 'signed-out');
        }
      });

      return () => {
        isActive = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'signed-in') {
        refetch();
      }
    }, [authStatus, refetch])
  );

  const items = useMemo<ListingWishlistRecord[]>(
    () =>
      (data?.wishlistedListings ?? []).map((listing, index) =>
        normalizeListingWishlistRecord({
          id: listing.id?.trim() || `wishlisted-listing-${index + 1}`,
          name: listing.name ?? undefined,
          apartmentType: listing.apartmentType ?? undefined,
          description: listing.description ?? undefined,
          coverPhoto: listing.coverPhoto ?? undefined,
          minimumPrice: listing.minimumPrice ?? undefined,
          rating: listing.rating ?? undefined,
          area: listing.area ?? undefined,
          maxNumberOfGuestsAllowed: listing.maxNumberOfGuestsAllowed ?? undefined,
          isWishlisted: listing.isWishlisted ?? true,
          wishlistedAt: listing.wishlistedAt ?? undefined,
          unwishlistedAt: listing.unwishlistedAt ?? undefined,
        })
      ),
    [data?.wishlistedListings]
  );

  const topAreas = useMemo(() => {
    const seen = new Set<string>();

    return items.reduce<string[]>((acc, item) => {
      const area = item.area.trim();
      if (!area || seen.has(area)) return acc;
      seen.add(area);
      acc.push(area);
      return acc.slice(0, 3);
    }, []);
  }, [items]);

  const nightlyRange = useMemo(() => {
    if (items.length === 0) return null;

    const prices = items.map((item) => item.minimumPrice);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [items]);

  const handleOpenListing = (listing: ListingWishlistRecord) => {
    track(ANALYTICS_EVENTS.SelectItem, {
      source_screen: 'wishlist',
      source_surface: 'wishlist_listing_card',
      item_list_id: 'wishlist_saved_stays',
      item_list_name: 'Wishlist saved stays',
      listing_id: listing.id,
      listing_name: listing.name,
      city: listing.area,
      apartment_type: listing.apartmentType,
      price: listing.minimumPrice,
      has_offer: toFlag(false),
      items: [
        buildListingAnalyticsItem({
          id: listing.id,
          name: listing.name,
          apartmentType: listing.apartmentType,
          city: listing.area,
          price: listing.minimumPrice,
          itemListId: 'wishlist_saved_stays',
          itemListName: 'Wishlist saved stays',
        }),
      ],
    });

    router.push({
      pathname: '/listing/[id]',
      params: {
        id: listing.id,
        source_screen: 'wishlist',
        source_surface: 'wishlist_listing_card',
        item_list_id: 'wishlist_saved_stays',
        item_list_name: 'Wishlist saved stays',
      },
    });
  };

  const handleRefresh = async () => {
    if (authStatus !== 'signed-in') return;

    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authStatus !== 'signed-in' || loading) return;

    track(ANALYTICS_EVENTS.ListingListView, {
      list_id: 'wishlist_saved_stays',
      list_name: 'Wishlist saved stays',
      source_screen: 'wishlist',
      source_surface: 'saved_stays_feed',
      list_size: items.length,
    });
  }, [authStatus, items.length, loading, track]);

  const showInitialLoading =
    authStatus === 'checking' || (authStatus === 'signed-in' && loading && !data?.wishlistedListings);

  return (
    <SafeAreaView className="flex-1 bg-[#fffaf7]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#e11d48" />
        }>
        <View className="overflow-hidden rounded-[34px] border border-rose-100 bg-white">
          <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-rose-100/90" />
          <View className="absolute -left-6 bottom-2 h-28 w-28 rounded-full bg-amber-100/80" />

          <View className="px-6 py-6">
            <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-rose-500">
              Wishlist
            </Text>
            <Text className="mt-3 text-3xl font-bold text-slate-900">
              Saved stays worth coming back to
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-600">
              Keep the places you love in one calm, focused space while you compare neighborhoods,
              price points, and your next booking.
            </Text>

            <View className="mt-5 flex-row flex-wrap gap-3">
              <View className="rounded-full border border-white bg-[#fff3ee] px-4 py-2">
                <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-500">
                  {authStatus === 'signed-in' ? `${items.length} saved` : 'Sign in'}
                </Text>
              </View>
              {nightlyRange ? (
                <View className="rounded-full border border-white bg-white px-4 py-2">
                  <Text className="text-sm font-semibold text-slate-700">
                    ₦{nightlyRange.min.toLocaleString()}
                    {nightlyRange.min !== nightlyRange.max
                      ? ` - ₦${nightlyRange.max.toLocaleString()}`
                      : ''}
                  </Text>
                </View>
              ) : null}
            </View>

            {topAreas.length > 0 ? (
              <View className="mt-5 flex-row flex-wrap gap-2">
                {topAreas.map((area) => (
                  <View
                    key={area}
                    className="rounded-full border border-rose-100 bg-white/90 px-3 py-1.5">
                    <Text className="text-xs font-semibold text-slate-700">{area}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {showInitialLoading ? (
          <View className="mt-8 flex-row items-center justify-center gap-3 rounded-[28px] border border-rose-100 bg-white px-5 py-5">
            <ActivityIndicator color="#e11d48" size="small" />
            <Text className="text-sm font-medium text-slate-600">Loading your wishlist...</Text>
          </View>
        ) : authStatus === 'signed-out' ? (
          <View className="mt-8">
            <BlankSlate
              title="Sign in to see your saved stays."
              description="Your wishlist now lives on your account, so it follows you everywhere."
              iconName="heart"
              primaryAction={{ label: 'Sign in', onPress: () => router.push('/auth/login') }}
              secondaryAction={{ label: 'Browse Explore', onPress: () => router.push('/explore') }}
            />
          </View>
        ) : error && items.length === 0 ? (
          <View className="mt-8 rounded-[28px] border border-rose-100 bg-white px-5 py-5">
            <Text className="text-base font-semibold text-slate-900">
              We couldn&apos;t load your wishlist right now.
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-500">
              Pull to refresh or try again in a moment.
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View className="mt-8">
            <BlankSlate
              title="Your wishlist is still waiting for its first favorite."
              description="Tap the heart on any listing and it will show up here automatically."
              iconName="heart"
              primaryAction={{
                label: 'Browse Explore',
                onPress: () => router.push('/explore'),
              }}
            />
          </View>
        ) : (
          <View className="mt-8">
            <View className="mb-5 flex-row items-end justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                  All Saved Stays
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Open any stay to keep comparing, or tap the heart again to let it go.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-[20px] bg-white shadow-sm shadow-rose-100">
                <Feather name="heart" size={18} color="#e11d48" />
              </View>
            </View>

            {items.map((item) => (
              <WishlistListingCard
                key={item.id}
                item={item}
                savedLabel={formatSavedLabel(item.wishlistedAt)}
                onPress={handleOpenListing}
                onToggleWishlist={(listing) => {
                  void toggleListingWishlist(listing);
                }}
              />
            ))}

            <Pressable
              className="mt-2 items-center justify-center rounded-full border border-rose-200 bg-white px-5 py-4"
              onPress={() => router.push('/explore')}>
              <Text className="text-base font-semibold text-rose-600">Find more stays to love</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
