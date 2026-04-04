import { useLazyQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { ComponentProps, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingImage } from '@/components/LoadingImage';
import { SafeAreaView } from '@/components/tab-safe-area-view';

import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { V2_EXPLORE_LISTINGS } from '@/queries/v2ExploreListings';

type BookingOption = 'room' | 'entire';

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
const BOOKING_ALERT_DURATION_MS = 6000;
const BOOKING_ALERT_INTERVAL_MS = 2 * 60 * 1000;
const BOOKING_ALERT_INITIAL_DELAY_MS = 3000;
const FALLBACK_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80';
const PROMO_TAGS = [
  'Free Night',
  'Late Night Discount',
  '5% Off',
  'Easter Promo',
  'Weekend Escape',
  'Long Stay Perk',
  'Breakfast Bonus',
];
const BOOKING_ALERT_NAMES = ['Chinyere', 'Tobi', 'Mariam', 'Ifeanyi', 'Amaka', 'Dami'];
const PROMO_TAG_TONES = [
  {
    containerClass: 'border-emerald-200 bg-emerald-50',
    textClass: 'text-emerald-700',
    iconColor: '#047857',
  },
  {
    containerClass: 'border-amber-200 bg-amber-50',
    textClass: 'text-amber-700',
    iconColor: '#b45309',
  },
  {
    containerClass: 'border-blue-200 bg-blue-50',
    textClass: 'text-blue-700',
    iconColor: '#1d4ed8',
  },
];

type DiscoverFilterId =
  | 'all'
  | 'top-picks-lekki'
  | 'trending-lekki'
  | 'hot-picks-ikeja'
  | 'best-deals-vi';

type DiscoverFilterConfig = {
  id: Exclude<DiscoverFilterId, 'all'>;
  title: string;
  subtitle: string;
  eyebrow: string;
  icon: ComponentProps<typeof Feather>['name'];
  surfaceClass: string;
  eyebrowClass: string;
  countClass: string;
  countTextClass: string;
};

const DISCOVER_FILTERS: DiscoverFilterConfig[] = [
  {
    id: 'top-picks-lekki',
    title: 'Top picks in Lekki',
    subtitle: 'High-rated stays with polished finishes and calm ambience.',
    eyebrow: 'Lekki edit',
    icon: 'award',
    surfaceClass: 'border-blue-200 bg-blue-50',
    eyebrowClass: 'text-blue-600',
    countClass: 'bg-white',
    countTextClass: 'text-blue-700',
  },
  {
    id: 'trending-lekki',
    title: 'Trending apartments in Lekki',
    subtitle: 'Fresh favorites guests are most likely to open right now.',
    eyebrow: 'Trending now',
    icon: 'trending-up',
    surfaceClass: 'border-emerald-200 bg-emerald-50',
    eyebrowClass: 'text-emerald-600',
    countClass: 'bg-white',
    countTextClass: 'text-emerald-700',
  },
  {
    id: 'hot-picks-ikeja',
    title: 'Hot picks in Ikeja',
    subtitle: 'Convenient, flexible stays tailored for busy city movement.',
    eyebrow: 'City stays',
    icon: 'zap',
    surfaceClass: 'border-amber-200 bg-amber-50',
    eyebrowClass: 'text-amber-700',
    countClass: 'bg-white',
    countTextClass: 'text-amber-700',
  },
  {
    id: 'best-deals-vi',
    title: 'Best deals in Victoria Island',
    subtitle: 'Value-first picks that still feel elevated and well-located.',
    eyebrow: 'Deal watch',
    icon: 'tag',
    surfaceClass: 'border-rose-200 bg-rose-50',
    eyebrowClass: 'text-rose-600',
    countClass: 'bg-white',
    countTextClass: 'text-rose-700',
  },
];

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

const normalizeArea = (area: string) => area.trim().toLowerCase();

const areaIncludes = (area: string, query: string) => normalizeArea(area).includes(query);

const sortByRatingThenPrice = (left: ExploreListing, right: ExploreListing) => {
  if (right.rating !== left.rating) return right.rating - left.rating;
  return left.minimumPrice - right.minimumPrice;
};

const sortByPriceThenRating = (left: ExploreListing, right: ExploreListing) => {
  if (left.minimumPrice !== right.minimumPrice) return left.minimumPrice - right.minimumPrice;
  return right.rating - left.rating;
};

const sortByGuestFlex = (left: ExploreListing, right: ExploreListing) => {
  if (right.maxNumberOfGuestsAllowed !== left.maxNumberOfGuestsAllowed) {
    return right.maxNumberOfGuestsAllowed - left.maxNumberOfGuestsAllowed;
  }
  return sortByRatingThenPrice(left, right);
};

const derivePromoTags = (listing: ExploreListing, index: number) => {
  const seededTags = new Set<string>();

  if (areaIncludes(listing.area, 'lekki')) {
    seededTags.add('Free Night');
    seededTags.add('Easter Promo');
  }

  if (areaIncludes(listing.area, 'ikeja')) {
    seededTags.add('Late Night Discount');
  }

  if (areaIncludes(listing.area, 'victoria island')) {
    seededTags.add('5% Off');
    seededTags.add('Weekend Escape');
  }

  if (listing.minimumPrice <= 90000) {
    seededTags.add('Best Value');
  }

  if (listing.rating >= 4.8) {
    seededTags.add('Guest Favorite');
  }

  const preferred = Array.from(seededTags);
  const rotated = PROMO_TAGS.map((_, tagIndex) => PROMO_TAGS[(index + tagIndex) % PROMO_TAGS.length]);

  return Array.from(new Set([...preferred, ...rotated])).slice(0, 3);
};

const getListingsForDiscoverFilter = (
  listings: ExploreListing[],
  filterId: DiscoverFilterId
): ExploreListing[] => {
  if (filterId === 'all') return listings;

  if (filterId === 'top-picks-lekki') {
    return [...listings.filter((listing) => areaIncludes(listing.area, 'lekki'))].sort(
      sortByRatingThenPrice
    );
  }

  if (filterId === 'trending-lekki') {
    return listings.filter((listing) => areaIncludes(listing.area, 'lekki'));
  }

  if (filterId === 'hot-picks-ikeja') {
    return [...listings.filter((listing) => areaIncludes(listing.area, 'ikeja'))].sort(
      sortByGuestFlex
    );
  }

  return [...listings.filter((listing) => areaIncludes(listing.area, 'victoria island'))].sort(
    sortByPriceThenRating
  );
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
  maxNumberOfGuestsAllowed: number;
  bookingOptions: BookingOption[];
  promoTags: string[];
};

type ExploreListingResponse = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string | null;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  maxNumberOfGuestsAllowed: number;
  bookableOptions: string[];
};

