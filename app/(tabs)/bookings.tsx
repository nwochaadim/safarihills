import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';
import { LoadingImage } from '@/components/LoadingImage';
import { FIND_BOOKINGS } from '@/queries/findBookings';

type BookingStatus = 'current' | 'upcoming' | 'past';

type BookingListItem = {
  id: string;
  listingId: string | null;
  apartmentName: string;
  apartmentType: string;
  location: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  amountPaid: number;
  cautionFee: number;
  referenceNumber: string;
  numberOfOccupants: number;
  state: string;
  timelineStatus: string;
  coverImage?: string | null;
};

type BookingResponse = {
  id: string;
  state: string;
  timelineStatus: string;
  amountPaid: number;
  cautionFee: number;
  referenceNumber: string;
  checkIn: string;
  checkOut: string;
  numberOfOccupants: number;
  user?: {
    name?: string | null;
  } | null;
  listing?: {
    name?: string | null;
    area?: string | null;
    apartmentType?: string | null;
    propertyPhotos?: { avatarPhoto?: string | null }[] | null;
  } | null;
};

type FindBookingsResponse = {
  findBookings: BookingResponse[];
};

type FindBookingsVariables = {
  status?: string | null;
  limit: number;
  offset: number;
};

const PAGE_SIZE = 10;

