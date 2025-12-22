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

import { LoadingImage } from '@/components/LoadingImage';
import { LISTINGS } from '@/data/listings';

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
  pointsEarned: number;
  coverImage?: string | null;
  avatar?: string | null;
  rating?: number | null;
};

type BookingSeed = {
  id: string;
  listingId: string;
  status: BookingStatus;
  guestName: string;
  checkIn: string;
  checkOut: string;
  amountPaid: number;
  cautionFee: number;
  pointsEarned: number;
  avatar?: string | null;
  rating?: number | null;
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

const BOOKING_SEEDS: BookingSeed[] = [
  {
    id: 'booking-001',
    listingId: 'saf-001',
    status: 'current',
    guestName: 'Chidinma U.',
    checkIn: '2025-02-14',
    checkOut: '2025-02-16',
    amountPaid: 130000,
    cautionFee: 50000,
    pointsEarned: 120,
    avatar: AVATARS[0],
  },
  {
    id: 'booking-002',
    listingId: 'saf-003',
    status: 'current',
    guestName: 'Folarin O.',
    checkIn: '2025-02-15',
    checkOut: '2025-02-19',
    amountPaid: 560000,
    cautionFee: 120000,
    pointsEarned: 320,
    avatar: AVATARS[1],
  },
  {
    id: 'booking-003',
    listingId: 'saf-006',
    status: 'upcoming',
    guestName: 'Amina B.',
    checkIn: '2025-03-04',
    checkOut: '2025-03-07',
    amountPaid: 960000,
    cautionFee: 150000,
    pointsEarned: 410,
    avatar: AVATARS[2],
  },
  {
    id: 'booking-004',
    listingId: 'saf-010',
    status: 'upcoming',
    guestName: 'Kelvin N.',
    checkIn: '2025-03-12',
    checkOut: '2025-03-15',
    amountPaid: 585000,
    cautionFee: 100000,
    pointsEarned: 240,
    avatar: AVATARS[3],
  },
  {
    id: 'booking-005',
    listingId: 'saf-002',
    status: 'past',
    guestName: 'Olamide S.',
    checkIn: '2024-12-10',
    checkOut: '2024-12-12',
    amountPaid: 240000,
    cautionFee: 80000,
    pointsEarned: 180,
    avatar: AVATARS[4],
    rating: 4.8,
  },
  {
    id: 'booking-006',
    listingId: 'saf-009',
    status: 'past',
    guestName: 'Tayo A.',
    checkIn: '2024-11-22',
    checkOut: '2024-11-26',
    amountPaid: 1920000,
    cautionFee: 220000,
    pointsEarned: 520,
    avatar: AVATARS[5],
    rating: 4.9,
  },
  {
    id: 'booking-007',
    listingId: 'saf-004',
    status: 'past',
    guestName: 'Zara L.',
    checkIn: '2024-10-05',
    checkOut: '2024-10-08',
    amountPaid: 435000,
    cautionFee: 90000,
    pointsEarned: 210,
    avatar: AVATARS[1],
    rating: 4.6,
  },
  {
    id: 'booking-008',
    listingId: 'saf-008',
    status: 'upcoming',
    guestName: 'Femi O.',
    checkIn: '2025-04-02',
    checkOut: '2025-04-05',
    amountPaid: 234000,
    cautionFee: 60000,
    pointsEarned: 130,
    avatar: AVATARS[0],
  },
  {
    id: 'booking-009',
    listingId: 'saf-011',
    status: 'current',
    guestName: 'Nora A.',
    checkIn: '2025-02-18',
    checkOut: '2025-02-20',
    amountPaid: 176000,
    cautionFee: 65000,
    pointsEarned: 95,
    avatar: AVATARS[4],
  },
  {
    id: 'booking-010',
    listingId: 'saf-012',
    status: 'upcoming',
    guestName: 'Somto E.',
    checkIn: '2025-03-20',
    checkOut: '2025-03-23',
    amountPaid: 504000,
    cautionFee: 110000,
    pointsEarned: 210,
    avatar: AVATARS[3],
  },
];

const LISTING_MAP = LISTINGS.reduce<Record<string, typeof LISTINGS[number]>>((acc, listing) => {
  acc[listing.id] = listing;
  return acc;
}, {});

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const startLabel = startDate.toLocaleDateString('en-US', options);
  const endLabel = endDate.toLocaleDateString('en-US', {
    ...options,
    year: startDate.getFullYear() === endDate.getFullYear() ? undefined : 'numeric',
  });
  return `${startLabel} - ${endLabel}`;
};