type ProfileResponse = {
  firstName?: string | null;
  initials?: string | null;
};

type ProfileWithListingsResponse = {
  profile?: ProfileResponse | null;
  v2ExploreListings: ExploreListingResponse[];
};

type V2ExploreListingsVariables = {
  minBudget?: number | null;
  maxBudget?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  numberOfGuests?: number | null;
  amenities?: string[] | null;
  apartmentType?: string | null;
  limit: number;
  offset: number;
};

type BookingAlert = {
  id: string;
  guestName: string;
  listingName: string;
  area: string;
  avatar: string;
  bookedAgoLabel: string;
};

const buildQueryVariables = (filters: FilterState): V2ExploreListingsVariables => {
  const minBudget = parseCurrencyInput(filters.minBudget);
  const maxBudget = parseCurrencyInput(filters.maxBudget);
  const numberOfGuests = filters.guests
    ? filters.guests === '6+'
      ? 6
      : Number(filters.guests)
    : null;

  return {
    minBudget,
    maxBudget,
    checkIn: filters.checkIn ? formatQueryDate(filters.checkIn) : null,
    checkOut: filters.checkOut ? formatQueryDate(filters.checkOut) : null,
    numberOfGuests,
    amenities: filters.amenities.length > 0 ? filters.amenities : null,
    apartmentType: filters.type ? filters.type : null,
    limit: PAGE_SIZE,
    offset: 0,
  };
};

const mapBookableOptions = (options: string[] | null | undefined): BookingOption[] => {
  const mapped: BookingOption[] = [];
  if (options?.includes('single_room')) mapped.push('room');
  if (options?.includes('entire_apartment')) mapped.push('entire');
  return mapped.length ? mapped : ['entire'];
};