const FILTERS: { label: string; value: BookingStatus }[] = [
  { label: 'Current', value: 'current' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
];

const AVATARS = [
  'https://randomuser.me/api/portraits/women/68.jpg',
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/women/45.jpg',
  'https://randomuser.me/api/portraits/men/46.jpg',
  'https://randomuser.me/api/portraits/women/12.jpg',
  'https://randomuser.me/api/portraits/men/58.jpg',
];

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const formatDateRange = (start: string, end: string) => {
  const safeStart = start?.trim() ?? '';
  const safeEnd = end?.trim() ?? '';
  const startDate = new Date(safeStart);
  const endDate = new Date(safeEnd);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    if (safeStart && safeEnd) return `${safeStart} - ${safeEnd}`;
    return safeStart || safeEnd || '';
  }
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startLabel = startDate.toLocaleDateString('en-US', options);
  const endLabel = endDate.toLocaleDateString('en-US', {
    ...options,
    year: startDate.getFullYear() === endDate.getFullYear() ? undefined : 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
};

const formatStatusLabel = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (match) => match.toUpperCase());

const mapBooking = (booking: BookingResponse): BookingListItem => {
  const photos = booking.listing?.propertyPhotos ?? [];
  return {
    id: booking.id,
    listingId: null,
    apartmentName: booking.listing?.name ?? 'Apartment',
    apartmentType: booking.listing?.apartmentType ?? '—',
    location: booking.listing?.area ?? '—',
    guestName: booking.user?.name ?? 'Guest',
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    amountPaid: booking.amountPaid ?? 0,
    cautionFee: booking.cautionFee ?? 0,
    referenceNumber: booking.referenceNumber ?? '—',
    numberOfOccupants: booking.numberOfOccupants ?? 0,
    state: booking.state ?? '',
    timelineStatus: booking.timelineStatus ?? '',
    coverImage: photos[0]?.avatarPhoto ?? null,
  };
};

export default function BookingsScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [activeFilter, setActiveFilter] = useState<BookingStatus>('current');
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [remoteHasMore, setRemoteHasMore] = useState(true);

  const queryVariables = useMemo<FindBookingsVariables>(
    () => ({
      status: activeFilter,
      limit: PAGE_SIZE,
      offset: 0,
    }),
    [activeFilter]
  );

  const { data, loading, error, fetchMore, refetch } = useQuery<
    FindBookingsResponse,
    FindBookingsVariables
  >(FIND_BOOKINGS, {
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    skip: authStatus !== 'signed-in',
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');
      SecureStore.getItemAsync('authToken')
        .then((token) => {
          if (isActive) setAuthStatus(token ? 'signed-in' : 'signed-in');
        })
        .catch(() => {
          if (isActive) setAuthStatus('signed-out');
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'signed-in') {
        refetch(queryVariables);
      }
    }, [authStatus, refetch, queryVariables])
  );

  useEffect(() => {
    setRemoteHasMore(true);
  }, [activeFilter]);

  const bookings = useMemo<BookingListItem[]>(() => {
    return (data?.findBookings ?? []).map(mapBooking);
  }, [data]);

  const hasMore = remoteHasMore;

  useEffect(() => {
    if (data?.findBookings && data.findBookings.length < PAGE_SIZE) {
      setRemoteHasMore(false);
    }
  }, [data]);

  const handleLoadMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadMoreError(null);
    setLoadingMore(true);
    try {
      const result = await fetchMore({
        variables: {
          status: activeFilter,
          limit: PAGE_SIZE,
          offset: bookings.length,
        },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult?.findBookings) return previous;
          return {
            findBookings: [
              ...(previous?.findBookings ?? []),
              ...fetchMoreResult.findBookings,
            ],
          };
        },
      });
      const fetched = result.data?.findBookings ?? [];
      if (fetched.length < PAGE_SIZE) {
        setRemoteHasMore(false);
      }
    } catch (err) {
      setLoadMoreError('Unable to load more bookings.');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleChangeFilter = (status: BookingStatus) => {
    if (status === activeFilter) {
      handleRefresh();
      return;
    }
    setActiveFilter(status);
    setSelectedBooking(null);
    setLoadMoreError(null);
  };

  const handleRefresh = async () => {
    setLoadMoreError(null);
    setRefreshing(true);
    try {
      await refetch(queryVariables);
      setRemoteHasMore(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleOpenListing = () => {
    if (!selectedBooking?.listingId) {
      setSelectedBooking(null);
      return;
    }
    const listingId = selectedBooking.listingId;
    setSelectedBooking(null);
    router.push(`/listing/${listingId}`);
  };

  const renderBookingCard = ({ item }: { item: BookingListItem }) => (
    <Pressable
      className="mb-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100"
      onPress={() => setSelectedBooking(item)}>
      <View className="flex-row items-center gap-4">
        <LoadingImage
          source={{ uri: item.coverImage ?? AVATARS[0] }}
          style={{ height: 64, width: 64 }}
          className="rounded-2xl"
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className="flex-1 text-base font-semibold text-slate-900"
              numberOfLines={1}
              ellipsizeMode="tail">
              {item.apartmentName}
            </Text>
            <View className="items-end">
              <Text className="text-xs font-semibold uppercase text-blue-500">
                {item.apartmentType}
              </Text>
              {item.state ? (
                <Text className="text-[10px] font-semibold uppercase text-slate-400">
                  {formatStatusLabel(item.state)}
                </Text>
              ) : null}
            </View>
          </View>
          <Text className="text-sm text-slate-500">{item.guestName}</Text>
          <Text className="text-xs text-slate-400">
            {formatDateRange(item.checkIn, item.checkOut)}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="credit-card" size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-800">
            {formatCurrency(item.amountPaid)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Feather name="shield" size={16} color="#0f172a" />
          <Text className="text-xs font-semibold text-slate-500">
            Caution {formatCurrency(item.cautionFee)}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="map-pin" size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-600">{item.location}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Feather name="users" size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-800">
            {item.numberOfOccupants} guests
          </Text>
        </View>
      </View>
    </Pressable>
  );

  const renderListFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-4">
          <ActivityIndicator color="#2563eb" />
        </View>
      );
    }
    if (loadMoreError) {
      return (
        <View className="py-4">
          <Text className="text-center text-xs text-red-500">{loadMoreError}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {authStatus === 'checking' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : authStatus === 'signed-out' ? (
        <View className="flex-1">
          <View className="px-6 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
              Safarihills
            </Text>
            <Text className="mt-1 text-3xl font-bold text-slate-900">Bookings</Text>
          </View>
          <View className="flex-1 items-center justify-center px-8">
            <BlankSlate
              title="Sign in to see bookings"
              description="Keep track of upcoming stays, rewards, and booking history in one place."
              iconName="calendar"
              primaryAction={{ label: 'Sign in', onPress: () => router.push('/auth/login') }}
              secondaryAction={{ label: 'Create account', onPress: () => router.push('/auth/sign-up') }}
            />
          </View>
        </View>
      ) : (
        <>
          <View className="px-6 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
              Safarihills
            </Text>
            <Text className="mt-1 text-3xl font-bold text-slate-900">Guest bookings</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Track every stay you refer and monitor rewards in real time.
            </Text>
          </View>

          <View className="mt-5 px-6">
            <View className="flex-row justify-center gap-3">
              {FILTERS.map((filter) => {
                const isActive = filter.value === activeFilter;
                return (
                  <Pressable
                    key={filter.value}
                    className={`min-w-[100px] rounded-full px-5 py-2 ${
                      isActive ? 'bg-blue-600' : 'border border-slate-200 bg-white'
                    }`}
                    onPress={() => handleChangeFilter(filter.value)}>
                    <Text
                      className={`text-center text-sm font-semibold ${
                        isActive ? 'text-white' : 'text-slate-600'
                      }`}>
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            renderItem={renderBookingCard}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.6}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            ListFooterComponent={renderListFooter}
            ListEmptyComponent={
              loading ? (
                <View className="mt-20 items-center">
                  <ActivityIndicator color="#2563eb" />
                </View>
              ) : error ? (
                <View className="mt-20 items-center">
                  <Text className="text-sm text-slate-400">
                    Unable to load bookings right now.
                  </Text>
                </View>
              ) : (
                <View className="mt-20 items-center">
                  <Text className="text-sm text-slate-400">
                    No bookings in this category yet.
                  </Text>
                </View>
              )
            }
          />

          <Modal visible={!!selectedBooking} transparent animationType="slide">
            <View className="flex-1 justify-end bg-black/40">
              <View className="rounded-t-[32px] bg-white px-6 pb-8 pt-6">
                {selectedBooking ? (
                  <>
                    <View className="mb-4 flex-row items-start justify-between gap-3">
                      <Text className="flex-1 text-2xl font-bold text-slate-900">
                        {selectedBooking.apartmentName}
                      </Text>
                      <Pressable onPress={() => setSelectedBooking(null)}>
                        <Feather name="x" size={22} color="#0f172a" />
                      </Pressable>
                    </View>
                    <LoadingImage
                      source={{
                        uri: selectedBooking.coverImage ?? AVATARS[0],
                      }}
                      style={{ height: 192, width: '100%' }}
                      className="rounded-3xl"
                    />
                    <View className="mt-4 flex-row items-center justify-between">
                      <View>
                        <Text className="text-xs uppercase tracking-[0.3em] text-blue-500">
                          Guest
                        </Text>
                        <Text className="text-base font-semibold text-slate-900">
                          {selectedBooking.guestName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-xs uppercase tracking-[0.3em] text-blue-500">
                          Stay
                        </Text>
                        <Text className="text-base font-semibold text-slate-900">
                          {formatDateRange(selectedBooking.checkIn, selectedBooking.checkOut)}
                        </Text>
                      </View>
                    </View>
                    <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-sm text-slate-500">Amount paid</Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatCurrency(selectedBooking.amountPaid)}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-slate-500">Caution fee</Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {formatCurrency(selectedBooking.cautionFee)}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-slate-500">Guests</Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {selectedBooking.numberOfOccupants}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-sm text-slate-500">Reference</Text>
                        <Text className="text-sm font-semibold text-slate-900">
                          {selectedBooking.referenceNumber}
                        </Text>
                      </View>
                    </View>
                    {selectedBooking.listingId ? (
                      <Pressable
                        className="mt-6 flex-row items-center justify-center rounded-full bg-blue-600 py-4"
                        onPress={handleOpenListing}>
                        <Feather name="external-link" size={18} color="#fff" />
                        <Text className="ml-2 text-base font-semibold text-white">
                          View Apartment
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
