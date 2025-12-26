import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { BookingOption, LISTINGS } from '@/data/listings';
import { V2_EXPLORE_LISTINGS } from '@/queries/v2ExploreListings';

const TYPES = ['Single shared', 'Studio', '1 bed', '2 bed', '3 bed', '4 bed', '5 bed'];

const AMENITIES = [
  'wifi',
  'swimming pool',
  'ac',
  'dining area',
  'fans',
  'smart tv',
  'cinema',
  'balcony',
  'gym',
];

const GUEST_OPTIONS = ['1', '2', '3', '4', '5', '6+'];
const PAGE_SIZE = 10;

type BookingOptionMeta = {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  containerClass: string;
  textClass: string;
  iconColor: string;
};

const getBookingOptionMeta = (option: BookingOption): BookingOptionMeta => {
  if (option === 'room') {
    return {
      label: 'Single room',
      icon: 'key',
      containerClass: 'border-amber-200 bg-amber-50',
      textClass: 'text-amber-700',
      iconColor: '#b45309',
    };
  }

  return {
    label: 'Entire apartment',
    icon: 'home',
    containerClass: 'border-blue-200 bg-blue-50',
    textClass: 'text-blue-700',
    iconColor: '#1d4ed8',
  };
};

type FilterState = {
  minBudget: string;
  maxBudget: string;
  type: string;
  guests: string;
  amenities: string[];
  checkIn: Date | null;
  checkOut: Date | null;
};

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isPast: boolean;
  isStart: boolean;
  isEnd: boolean;
  isBetween: boolean;
};

const createInitialFilters = (): FilterState => ({
  minBudget: '',
  maxBudget: '',
  type: '',
  guests: '',
  amenities: [],
  checkIn: null,
  checkOut: null,
});

const formatCurrencyInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString();
};

const parseCurrencyInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;
  return Number(digitsOnly);
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatDateDisplay = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatQueryDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const startOfMonth = (date: Date) => {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const buildCalendarDays = (
  calendarMonth: Date,
  checkIn: Date | null,
  checkOut: Date | null
): CalendarDay[] => {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - start.getDay());
  const gridEnd = new Date(end);
  gridEnd.setDate(end.getDate() + (6 - end.getDay()));

  const days: CalendarDay[] = [];
  const today = startOfDay(new Date());
  const startDate = checkIn ? startOfDay(checkIn) : null;
  const endDate = checkOut ? startOfDay(checkOut) : null;

  for (
    let cursor = new Date(gridStart);
    cursor <= gridEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    const date = new Date(cursor);
    const normalized = startOfDay(date);
    const isStart = startDate ? normalized.getTime() === startDate.getTime() : false;
    const isEnd = endDate ? normalized.getTime() === endDate.getTime() : false;
    const isBetween = startDate && endDate && normalized > startDate && normalized < endDate;

    days.push({
      date,
      isCurrentMonth: date.getMonth() === month,
      isPast: normalized < today,
      isStart,
      isEnd,
      isBetween: Boolean(isBetween),
    });
  }

  return days;
};

type ExploreListing = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  pointsToWin: number;
  maxNumberOfGuestsAllowed: number;
  bookingOptions: BookingOption[];
};

type ExploreListingResponse = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  pointsToWin: number;
  maxNumberOfGuestsAllowed: number;
  bookableOptions: string[];
  propertyPhotos: {
    id: string;
    tinyUrl: string;
    smallUrl: string;
    mediumUrl: string;
    largeUrl: string;
    xtraLargeUrl: string;
  }[];
};

type V2ExploreListingsResponse = {
  v2ExploreListings: ExploreListingResponse[];
};

type V2ExploreListingsVariables = {
  minBudget?: number | null;
  maxBudget?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  numberOfGuests?: number | null;
  amenities?: string[] | null;
  limit: number;
  offset: number;
};

const mapBookableOptions = (options: string[] | null | undefined): BookingOption[] => {
  const mapped: BookingOption[] = [];
  if (options?.includes('single_room')) mapped.push('room');
  if (options?.includes('entire_apartment')) mapped.push('entire');
  return mapped.length ? mapped : ['entire'];
};