export default function BookingsScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [activeFilter, setActiveFilter] = useState<BookingStatus>('current');
  const [selectedBooking, setSelectedBooking] = useState<BookingListItem | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');
      SecureStore.getItemAsync('authToken')
        .then((token) => {
          if (isActive) setAuthStatus(token ? 'signed-out' : 'signed-in');
        })
        .catch(() => {
          if (isActive) setAuthStatus('signed-out');
        });

      return () => {
        isActive = false;
      };
    }, [])
  );

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(timer);
  }, [activeFilter]);

  const bookings = useMemo<BookingListItem[]>(() => {
    return BOOKING_SEEDS.filter((booking) => booking.status === activeFilter).map((booking) => {
      const listing = LISTING_MAP[booking.listingId];
      return {
        id: booking.id,
        listingId: listing?.id ?? null,
        apartmentName: listing?.name ?? 'Apartment',
        apartmentType: listing?.apartmentType ?? '—',
        location: listing?.area ?? '—',
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        amountPaid: booking.amountPaid,
        cautionFee: booking.cautionFee,
        pointsEarned: booking.pointsEarned,
        coverImage: listing?.coverPhoto ?? listing?.gallery?.[0],
        avatar: booking.avatar,
        rating: booking.rating ?? null,
      };
    });
  }, [activeFilter]);

  const pagedBookings = useMemo(() => bookings.slice(0, page * PAGE_SIZE), [bookings, page]);
  const hasMore = pagedBookings.length < bookings.length;

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadMoreError(null);
    setLoadingMore(true);
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 350);
  };

  const handleChangeFilter = (status: BookingStatus) => {
    if (status === activeFilter) {
      handleRefresh();
      return;
    }
    setActiveFilter(status);
    setSelectedBooking(null);
    setLoadMoreError(null);
    setPage(1);
  };

  const handleRefresh = () => {
    setLoadMoreError(null);
    setRefreshing(true);
    setTimeout(() => {
      setPage(1);
      setRefreshing(false);
    }, 400);
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
          source={{ uri: item.avatar ?? AVATARS[0] }}
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
            <Text className="text-xs font-semibold uppercase text-blue-500">{item.apartmentType}</Text>
          </View>
          <Text className="text-sm text-slate-500">{item.guestName}</Text>
          <Text className="text-xs text-slate-400">{formatDateRange(item.checkIn, item.checkOut)}</Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="credit-card" size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-800">{formatCurrency(item.amountPaid)}</Text>
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
          <Feather name="award" size={16} color="#0f172a" />
          <Text className="text-sm font-semibold text-slate-800">+{item.pointsEarned} pts</Text>
        </View>
      </View>
      {activeFilter === 'past' && item.rating != null ? (
        <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-amber-50/80 px-3 py-2">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Guest rating
          </Text>
          <View className="flex-row items-center gap-2">
            <Feather name="star" size={16} color="#b45309" />
            <Text className="text-sm font-semibold text-amber-700">{item.rating.toFixed(1)}</Text>
          </View>
        </View>
      ) : null}
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
            <View className="items-center rounded-3xl border border-blue-100 bg-white px-6 py-10 shadow-sm shadow-blue-100">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Feather name="calendar" size={24} color="#1d4ed8" />
              </View>
              <Text className="mt-6 text-center text-2xl font-bold text-slate-900">
                Sign in to see bookings
              </Text>
              <Text className="mt-2 text-center text-sm text-slate-500">
                Keep track of upcoming stays, rewards, and booking history in one place.
              </Text>
              <Pressable
                className="mt-6 w-full items-center justify-center rounded-full border border-blue-500/30 bg-blue-600 px-6 py-4 shadow-sm shadow-blue-200"
                onPress={() => router.push('/auth/login')}>
                <Text className="text-base font-semibold text-white">Sign in</Text>
              </Pressable>
              <Pressable
                className="mt-3 w-full items-center justify-center rounded-full border border-blue-200 bg-white px-6 py-4 shadow-sm shadow-slate-100"
                onPress={() => router.push('/auth/sign-up')}>
                <Text className="text-base font-semibold text-blue-700">Create account</Text>
              </Pressable>
            </View>
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
            data={pagedBookings}
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
                        uri: selectedBooking.coverImage ?? LISTINGS[0]?.coverPhoto ?? AVATARS[0],
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
                        <Text className="text-sm text-slate-500">Rewards</Text>
                        <Text className="text-sm font-semibold text-blue-600">
                          +{selectedBooking.pointsEarned} pts
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      className="mt-6 flex-row items-center justify-center rounded-full bg-blue-600 py-4"
                      onPress={handleOpenListing}>
                      <Feather name="external-link" size={18} color="#fff" />
                      <Text className="ml-2 text-base font-semibold text-white">
                        View Apartment
                      </Text>
                    </Pressable>
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
