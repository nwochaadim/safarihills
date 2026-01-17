import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';
import { LoadingImage } from '@/components/LoadingImage';
import { SkeletonBar } from '@/components/SkeletonBar';
import { useSkeletonPulse } from '@/hooks/use-skeleton-pulse';
import { AuthStatus } from '@/lib/authStatus';
import { DELETE_BOOKING } from '@/mutations/deleteBooking';
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

type DeleteBookingResponse = {
  deleteBooking: {
    id: string | null;
    errors: string[] | string | null;
  } | null;
};

type DeleteBookingVariables = {
  referenceNumber: string;
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

const BookingsSkeletonList = () => {
  const pulse = useSkeletonPulse();

  return (
    <View className="pt-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <View
          key={`booking-skeleton-${index}`}
          className="mb-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
          <View className="flex-row items-center gap-4">
            <SkeletonBar pulse={pulse} className="h-16 w-16 rounded-2xl" />
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <SkeletonBar pulse={pulse} className="h-4 w-32 rounded-full" />
                <SkeletonBar pulse={pulse} className="h-3 w-20 rounded-full" />
              </View>
              <SkeletonBar pulse={pulse} className="mt-2 h-3 w-24 rounded-full" />
              <SkeletonBar pulse={pulse} className="mt-2 h-3 w-28 rounded-full" />
            </View>
          </View>
          <View className="mt-4 flex-row items-center justify-between">
            <SkeletonBar pulse={pulse} className="h-3 w-20 rounded-full" />
            <SkeletonBar pulse={pulse} className="h-3 w-24 rounded-full" />
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <SkeletonBar pulse={pulse} className="h-3 w-24 rounded-full" />
            <SkeletonBar pulse={pulse} className="h-3 w-20 rounded-full" />
          </View>
        </View>
      ))}
    </View>
  );
};

export default function BookingsScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [activeFilter, setActiveFilter] = useState<BookingStatus>('current');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [remoteHasMore, setRemoteHasMore] = useState(true);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(
    null
  );
  const { paymentStatus, message } = useLocalSearchParams<{
    paymentStatus?: string | string[];
    message?: string | string[];
  }>();
  const [paymentBanner, setPaymentBanner] = useState<string | null>(null);
  const paymentStatusValue = Array.isArray(paymentStatus) ? paymentStatus[0] : paymentStatus;
  const paymentMessageValue = Array.isArray(message) ? message[0] : message;

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
  const [deleteBooking] = useMutation<DeleteBookingResponse, DeleteBookingVariables>(
    DELETE_BOOKING
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');
      AuthStatus.isSignedIn().then((signedIn) => {
        if (isActive) setAuthStatus(signedIn ? 'signed-in' : 'signed-out');
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

  useEffect(() => {
    if (paymentStatusValue !== 'success') return;
    const bannerMessage = paymentMessageValue?.trim() || 'Payment completed successfully.';
    setPaymentBanner(bannerMessage);
    const timer = setTimeout(() => {
      setPaymentBanner(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [paymentStatusValue, paymentMessageValue]);

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
    setLoadMoreError(null);
    setDeleteError(null);
    setDeletingBookingId(null);
  };

  const handleRefresh = async () => {
    setLoadMoreError(null);
    setDeleteError(null);
    setDeletingBookingId(null);
    setRefreshing(true);
    try {
      await refetch(queryVariables);
      setRemoteHasMore(true);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteBooking = async (booking: BookingListItem) => {
    const referenceNumber = booking.referenceNumber?.trim();
    if (!referenceNumber || referenceNumber === '—') {
      setDeleteError({
        id: booking.id,
        message: 'Booking reference is missing.',
      });
      return;
    }
    setDeleteError(null);
    setDeletingBookingId(booking.id);
    try {
      const { data: response } = await deleteBooking({
        variables: { referenceNumber },
      });
      const errors = response?.deleteBooking?.errors;
      if (Array.isArray(errors) && errors.length) {
        setDeleteError({ id: booking.id, message: errors.join(' ') });
        return;
      }
      if (typeof errors === 'string' && errors.trim()) {
        setDeleteError({ id: booking.id, message: errors });
        return;
      }
      await refetch(queryVariables);
      setRemoteHasMore(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete booking right now.';
      setDeleteError({ id: booking.id, message });
    } finally {
      setDeletingBookingId(null);
    }
  };

  const confirmDeleteBooking = (booking: BookingListItem) => {
    if (deletingBookingId) return;
    Alert.alert(
      'Delete booking?',
      'This will remove your booking request. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void handleDeleteBooking(booking),
        },
      ]
    );
  };

  const renderBookingCard = ({ item }: { item: BookingListItem }) => {
    const paymentState = item.state?.trim().toLowerCase();
    const isPaymentPending = paymentState === 'payment_pending';
    const isPaymentConfirmed = paymentState === 'payment_confirmed';
    const isDeleting = deletingBookingId === item.id;
    const deleteMessage = deleteError?.id === item.id ? deleteError.message : null;
    const statusBadge = isPaymentPending
      ? {
          label: 'Payment pending',
          icon: 'clock' as const,
          containerClass: 'border-amber-200 bg-amber-50',
          textClass: 'text-amber-700',
          iconColor: '#b45309',
        }
      : isPaymentConfirmed
        ? {
            label: 'Payment confirmed',
            icon: 'check-circle' as const,
            containerClass: 'border-emerald-200 bg-emerald-50',
            textClass: 'text-emerald-700',
            iconColor: '#047857',
          }
        : null;

    return (
      <View className="mb-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
        <Pressable onPress={() => router.push(`/booking/summary/${item.id}`)}>
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
                <View className="items-end gap-1">
                  <Text className="text-xs font-semibold uppercase text-blue-500">
                    {item.apartmentType}
                  </Text>
                  {statusBadge ? (
                    <View
                      className={`flex-row items-center gap-1 rounded-full border px-2 py-0.5 ${statusBadge.containerClass}`}>
                      <Feather name={statusBadge.icon} size={10} color={statusBadge.iconColor} />
                      <Text
                        className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${statusBadge.textClass}`}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  ) : item.state ? (
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
              <Text className="text-sm font-semibold text-slate-600">
                {item.location}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="users" size={16} color="#0f172a" />
              <Text className="text-sm font-semibold text-slate-800">
                {item.numberOfOccupants} guests
              </Text>
            </View>
          </View>
        </Pressable>

        {isPaymentPending ? (
          <View className="mt-4 border-t border-slate-100 pt-3">
            <Pressable
              className={`items-center justify-center rounded-full py-3 ${
                isDeleting ? 'bg-rose-200' : 'bg-rose-600'
              }`}
              disabled={isDeleting}
              onPress={() => confirmDeleteBooking(item)}>
              <Text className="text-sm font-semibold text-white">
                {isDeleting ? 'Deleting...' : 'Delete booking'}
              </Text>
            </Pressable>
            {deleteMessage ? (
              <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-600">
                  {deleteMessage}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

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
          {paymentBanner ? (
            <View className="mx-6 mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
              <View className="flex-row items-center gap-2">
                <Feather name="check-circle" size={16} color="#047857" />
                <Text className="text-sm font-semibold text-emerald-700">
                  {paymentBanner}
                </Text>
              </View>
            </View>
          ) : null}
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
                <BookingsSkeletonList />
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

        </>
      )}
    </SafeAreaView>
  );
}