const mapExploreListing = (listing: ExploreListingResponse): ExploreListing => ({
  id: listing.id,
  name: listing.name,
  apartmentType: listing.apartmentType,
  coverPhoto:
    listing.coverPhoto ||
    listing.propertyPhotos?.[0]?.mediumUrl ||
    listing.propertyPhotos?.[0]?.smallUrl ||
    '',
  description: listing.description,
  minimumPrice: listing.minimumPrice,
  rating: listing.rating ?? 0,
  area: listing.area,
  pointsToWin: listing.pointsToWin,
  maxNumberOfGuestsAllowed: listing.maxNumberOfGuestsAllowed,
  bookingOptions: mapBookableOptions(listing.bookableOptions),
});

const filterListings = (filter: FilterState) => {
  const minBudget = parseCurrencyInput(filter.minBudget);
  const maxBudget = parseCurrencyInput(filter.maxBudget);
  const numberOfGuests = filter.guests
    ? filter.guests === '6+'
      ? 6
      : Number(filter.guests)
    : null;

  return LISTINGS.filter((listing) => {
    if (filter.type && listing.apartmentType !== filter.type) return false;
    if (minBudget !== null && listing.minimumPrice < minBudget) return false;
    if (maxBudget !== null && listing.minimumPrice > maxBudget) return false;
    if (numberOfGuests && listing.maxNumberOfGuestsAllowed < numberOfGuests) return false;
    if (filter.amenities.length > 0) {
      const hasAll = filter.amenities.every((amenity) => listing.amenities.includes(amenity));
      if (!hasAll) return false;
    }
    return true;
  });
};