const mapExploreListing = (listing: ExploreListingResponse, index: number): ExploreListing => {
  const mappedListing: ExploreListing = {
    id: listing.id,
    name: listing.name,
    apartmentType: listing.apartmentType,
    coverPhoto: listing.coverPhoto ?? FALLBACK_LISTING_IMAGE,
    description: listing.description,
    minimumPrice: listing.minimumPrice,
    rating: listing.rating ?? 0,
    area: listing.area,
    maxNumberOfGuestsAllowed: listing.maxNumberOfGuestsAllowed,
    bookingOptions: mapBookableOptions(listing.bookableOptions),
    promoTags: [],
  };

  return {
    ...mappedListing,
    promoTags: derivePromoTags(mappedListing, index),
  };
};

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [filters, setFilters] = useState<FilterState>(createInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createInitialFilters);
  const [activeDiscoverFilter, setActiveDiscoverFilter] = useState<DiscoverFilterId>('all');
  const [isDiscoverExpanded, setIsDiscoverExpanded] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState({ y: 0, height: 0 });
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(true);
  const [activeBookingAlert, setActiveBookingAlert] = useState<BookingAlert | null>(null);
  const queryVariablesRef = useRef<V2ExploreListingsVariables | null>(null);
  const hasLoadedRef = useRef(false);
  const alertOpacity = useRef(new Animated.Value(0)).current;
  const alertTranslateY = useRef(new Animated.Value(-18)).current;
  const alertProgress = useRef(new Animated.Value(1)).current;
  const alertIndexRef = useRef(0);
  const visibleListingsRef = useRef<ExploreListing[]>([]);

  const [loadListings, { data, error, fetchMore, refetch, loading }] = useLazyQuery<
    ProfileWithListingsResponse,
    V2ExploreListingsVariables
  >(
    V2_EXPLORE_LISTINGS,
    {
      notifyOnNetworkStatusChange: true,
    }
  );

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, filters.checkIn, filters.checkOut),
    [calendarMonth, filters.checkIn, filters.checkOut]
  );

  const remoteListings = useMemo<ExploreListing[]>(() => {
    const items = data?.v2ExploreListings ?? [];
    return items.map(mapExploreListing);
  }, [data]);

  const discoverCounts = useMemo(
    () =>
      DISCOVER_FILTERS.reduce<Record<Exclude<DiscoverFilterId, 'all'>, number>>((counts, filter) => {
        counts[filter.id] = getListingsForDiscoverFilter(remoteListings, filter.id).length;
        return counts;
      }, {} as Record<Exclude<DiscoverFilterId, 'all'>, number>),
    [remoteListings]
  );

  const listings = useMemo(
    () => getListingsForDiscoverFilter(remoteListings, activeDiscoverFilter),
    [activeDiscoverFilter, remoteListings]
  );

  const remoteListingCount = data?.v2ExploreListings?.length ?? 0;
  const hasMore = !error && remoteHasMore;
  const isNetworkError = Boolean(error?.networkError);
  const activeDiscoverConfig =
    activeDiscoverFilter === 'all'
      ? null
      : DISCOVER_FILTERS.find((filter) => filter.id === activeDiscoverFilter) ?? null;

  const profileName = data?.profile?.firstName ?? '';
  const profileInitials = data?.profile?.initials ?? 'SH';
  const welcomeMessage = profileName ? `Welcome back, ${profileName}` : 'Welcome back';
  const bookingAlertBottomOffset = Math.max(tabBarHeight + 16, insets.bottom + 88);
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (appliedFilters.minBudget || appliedFilters.maxBudget) count += 1;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.guests) count += 1;
    if (appliedFilters.amenities.length) count += 1;
    if (appliedFilters.checkIn || appliedFilters.checkOut) count += 1;

    return count;
  }, [appliedFilters]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    const initialVariables = buildQueryVariables(createInitialFilters());
    queryVariablesRef.current = initialVariables;
    loadListings({ variables: initialVariables });
  }, [loadListings]);

  useEffect(() => {
    if (data?.v2ExploreListings && data.v2ExploreListings.length < PAGE_SIZE) {
      setRemoteHasMore(false);
    }
  }, [data]);

  useEffect(() => {
    visibleListingsRef.current = listings.length ? listings : remoteListings;
  }, [listings, remoteListings]);

  useEffect(() => {
    if (!remoteListings.length) return;

    const showNextBookingAlert = () => {
      const sourceListings = visibleListingsRef.current;
      if (!sourceListings.length) return;

      const sequenceIndex = alertIndexRef.current;
      const listing = sourceListings[sequenceIndex % sourceListings.length];
      const guestName = BOOKING_ALERT_NAMES[sequenceIndex % BOOKING_ALERT_NAMES.length];
      alertIndexRef.current += 1;

      setActiveBookingAlert({
        id: `${listing.id}-${sequenceIndex}`,
        guestName,
        listingName: listing.name,
        area: listing.area,
        avatar: listing.coverPhoto || FALLBACK_LISTING_IMAGE,
        bookedAgoLabel: '2 minutes ago',
      });
    };

    const initialTimeout = setTimeout(() => {
      showNextBookingAlert();
    }, BOOKING_ALERT_INITIAL_DELAY_MS);
    const interval = setInterval(() => {
      showNextBookingAlert();
    }, BOOKING_ALERT_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [remoteListings.length]);

  useEffect(() => {
    if (!activeBookingAlert) return;

    alertOpacity.setValue(0);
    alertTranslateY.setValue(-18);
    alertProgress.setValue(1);

    const enterAnimation = Animated.parallel([
      Animated.timing(alertOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(alertTranslateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]);
    const progressAnimation = Animated.timing(alertProgress, {
      toValue: 0,
      duration: BOOKING_ALERT_DURATION_MS,
      useNativeDriver: true,
    });

    enterAnimation.start();
    progressAnimation.start();

    const dismissTimeout = setTimeout(() => {
      Animated.parallel([
        Animated.timing(alertOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(alertTranslateY, {
          toValue: -14,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setActiveBookingAlert(null));
    }, BOOKING_ALERT_DURATION_MS);

    return () => {
      clearTimeout(dismissTimeout);
      enterAnimation.stop();
      progressAnimation.stop();
    };
  }, [activeBookingAlert, alertOpacity, alertProgress, alertTranslateY]);

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || loading || remoteListingCount === 0 || listings.length === 0)
      return;
    setLoadingMore(true);
    try {
      const variables = queryVariablesRef.current ?? buildQueryVariables(appliedFilters);
      queryVariablesRef.current = variables;
      const result = await fetchMore({
        variables: {
          ...variables,
          offset: remoteListingCount,
        },
        updateQuery: (previous, { fetchMoreResult }) => {
          if (!fetchMoreResult?.v2ExploreListings) return previous;
          return {
            profile: fetchMoreResult.profile ?? previous?.profile,
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
  };

  const runSearch = async (nextVariables: V2ExploreListingsVariables) => {
    queryVariablesRef.current = nextVariables;
    setRemoteHasMore(true);
    await loadListings({
      variables: nextVariables,
      fetchPolicy: 'network-only',
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const variables = queryVariablesRef.current ?? buildQueryVariables(appliedFilters);
      queryVariablesRef.current = variables;
      await refetch({ ...variables, offset: 0 });
      setRemoteHasMore(true);
    } finally {
      setRefreshing(false);
    }
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
    runSearch(buildQueryVariables(nextFilters)).catch(() => undefined);
  };

  const applyFilters = () => {
    const nextApplied = { ...filters };
    setFilterSheetOpen(false);
    setAppliedFilters(nextApplied);
    runSearch(buildQueryVariables(nextApplied)).catch(() => undefined);
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

  const handleRetry = () => {
    const variables = queryVariablesRef.current ?? buildQueryVariables(appliedFilters);
    runSearch(variables).catch(() => undefined);
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
            <View className="items-end">
              <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                From
              </Text>
              <Text className="text-base font-semibold text-blue-600">
                ₦{item.minimumPrice.toLocaleString()}
              </Text>
              <Text className="text-[10px] font-medium text-slate-500">/ night</Text>
            </View>
          </View>
          <View className="mt-1 flex-row items-center gap-2">
            <Feather name="map-pin" size={14} color="#94a3b8" />
            <Text className="text-sm text-slate-500">{item.area}</Text>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {item.promoTags.map((tag, index) => {
              const tone = PROMO_TAG_TONES[index % PROMO_TAG_TONES.length];
              return (
                <View
                  key={`${item.id}-${tag}`}
                  className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone.containerClass}`}>
                  <Feather name="tag" size={11} color={tone.iconColor} />
                  <Text className={`text-[11px] font-semibold ${tone.textClass}`}>{tag}</Text>
                </View>
              );
            })}
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
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center px-6 pt-4">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
            Safarihills
          </Text>
          <Text className="mt-1 text-3xl font-bold text-slate-900">{welcomeMessage}</Text>
        </View>
        <Pressable
          className="h-12 w-12 items-center justify-center rounded-full bg-blue-100 shrink-0"
          onPress={() => router.push('/(tabs)/profile')}>
          <Text className="text-lg font-bold text-blue-900">{profileInitials}</Text>
        </Pressable>
      </View>

      <View
        className="mt-5 px-6"
        onLayout={(event) => {
          const { y } = event.nativeEvent.layout;
          setFilterAnchor((prev) => ({ ...prev, y }));
        }}>
        <View
          className="flex-row items-start justify-between gap-3"
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            setFilterAnchor((prev) => ({ ...prev, height }));
          }}>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Discover
            </Text>
            <Text className="mt-1 text-lg font-bold text-slate-900">Neighborhood edits</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View>
              <Pressable
                className={`flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${
                  filterSheetOpen || activeFilterCount > 0
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-slate-200 bg-white'
                }`}
                onPress={() => setFilterSheetOpen((prev) => !prev)}>
                <Feather name="sliders" size={16} color={filterSheetOpen ? '#1d4ed8' : '#475569'} />
                <Text
                  className={`text-sm font-semibold ${
                    filterSheetOpen || activeFilterCount > 0 ? 'text-blue-700' : 'text-slate-700'
                  }`}>
                  {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
              onPress={() => setIsDiscoverExpanded((prev) => !prev)}>
              <Feather
                name={isDiscoverExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#0f172a"
              />
            </Pressable>
          </View>
        </View>

        <View className="mt-2 flex-row items-center justify-between">
          <Text className="flex-1 text-xs text-slate-500">
            {activeDiscoverConfig
              ? `Showing ${listings.length} stays for ${activeDiscoverConfig.title}.`
              : isDiscoverExpanded
                ? `${listings.length} stays ready to explore across Lagos.`
                : 'Expand discover to browse neighborhood picks, or jump straight into listings.'}
          </Text>
          {activeDiscoverConfig ? (
            <Pressable onPress={() => setActiveDiscoverFilter('all')}>
              <Text className="text-sm font-semibold text-blue-600">Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {isDiscoverExpanded ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 2 }}>
            <View className="flex-row gap-3 pr-6">
              {DISCOVER_FILTERS.map((filter) => {
                const isActive = activeDiscoverFilter === filter.id;
                const count = discoverCounts[filter.id] ?? 0;

                return (
                  <Pressable
                    key={filter.id}
                    className={`w-[168px] rounded-[24px] border px-3.5 py-3.5 ${
                      isActive ? 'border-slate-900 bg-slate-900' : filter.surfaceClass
                    }`}
                    onPress={() =>
                      setActiveDiscoverFilter((current) => (current === filter.id ? 'all' : filter.id))
                    }>
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <Text
                          className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                            isActive ? 'text-white/70' : filter.eyebrowClass
                          }`}>
                          {filter.eyebrow}
                        </Text>
                        <Text
                          className={`mt-2 text-[16px] font-bold leading-5 ${
                            isActive ? 'text-white' : 'text-slate-900'
                          }`}
                          numberOfLines={2}>
                          {filter.title}
                        </Text>
                      </View>
                      <View
                        className={`rounded-2xl px-2.5 py-2.5 ${
                          isActive ? 'bg-white/15' : 'bg-white/85'
                        }`}>
                        <Feather
                          name={filter.icon}
                          size={16}
                          color={isActive ? '#ffffff' : '#0f172a'}
                        />
                      </View>
                    </View>

                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className={`text-[11px] font-medium ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                        {count} {count === 1 ? 'stay' : 'stays'}
                      </Text>
                      <View className={`rounded-full px-2.5 py-1 ${isActive ? 'bg-white/15' : filter.countClass}`}>
                        <Text
                          className={`text-[11px] font-semibold ${
                            isActive ? 'text-white' : filter.countTextClass
                          }`}>
                          {isActive ? 'Selected' : 'Apply'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </View>

      {filterSheetOpen && (
        <View
          className="absolute left-6 right-6 z-20 max-h-[70%] rounded-3xl border border-slate-200 bg-white"
          style={{ top: filterAnchor.y + filterAnchor.height + 16 }}>
          <ScrollView
            className="px-5 py-5"
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}>
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

      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 z-50 px-5"
        style={{ bottom: bookingAlertBottomOffset }}>
        {activeBookingAlert ? (
          <Animated.View
            pointerEvents="none"
            style={{
              opacity: alertOpacity,
              transform: [{ translateY: alertTranslateY }],
              shadowColor: '#020617',
              shadowOpacity: 0.28,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 14 },
              elevation: 22,
            }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            <View className="flex-row items-center gap-4 px-4 py-4">
              <LoadingImage
                source={{ uri: activeBookingAlert.avatar }}
                className="h-14 w-14 rounded-[20px]"
                contentFit="cover"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-emerald-500/20 px-2.5 py-1">
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                      Live booking
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                  {activeBookingAlert.guestName} just booked {activeBookingAlert.listingName} in{' '}
                  {activeBookingAlert.area}.
                </Text>
                <Text className="mt-1 text-xs text-slate-500">{activeBookingAlert.bookedAgoLabel}</Text>
              </View>
            </View>
            <View className="h-1.5 bg-slate-100">
              <Animated.View
                className="h-full bg-emerald-400"
                style={{ transform: [{ scaleX: alertProgress }] }}
              />
            </View>
          </Animated.View>
        ) : null}
      </View>

      {error && listings.length > 0 ? (
        <View className="mx-6 mt-4 rounded-3xl border border-rose-200 bg-rose-50/70 px-4 py-3">
          <Text className="text-sm font-semibold text-rose-700">
            {isNetworkError ? 'Network error' : 'Unable to load listings'}
          </Text>
          <Text className="mt-1 text-xs text-rose-600">
            {isNetworkError
              ? 'Check your connection and try again.'
              : 'Something went wrong while fetching listings.'}
          </Text>
          <Pressable
            className="mt-3 self-start rounded-full bg-rose-600 px-4 py-2"
            onPress={handleRetry}>
            <Text className="text-xs font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={listings}
        renderItem={renderApartment}
        keyExtractor={(item, index) => `${item.id || 'listing'}-${index}`}
        contentContainerStyle={{
          padding: 24,
          paddingTop: 16,
          paddingBottom: bookingAlertBottomOffset + 88,
        }}
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
            {error ? (
              <View className="items-center justify-center px-6">
                <Text className="text-base font-semibold text-slate-900">
                  {isNetworkError ? 'Network error' : 'Unable to load listings'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  {isNetworkError
                    ? 'Check your connection and try again.'
                    : 'Something went wrong while fetching listings.'}
                </Text>
                <Pressable
                  className="mt-4 rounded-full bg-blue-600 px-5 py-2.5"
                  onPress={handleRetry}>
                  <Text className="text-sm font-semibold text-white">Retry</Text>
                </Pressable>
              </View>
            ) : refreshing || loading ? (
              <View className="items-center justify-center">
                <ActivityIndicator color="#1d4ed8" size="large" />
                <Text className="mt-3 text-sm font-semibold text-slate-500">
                  Loading apartments...
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center px-6">
                <Text className="text-center text-base font-semibold text-slate-900">
                  {activeDiscoverConfig
                    ? `No stays found for ${activeDiscoverConfig.title}.`
                    : 'No apartments found with the selected filters.'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  {activeDiscoverConfig
                    ? 'Try another neighborhood edit or clear the preset to browse everything.'
                    : 'Adjust your filters and try again.'}
                </Text>
                {activeDiscoverConfig ? (
                  <Pressable
                    className="mt-4 rounded-full bg-blue-600 px-5 py-2.5"
                    onPress={() => setActiveDiscoverFilter('all')}>
                    <Text className="text-sm font-semibold text-white">Show all stays</Text>
                  </Pressable>
                ) : null}
              </View>
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