export default function ExploreScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const [filters, setFilters] = useState<FilterState>(createInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createInitialFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(true);

  const queryVariables = useMemo<V2ExploreListingsVariables>(() => {
    const minBudget = parseCurrencyInput(appliedFilters.minBudget);
    const maxBudget = parseCurrencyInput(appliedFilters.maxBudget);
    const numberOfGuests = appliedFilters.guests
      ? appliedFilters.guests === '6+'
        ? 6
        : Number(appliedFilters.guests)
      : null;

    return {
      minBudget,
      maxBudget,
      checkIn: appliedFilters.checkIn ? formatQueryDate(appliedFilters.checkIn) : null,
      checkOut: appliedFilters.checkOut ? formatQueryDate(appliedFilters.checkOut) : null,
      numberOfGuests,
      amenities: appliedFilters.amenities.length > 0 ? appliedFilters.amenities : null,
      limit: PAGE_SIZE,
      offset: 0,
    };
  }, [appliedFilters]);

  const { data, error, fetchMore, refetch } = useQuery<
    V2ExploreListingsResponse,
    V2ExploreListingsVariables
  >(
    V2_EXPLORE_LISTINGS,
    {
      variables: queryVariables,
      notifyOnNetworkStatusChange: true,
      skip: !isFocused,
    }
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, filters.checkIn, filters.checkOut),
    [calendarMonth, filters.checkIn, filters.checkOut]
  );

  const filteredListings = useMemo(() => filterListings(appliedFilters), [appliedFilters]);

  const remoteListings = useMemo(() => {
    const items = data?.v2ExploreListings ?? [];
    const mapped = items.map(mapExploreListing);
    if (appliedFilters.type) {
      return mapped.filter((listing) => listing.apartmentType === appliedFilters.type);
    }
    return mapped;
  }, [data, appliedFilters.type]);

  const remoteListingCount = data?.v2ExploreListings?.length ?? 0;
  const useRemoteListings = Boolean(data?.v2ExploreListings) && !error;

  const listings = useMemo<ExploreListing[]>(
    () =>
      useRemoteListings
        ? remoteListings
        : (filteredListings.slice(0, page * PAGE_SIZE) as ExploreListing[]),
    [useRemoteListings, remoteListings, filteredListings, page]
  );

  const hasMore = useRemoteListings
    ? remoteHasMore
    : listings.length < filteredListings.length;

  useEffect(() => {
    setPage(1);
    setRemoteHasMore(true);
  }, [appliedFilters]);

  useEffect(() => {
    if (useRemoteListings && data?.v2ExploreListings && data.v2ExploreListings.length < PAGE_SIZE) {
      setRemoteHasMore(false);
    }
  }, [data, useRemoteListings]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    if (useRemoteListings) {
      try {
        const result = await fetchMore({
          variables: {
            ...queryVariables,
            offset: remoteListingCount,
          },
          updateQuery: (previous, { fetchMoreResult }) => {
            if (!fetchMoreResult?.v2ExploreListings) return previous;
            return {
              v2ExploreListings: [
                ...(previous?.v2ExploreListings ?? []),
                ...fetchMoreResult.v2ExploreListings,
              ],
            };
          },
        });
        const fetched = result.data?.v2ExploreListings ?? [];
        if (fetched.length < PAGE_SIZE) {
          setRemoteHasMore(false);
        }
      } finally {
        setLoadingMore(false);
      }
      return;
    }
    setTimeout(() => {
      setPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 300);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (useRemoteListings) {
      try {
        await refetch({ ...queryVariables, offset: 0 });
        setRemoteHasMore(true);
      } finally {
        setRefreshing(false);
      }
      return;
    }
    setTimeout(() => {
      setPage(1);
      setRefreshing(false);
    }, 350);
  };

  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((a) => a !== amenity) : [...prev.amenities, amenity],
      };
    });
  };

  const resetFilters = () => {
    const nextFilters = createInitialFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setFilterSheetOpen(false);
  };

  const applyFilters = () => {
    const nextApplied = { ...filters };
    setFilterSheetOpen(false);
    setAppliedFilters(nextApplied);
  };

  const handleSelectDate = (date: Date) => {
    const normalized = startOfDay(date);
    const today = startOfDay(new Date());
    if (normalized < today) return;

    setFilters((prev) => {
      if (!prev.checkIn || (prev.checkIn && prev.checkOut)) {
        return { ...prev, checkIn: normalized, checkOut: null };
      }
      if (prev.checkIn && !prev.checkOut) {
        if (normalized < prev.checkIn) {
          return { ...prev, checkIn: normalized, checkOut: null };
        }
        return { ...prev, checkOut: normalized };
      }
      return prev;
    });
  };

  const clearDates = () => {
    setFilters((prev) => ({ ...prev, checkIn: null, checkOut: null }));
  };

  const renderApartment = ({ item }: { item: ExploreListing }) => {
    return (
      <Pressable
        className="mb-6 overflow-hidden rounded-[32px] bg-white shadow-lg shadow-slate-200"
        onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}>
        <LoadingImageBackground
          source={{ uri: item.coverPhoto }}
          className="h-56 w-full overflow-hidden"
          imageStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
          <View className="flex-1 flex-row items-start justify-between p-4">
            <Text className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800">
              {item.apartmentType || 'Apartment'}
            </Text>
            <View className="flex-row items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
              <Feather name="star" size={14} color="#fde047" />
              <Text className="text-xs font-semibold text-white">{item.rating.toFixed(1)}</Text>
            </View>
          </View>
        </LoadingImageBackground>

        <View className="space-y-2 px-5 py-5">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-xl font-semibold text-slate-900" numberOfLines={2}>
              {item.name}
            </Text>
            <Text className="text-base font-semibold text-blue-600">
              ₦{item.minimumPrice.toLocaleString()}
              <Text className="text-xs font-medium text-slate-500"> / night</Text>
            </Text>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <Feather name="map-pin" size={14} color="#94a3b8" />
            <Text className="text-sm text-slate-500">{item.area}</Text>
          </View>
          <Text className="text-sm text-slate-500" numberOfLines={2} ellipsizeMode="tail">
            {item.description}
          </Text>
          <View className="mt-3">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Bookable as
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {item.bookingOptions.map((option) => {
                const meta = getBookingOptionMeta(option);
                return (
                  <View
                    key={`${item.id}-${option}`}
                    className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${meta.containerClass}`}>
                    <Feather name={meta.icon} size={12} color={meta.iconColor} />
                    <Text className={`text-xs font-semibold ${meta.textClass}`}>{meta.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Feather name="users" size={16} color="#64748b" />
              <Text className="text-sm font-medium text-slate-600">
                Up to {item.maxNumberOfGuestsAllowed} guests
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              <Feather name="award" size={16} color="#0f172a" />
              <Text className="text-sm font-semibold text-slate-800">+{item.pointsToWin} pts/night</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center justify-between px-6 pt-4">
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
            Safarihills
          </Text>
          <Text className="mt-1 text-3xl font-bold text-slate-900">Welcome back, Adim</Text>
        </View>
        <Pressable
          className="h-12 w-12 items-center justify-center rounded-full bg-blue-100"
          onPress={() => router.push('/(tabs)/profile')}>
          <Text className="text-lg font-bold text-blue-900">AE</Text>
        </Pressable>
      </View>

      <View className="mt-6 px-6">
        <Pressable
          className="flex-row items-center justify-between rounded-3xl border border-blue-100 bg-white px-5 py-4 shadow-sm shadow-blue-50"
          onPress={() => setFilterSheetOpen((prev) => !prev)}>
          <View>
            <Text className="text-xs uppercase tracking-[0.3em] text-blue-500">Filters</Text>
            <Text className="text-base font-semibold text-slate-900">Budget, type, amenities</Text>
          </View>
          <Feather name="sliders" size={22} color="#1d4ed8" />
        </Pressable>

        {filterSheetOpen && (
          <View className="mt-4 max-h-[70%] rounded-3xl border border-slate-200 bg-white">
            <ScrollView
              className="px-5 py-5"
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-slate-900">Quick filters</Text>
                <Pressable onPress={resetFilters}>
                  <Text className="text-sm font-semibold text-blue-600">Reset</Text>
                </Pressable>
              </View>

              <View className="mt-4">
                <Text className="text-xs font-semibold uppercase text-slate-400">Dates</Text>
                <View className="mt-3 flex-row gap-3">
                  <Pressable
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    onPress={() => setCalendarVisible(true)}>
                    <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                    <Text className="mt-1 text-base font-semibold text-slate-900">
                      {filters.checkIn ? formatDateDisplay(filters.checkIn) : 'Add date'}
                    </Text>
                  </Pressable>
                  <Pressable
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    onPress={() => setCalendarVisible(true)}>
                    <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                    <Text className="mt-1 text-base font-semibold text-slate-900">
                      {filters.checkOut ? formatDateDisplay(filters.checkOut) : 'Add date'}
                    </Text>
                  </Pressable>
                </View>
                <View className="mt-2 flex-row items-center justify-between">
                  <Pressable onPress={clearDates}>
                    <Text className="text-sm font-semibold text-blue-600">Clear dates</Text>
                  </Pressable>
                  <Text className="text-xs font-medium text-slate-500">Past dates disabled</Text>
                </View>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-semibold uppercase text-slate-400">Budget per night (₦)</Text>
                <View className="mt-3 flex-row gap-3">
                  <TextInput
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-base font-semibold text-slate-900"
                    keyboardType="number-pad"
                    placeholder="Min"
                    placeholderTextColor="#94a3b8"
                    value={filters.minBudget}
                    onChangeText={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        minBudget: formatCurrencyInput(value),
                      }))
                    }
                  />
                  <TextInput
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-base font-semibold text-slate-900"
                    keyboardType="number-pad"
                    placeholder="Max"
                    placeholderTextColor="#94a3b8"
                    value={filters.maxBudget}
                    onChangeText={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        maxBudget: formatCurrencyInput(value),
                      }))
                    }
                  />
                </View>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-semibold uppercase text-slate-400">Apartment type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                  <View className="flex-row gap-3">
                    {TYPES.map((type) => {
                      const isActive = filters.type === type;
                      return (
                        <Pressable
                          key={type}
                          className={`rounded-full px-4 py-2 ${
                            isActive ? 'bg-blue-600' : 'border border-slate-200 bg-white'
                          }`}
                          onPress={() =>
                            setFilters((prev) => ({
                              ...prev,
                              type: isActive ? '' : type,
                            }))
                          }>
                          <Text
                            className={`text-sm font-semibold ${
                              isActive ? 'text-white' : 'text-slate-600'
                            }`}>
                            {type}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-semibold uppercase text-slate-400">Guests</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {GUEST_OPTIONS.map((option) => {
                    const isActive = filters.guests === option;
                    return (
                      <Pressable
                        key={option}
                        className={`rounded-full border px-4 py-2 ${
                          isActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                        onPress={() =>
                          setFilters((prev) => ({
                            ...prev,
                            guests: isActive ? '' : option,
                          }))
                        }>
                        <Text
                          className={`text-sm font-semibold ${
                            isActive ? 'text-blue-700' : 'text-slate-600'
                          }`}>
                          {option} guests
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="mt-5">
                <Text className="text-xs font-semibold uppercase text-slate-400">Amenities</Text>
                <View className="mt-3 flex-row flex-wrap gap-3">
                  {AMENITIES.map((amenity) => {
                    const isActive = filters.amenities.includes(amenity);
                    return (
                      <Pressable
                        key={amenity}
                        className={`rounded-full border px-4 py-2 ${
                          isActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                        }`}
                        onPress={() => toggleAmenity(amenity)}>
                        <Text
                          className={`text-sm font-semibold ${
                            isActive ? 'text-blue-700' : 'text-slate-600'
                          }`}>
                          {amenity}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Pressable
                className="mt-6 mb-6 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3"
                onPress={applyFilters}>
                <Text className="text-base font-semibold text-white">Apply filters</Text>
              </Pressable>
            </ScrollView>
          </View>
        )}
      </View>

      <FlatList
        data={listings}
        renderItem={renderApartment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
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
        ListFooterComponent={
          <View className="py-4">
            {loadingMore && (
              <View className="items-center justify-center py-2">
                <ActivityIndicator color="#1d4ed8" />
              </View>
            )}
            {!loadingMore && !hasMore && listings.length > 0 && (
              <Text className="text-center text-sm text-slate-400">You are all caught up.</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="py-24">
            {refreshing ? (
              <View className="items-center justify-center">
                <ActivityIndicator color="#1d4ed8" size="large" />
                <Text className="mt-3 text-sm font-semibold text-slate-500">
                  Loading apartments...
                </Text>
              </View>
            ) : (
              <Text className="text-center text-sm font-semibold text-slate-500">
                No apartments found with the selected filters.
              </Text>
            )}
          </View>
        }
      />

      <Modal
        transparent
        animationType="slide"
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="max-h-[80%] rounded-t-3xl bg-white p-5">
            <View className="flex-row items-center justify-between">
              <Pressable
                disabled={calendarMonth.getTime() === startOfMonth(new Date()).getTime()}
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() - 1, 1);
                    return startOfMonth(next);
                  })
                }
                className="rounded-full p-2">
                <Feather
                  name="chevron-left"
                  size={22}
                  color={
                    calendarMonth.getTime() === startOfMonth(new Date()).getTime()
                      ? '#cbd5e1'
                      : '#0f172a'
                  }
                />
              </Pressable>
              <Text className="text-base font-semibold text-slate-900">
                {calendarMonth.toLocaleString('default', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() + 1, 1);
                    return startOfMonth(next);
                  })
                }
                className="rounded-full p-2">
                <Feather name="chevron-right" size={22} color="#0f172a" />
              </Pressable>
            </View>

            <View className="mt-4 flex-row justify-between">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text
                  key={day}
                  className="flex-1 text-center text-xs font-semibold uppercase text-slate-400">
                  {day}
                </Text>
              ))}
            </View>

            <View className="mt-2 flex-row flex-wrap">
              {calendarDays.map((day) => {
                const isDisabled = day.isPast;
                const isSelected = day.isStart || day.isEnd;
                const dayClasses = [
                  'm-[2px] h-12 w-[13.6%] items-center justify-center rounded-full',
                  isSelected ? 'bg-blue-600' : day.isBetween ? 'bg-blue-50' : 'bg-transparent',
                  !day.isCurrentMonth ? 'opacity-40' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <Pressable
                    key={day.date.toDateString()}
                    disabled={isDisabled}
                    className={dayClasses}
                    onPress={() => handleSelectDate(day.date)}>
                    <Text
                      className={`text-sm font-semibold ${
                        isSelected ? 'text-white' : isDisabled ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                      {day.date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Pressable className="rounded-2xl border border-slate-200 px-4 py-3" onPress={clearDates}>
                <Text className="text-sm font-semibold text-slate-700">Clear dates</Text>
              </Pressable>
              <View className="flex-row gap-3">
                <Pressable
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                  onPress={() => setCalendarVisible(false)}>
                  <Text className="text-sm font-semibold text-slate-700">Close</Text>
                </Pressable>
                <Pressable
                  className="rounded-2xl bg-blue-600 px-4 py-3"
                  onPress={() => setCalendarVisible(false)}>
                  <Text className="text-sm font-semibold text-white">Save dates</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
