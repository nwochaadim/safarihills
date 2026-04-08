import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ExploreListingCard } from '@/components/explore/ExploreListingCard';
import { SafeAreaView } from '@/components/tab-safe-area-view';
import { useAnalyticsTracker } from '@/hooks/use-analytics-tracker';
import { useListingWishlistToggle } from '@/hooks/use-listing-wishlist';
import {
  ANALYTICS_EVENTS,
  buildListingAnalyticsItem,
  toFlag,
} from '@/lib/analytics.schema';
import {
  ExploreFilterInput,
  ExploreSection,
  ExploreListing,
  FilterState,
  RemoteExploreSection,
  buildExploreFilterInput,
  createInitialFilters,
  flattenPreviewListings,
  formatCurrencyInput,
  mapExploreSection,
  parseCurrencyInput,
  serializeExploreFilterInput,
  sortExploreSections,
} from '@/lib/explore';
import { AVAILABLE_LOCATIONS_QUERY } from '@/queries/availableLocations';
import { PROFILE_QUERY } from '@/queries/profile';
import { EXPLORE_SECTIONS } from '@/queries/exploreSections';

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
const MAX_VISIBLE_LOCATION_OPTIONS = 5;
const LOCATION_OPTION_ROW_HEIGHT = 52;
const BUDGET_MIN_VALUE = 20000;
const BUDGET_MAX_VALUE = 1000000;
const BUDGET_STEP = 5000;
const BUDGET_THUMB_SIZE = 24;

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isPast: boolean;
  isStart: boolean;
  isEnd: boolean;
  isBetween: boolean;
};

type ExploreSectionsResponse = {
  exploreSections?: RemoteExploreSection[] | null;
};

type ExploreSectionsVariables = {
  filters?: ExploreFilterInput;
};

type ExploreProfileResponse = {
  user?: {
    name?: string | null;
    initials?: string | null;
  } | null;
};

type AvailableLocation = {
  id?: string | null;
  name?: string | null;
};

type AvailableLocationsResponse = {
  locations?: AvailableLocation[] | null;
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

const rgbaFromHex = (color: string, alpha: string) => {
  const normalized = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) return `${normalized}${alpha}`;
  return normalized;
};

const clampBudgetValue = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const snapBudgetValue = (value: number) =>
  Math.round(value / BUDGET_STEP) * BUDGET_STEP;

const budgetValueToPosition = (value: number, width: number) => {
  if (width <= 0) return 0;
  return ((value - BUDGET_MIN_VALUE) / (BUDGET_MAX_VALUE - BUDGET_MIN_VALUE)) * width;
};

const budgetPositionToValue = (position: number, width: number) => {
  if (width <= 0) return BUDGET_MIN_VALUE;

  const ratio = clampBudgetValue(position / width, 0, 1);
  const rawValue = BUDGET_MIN_VALUE + ratio * (BUDGET_MAX_VALUE - BUDGET_MIN_VALUE);
  return clampBudgetValue(snapBudgetValue(rawValue), BUDGET_MIN_VALUE, BUDGET_MAX_VALUE);
};

const formatBudgetLabel = (value: number) => `₦${value.toLocaleString()}`;

type BudgetRangeSliderProps = {
  minValue: number;
  maxValue: number;
  onChange: (nextMin: number, nextMax: number) => void;
};

function BudgetRangeSlider({ minValue, maxValue, onChange }: BudgetRangeSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [draftMin, setDraftMin] = useState(minValue);
  const [draftMax, setDraftMax] = useState(maxValue);
  const startMinRef = useRef(minValue);
  const startMaxRef = useRef(maxValue);
  const draftMinRef = useRef(minValue);
  const draftMaxRef = useRef(maxValue);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    startMinRef.current = minValue;
    startMaxRef.current = maxValue;
  }, [maxValue, minValue]);

  useEffect(() => {
    if (isDraggingRef.current) return;

    setDraftMin(minValue);
    setDraftMax(maxValue);
    draftMinRef.current = minValue;
    draftMaxRef.current = maxValue;
  }, [maxValue, minValue]);

  const updateDraftRange = useCallback((nextMin: number, nextMax: number) => {
    draftMinRef.current = nextMin;
    draftMaxRef.current = nextMax;
    setDraftMin(nextMin);
    setDraftMax(nextMax);
  }, []);

  const moveThumb = useCallback(
    (thumb: 'min' | 'max', position: number) => {
      const nextValue = budgetPositionToValue(position, trackWidth);

      if (thumb === 'min') {
        updateDraftRange(Math.min(nextValue, draftMaxRef.current), draftMaxRef.current);
        return;
      }

      updateDraftRange(draftMinRef.current, Math.max(nextValue, draftMinRef.current));
    },
    [trackWidth, updateDraftRange]
  );

  const commitDraftRange = useCallback(() => {
    isDraggingRef.current = false;
    onChange(draftMinRef.current, draftMaxRef.current);
  }, [onChange]);

  const beginDrag = useCallback(() => {
    isDraggingRef.current = true;
    startMinRef.current = draftMinRef.current;
    startMaxRef.current = draftMaxRef.current;
  }, []);

  const handleTrackPress = useCallback(
    (event: GestureResponderEvent) => {
      if (trackWidth <= 0) return;

      const minPosition = budgetValueToPosition(draftMinRef.current, trackWidth);
      const maxPosition = budgetValueToPosition(draftMaxRef.current, trackWidth);
      const tappedPosition = clampBudgetValue(event.nativeEvent.locationX, 0, trackWidth);
      const distanceToMin = Math.abs(tappedPosition - minPosition);
      const distanceToMax = Math.abs(tappedPosition - maxPosition);
      const thumb = distanceToMin <= distanceToMax ? 'min' : 'max';

      moveThumb(thumb, tappedPosition);
      onChange(draftMinRef.current, draftMaxRef.current);
    },
    [moveThumb, onChange, trackWidth]
  );

  const minThumbResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: beginDrag,
        onPanResponderMove: (_, gestureState) => {
          if (trackWidth <= 0) return;

          const startPosition = budgetValueToPosition(startMinRef.current, trackWidth);
          moveThumb('min', startPosition + gestureState.dx);
        },
        onPanResponderRelease: commitDraftRange,
        onPanResponderTerminate: commitDraftRange,
      }),
    [beginDrag, commitDraftRange, moveThumb, trackWidth]
  );

  const maxThumbResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: beginDrag,
        onPanResponderMove: (_, gestureState) => {
          if (trackWidth <= 0) return;

          const startPosition = budgetValueToPosition(startMaxRef.current, trackWidth);
          moveThumb('max', startPosition + gestureState.dx);
        },
        onPanResponderRelease: commitDraftRange,
        onPanResponderTerminate: commitDraftRange,
      }),
    [beginDrag, commitDraftRange, moveThumb, trackWidth]
  );

  const minPosition = budgetValueToPosition(draftMin, trackWidth);
  const maxPosition = budgetValueToPosition(draftMax, trackWidth);
  const selectedWidth = Math.max(maxPosition - minPosition, 0);

  return (
    <View className="mt-3">
      <View className="flex-row items-center justify-between">
        <View className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Min
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-900">{formatBudgetLabel(draftMin)}</Text>
        </View>
        <View className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Max
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-900">{formatBudgetLabel(draftMax)}</Text>
        </View>
      </View>

      <Pressable className="mt-5 px-1 py-3" onPress={handleTrackPress}>
        <View
          className="h-2 rounded-full bg-slate-200"
          onLayout={(event) => {
            setTrackWidth(event.nativeEvent.layout.width);
          }}>
          <View
            className="absolute h-2 rounded-full bg-blue-500"
            style={{ left: minPosition, width: selectedWidth }}
          />
          <View
            className="absolute -top-[8px] rounded-full border-4 border-blue-500 bg-white shadow-sm shadow-blue-200"
            style={{
              left: Math.max(minPosition - BUDGET_THUMB_SIZE / 2, 0),
              width: BUDGET_THUMB_SIZE,
              height: BUDGET_THUMB_SIZE,
            }}
            {...minThumbResponder.panHandlers}
          />
          <View
            className="absolute -top-[8px] rounded-full border-4 border-blue-500 bg-white shadow-sm shadow-blue-200"
            style={{
              left: Math.min(
                Math.max(maxPosition - BUDGET_THUMB_SIZE / 2, 0),
                Math.max(trackWidth - BUDGET_THUMB_SIZE, 0)
              ),
              width: BUDGET_THUMB_SIZE,
              height: BUDGET_THUMB_SIZE,
            }}
            {...maxThumbResponder.panHandlers}
          />
        </View>
      </Pressable>

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs font-medium text-slate-500">{formatBudgetLabel(BUDGET_MIN_VALUE)}</Text>
        <Text className="text-xs font-medium text-slate-500">{formatBudgetLabel(BUDGET_MAX_VALUE)}</Text>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const router = useRouter();
  const { track } = useAnalyticsTracker();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { toggleListingWishlist } = useListingWishlistToggle();
  const { height: windowHeight } = useWindowDimensions();
  const [filters, setFilters] = useState<FilterState>(createInitialFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(createInitialFilters);
  const [isDiscoverExpanded, setIsDiscoverExpanded] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filterAnchor, setFilterAnchor] = useState({ y: 0, height: 0 });
  const [topHeaderHeight, setTopHeaderHeight] = useState(0);
  const [showCompactSections, setShowCompactSections] = useState(false);
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(startOfMonth(new Date()));
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const appliedExploreFilters = useMemo(
    () => buildExploreFilterInput(appliedFilters),
    [appliedFilters]
  );

  const { data, error, refetch, loading } = useQuery<
    ExploreSectionsResponse,
    ExploreSectionsVariables
  >(
    EXPLORE_SECTIONS,
    {
      variables: { filters: appliedExploreFilters },
      notifyOnNetworkStatusChange: true,
    }
  );
  const { data: profileData, refetch: refetchProfile } = useQuery<ExploreProfileResponse>(PROFILE_QUERY, {
    fetchPolicy: 'cache-and-network',
  });
  const {
    data: availableLocationsData,
    loading: availableLocationsLoading,
    error: availableLocationsError,
    refetch: refetchAvailableLocations,
  } = useQuery<AvailableLocationsResponse>(AVAILABLE_LOCATIONS_QUERY);

  const calendarDays = useMemo(
    () => buildCalendarDays(calendarMonth, filters.checkIn, filters.checkOut),
    [calendarMonth, filters.checkIn, filters.checkOut]
  );

  const sections = useMemo<ExploreSection[]>(
    () => sortExploreSections((data?.exploreSections ?? []).map(mapExploreSection)),
    [data]
  );
  const previewListings = useMemo(() => flattenPreviewListings(sections), [sections]);
  const sectionCount = sections.length;
  const isNetworkError = Boolean(error?.networkError);
  const availableLocationNames = useMemo(() => {
    const names = new Set<string>();

    (availableLocationsData?.locations ?? []).forEach((location) => {
      const normalized = location.name?.trim();
      if (normalized) names.add(normalized);
    });

    return Array.from(names);
  }, [availableLocationsData?.locations]);
  const filteredLocations = useMemo(() => {
    const normalizedSearch = locationSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return availableLocationNames;

    return availableLocationNames.filter((location) =>
      location.toLowerCase().includes(normalizedSearch)
    );
  }, [availableLocationNames, locationSearchTerm]);
  const defaultFilterPanelMaxHeight = Math.floor(windowHeight * 0.62);
  const filterPanelMaxHeight = useMemo(() => {
    const panelTop = filterAnchor.y + filterAnchor.height + 16;
    const bottomReserved = tabBarHeight + (Platform.OS === 'android' ? insets.bottom : 0) + 20;
    const availableHeight = Math.floor(windowHeight - panelTop - bottomReserved);

    if (availableHeight <= 0) return defaultFilterPanelMaxHeight;
    return Math.min(defaultFilterPanelMaxHeight, availableHeight);
  }, [defaultFilterPanelMaxHeight, filterAnchor.height, filterAnchor.y, insets.bottom, tabBarHeight, windowHeight]);
  const filterPanelBottomPadding =
    Platform.OS === 'android' ? tabBarHeight + insets.bottom + 20 : 24;

  const profileName = profileData?.user?.name?.trim() ?? '';
  const derivedInitials = profileName
    ? profileName
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';
  const profileInitials = profileData?.user?.initials?.trim() || derivedInitials || 'SH';
  const firstName = profileName ? profileName.split(/\s+/)[0] : '';
  const welcomeMessage = firstName ? `Welcome back, ${firstName}` : 'Welcome back';
  const activeFilterCount = useMemo(() => {
    let count = 0;

    if (appliedFilters.minBudget || appliedFilters.maxBudget) count += 1;
    if (appliedFilters.location) count += 1;
    if (appliedFilters.type) count += 1;
    if (appliedFilters.guests) count += 1;
    if (appliedFilters.amenities.length) count += 1;
    if (appliedFilters.checkIn || appliedFilters.checkOut) count += 1;

    return count;
  }, [appliedFilters]);
  const advancedFilterCount = useMemo(() => {
    let count = 0;

    if (filters.checkIn || filters.checkOut) count += 1;
    if (filters.minBudget || filters.maxBudget) count += 1;
    if (filters.type) count += 1;
    if (filters.guests) count += 1;
    if (filters.amenities.length) count += 1;

    return count;
  }, [filters]);
  const advancedFilterSummary = useMemo(() => {
    const parts: string[] = [];

    if (filters.type) parts.push(filters.type);
    if (filters.guests) parts.push(`${filters.guests} guests`);
    if (filters.amenities.length) parts.push(`${filters.amenities.length} amenities`);
    if (filters.checkIn || filters.checkOut) parts.push('dates set');
    if (filters.minBudget || filters.maxBudget) parts.push('budget set');

    if (!parts.length) return 'Dates, budget, apartment type, guests, and amenities';
    return parts.slice(0, 3).join(' • ');
  }, [filters]);
  const listViewSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setShowCompactSections((current) => {
        if (value > 96 && !current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return true;
        }
        if (value < 60 && current) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return false;
        }
        return current;
      });
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch({ filters: appliedExploreFilters }),
        refetchProfile(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setFilters((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists ? prev.amenities.filter((item) => item !== amenity) : [...prev.amenities, amenity],
      };
    });
  };

  const resetFilters = () => {
    const nextFilters = createInitialFilters();
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setLocationDropdownOpen(false);
    setLocationSearchTerm('');
    setAdvancedFiltersOpen(false);
    setFilterSheetOpen(false);
  };

  const applyFilters = () => {
    // Filter application is an early intent signal that powers warm-lead audiences and search analysis.
    track(ANALYTICS_EVENTS.SearchFiltersApplied, {
      source_screen: 'explore_home',
      source_surface: 'filter_sheet',
      filter_count: advancedFilterCount,
      location: filters.location || undefined,
      apartment_type: filters.type || undefined,
      guest_count: filters.guests ? (filters.guests === '6+' ? 6 : Number(filters.guests)) : undefined,
      min_budget: parseCurrencyInput(filters.minBudget) ?? undefined,
      max_budget: parseCurrencyInput(filters.maxBudget) ?? undefined,
      has_dates: toFlag(Boolean(filters.checkIn || filters.checkOut)),
      has_budget: toFlag(Boolean(filters.minBudget || filters.maxBudget)),
      amenities_count: filters.amenities.length,
    });
    setFilterSheetOpen(false);
    setLocationDropdownOpen(false);
    setLocationSearchTerm('');
    setAppliedFilters({ ...filters });
  };

  const selectedBudgetRange = useMemo(() => {
    const minBudget = filters.minBudget ? Number(filters.minBudget.replace(/[^\d]/g, '')) : BUDGET_MIN_VALUE;
    const maxBudget = filters.maxBudget ? Number(filters.maxBudget.replace(/[^\d]/g, '')) : BUDGET_MAX_VALUE;

    return {
      min: clampBudgetValue(minBudget, BUDGET_MIN_VALUE, BUDGET_MAX_VALUE),
      max: clampBudgetValue(Math.max(maxBudget, minBudget), BUDGET_MIN_VALUE, BUDGET_MAX_VALUE),
    };
  }, [filters.maxBudget, filters.minBudget]);

  const setBudgetRange = (nextMin: number, nextMax: number) => {
    const normalizedMin = clampBudgetValue(Math.min(nextMin, nextMax), BUDGET_MIN_VALUE, BUDGET_MAX_VALUE);
    const normalizedMax = clampBudgetValue(Math.max(nextMax, normalizedMin), BUDGET_MIN_VALUE, BUDGET_MAX_VALUE);

    setFilters((prev) => ({
      ...prev,
      minBudget: normalizedMin <= BUDGET_MIN_VALUE ? '' : formatCurrencyInput(`${normalizedMin}`),
      maxBudget: normalizedMax >= BUDGET_MAX_VALUE ? '' : formatCurrencyInput(`${normalizedMax}`),
    }));
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
    refetch({ filters: appliedExploreFilters }).catch(() => undefined);
  };

  const handleToggleWishlist = useCallback(
    (listing: ExploreListing) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      void toggleListingWishlist(listing);
    },
    [toggleListingWishlist]
  );

  useEffect(() => {
    if (loading || error || previewListings.length === 0) {
      return;
    }

    const signature = JSON.stringify({
      filters: appliedExploreFilters,
      sectionCount,
      listSize: previewListings.length,
    });

    if (listViewSignatureRef.current === signature) {
      return;
    }

    listViewSignatureRef.current = signature;

    track(ANALYTICS_EVENTS.ListingListView, {
      list_id: 'explore_home_preview',
      list_name: 'Explore home preview',
      source_screen: 'explore_home',
      source_surface: 'preview_feed',
      list_size: previewListings.length,
      matching_count: sectionCount,
      city: filters.location || undefined,
      filter_count: activeFilterCount,
    });
  }, [
    activeFilterCount,
    appliedExploreFilters,
    error,
    filters.location,
    loading,
    previewListings.length,
    sectionCount,
    track,
  ]);

  const openSection = (
    section: ExploreSection,
    sourceSurface: 'compact_section_card' | 'discover_section_card'
  ) => {
    track(ANALYTICS_EVENTS.ExploreSectionSelect, {
      source_screen: 'explore_home',
      source_surface: sourceSurface,
      section_id: section.id,
      section_slug: section.slug,
      section_title: section.title,
      section_type: section.sectionType,
      matching_count: section.matchingCount,
      city: section.location?.area || section.location?.name || undefined,
      filter_count: activeFilterCount,
    });

    router.push({
      pathname: '/explore/[slug]',
      params: {
        slug: section.slug,
        filters: serializeExploreFilterInput(appliedExploreFilters),
      },
    });
  };

  const compactSectionTop = topHeaderHeight + 10;
  const compactSectionsOpacity = scrollY.interpolate({
    inputRange: [48, 140],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const compactSectionsTranslateY = scrollY.interpolate({
    inputRange: [44, 132],
    outputRange: [-16, 0],
    extrapolate: 'clamp',
  });
  const compactSectionsScale = scrollY.interpolate({
    inputRange: [44, 132],
    outputRange: [0.95, 1],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View
        className="flex-row items-center px-6 pt-4"
        onLayout={(event) => setTopHeaderHeight(event.nativeEvent.layout.height + 16)}>
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
            Safarihills
          </Text>
          <Text className="mt-1 text-3xl font-bold text-slate-900">{welcomeMessage}</Text>
        </View>
        <Pressable
          className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100"
          onPress={() => router.push('/(tabs)/profile')}>
          <Text className="text-lg font-bold text-blue-900">{profileInitials}</Text>
        </Pressable>
      </View>

      <Animated.View
        pointerEvents={showCompactSections && isDiscoverExpanded ? 'box-none' : 'none'}
        style={{
          position: 'absolute',
          top: compactSectionTop,
          left: 0,
          right: 0,
          zIndex: 35,
          opacity: isDiscoverExpanded ? compactSectionsOpacity : 0,
          transform: [{ translateY: compactSectionsTranslateY }, { scale: compactSectionsScale }],
        }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 2 }}>
          <View className="flex-row gap-2.5">
            {sections.map((section) => (
              <Pressable
                key={`compact-${section.slug}`}
                className="w-[146px] rounded-[22px] border px-3.5 py-3 shadow-lg shadow-slate-200"
                style={{
                  backgroundColor: section.backgroundColor,
                  borderColor: section.borderColor,
                }}
                onPress={() => openSection(section, 'compact_section_card')}>
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text
                      className="text-[9px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: section.textColor, opacity: 0.72 }}
                      numberOfLines={1}>
                      {section.eyebrow}
                    </Text>
                    <Text
                      className="mt-1.5 text-[13px] font-bold leading-4"
                      style={{ color: section.textColor }}
                      numberOfLines={2}>
                      {section.title}
                    </Text>
                  </View>
                  <View
                    className="rounded-2xl border px-2.5 py-2"
                    style={{
                      borderColor: section.borderColor,
                      backgroundColor: rgbaFromHex(section.textColor, '14'),
                    }}>
                    <Feather name={section.iconName} size={14} color={section.textColor} />
                  </View>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text
                    className="text-[10px] font-semibold"
                    style={{ color: section.textColor, opacity: 0.9 }}>
                    {section.matchingCount} {section.matchingCount === 1 ? 'stay' : 'stays'}
                  </Text>
                  <Feather name="arrow-right" size={12} color={section.textColor} />
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </Animated.View>

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
                onPress={() =>
                    setFilterSheetOpen((prev) => {
                      const nextState = !prev;
                      if (!nextState) {
                        setLocationDropdownOpen(false);
                        setLocationSearchTerm('');
                        setAdvancedFiltersOpen(false);
                      }
                      return nextState;
                    })
                }>
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
            {sectionCount === 0
              ? 'No explore sections available right now.'
              : isDiscoverExpanded
                ? `${previewListings.length} preview ${previewListings.length === 1 ? 'stay' : 'stays'} across ${sectionCount} ${sectionCount === 1 ? 'section' : 'sections'}. Tap a card to open the full list.`
                : 'Expand discover to browse neighborhood picks, or jump straight into listings.'}
          </Text>
        </View>

        {isDiscoverExpanded && !showCompactSections ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 2 }}>
            <View className="flex-row gap-3 pr-6">
              {sections.map((section) => (
                <Pressable
                  key={section.slug}
                  className="w-[184px] rounded-[24px] border px-4 py-4"
                  style={{
                    backgroundColor: section.backgroundColor,
                    borderColor: section.borderColor,
                  }}
                  onPress={() => openSection(section, 'discover_section_card')}>
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text
                        className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                        style={{ color: section.textColor, opacity: 0.72 }}>
                        {section.eyebrow}
                      </Text>
                      <Text
                        className="mt-2 text-[16px] font-bold leading-5"
                        style={{ color: section.textColor }}
                        numberOfLines={2}>
                        {section.title}
                      </Text>
                    </View>
                    <View
                      className="rounded-2xl border px-2.5 py-2.5"
                      style={{
                        borderColor: section.borderColor,
                        backgroundColor: rgbaFromHex(section.textColor, '18'),
                      }}>
                      <Feather name={section.iconName} size={16} color={section.textColor} />
                    </View>
                  </View>

                  <Text
                    className="mt-3 text-[12px] leading-5"
                    style={{ color: section.textColor, opacity: 0.88 }}
                    numberOfLines={3}>
                    {section.subtitle}
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-[11px] font-medium" style={{ color: section.textColor }}>
                      {section.matchingCount} {section.matchingCount === 1 ? 'stay' : 'stays'}
                    </Text>
                    <View className="flex-row items-center gap-1 rounded-full bg-white/85 px-2.5 py-1">
                      <Text className="text-[11px] font-semibold text-slate-900">Open</Text>
                      <Feather name="arrow-right" size={12} color="#0f172a" />
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        ) : null}
      </View>

      {filterSheetOpen && (
        <View
          className="absolute left-6 right-6 z-20 rounded-3xl border border-slate-200 bg-white"
          style={{ top: filterAnchor.y + filterAnchor.height + 16, maxHeight: filterPanelMaxHeight }}>
          <ScrollView
            className="px-5 py-5"
            contentContainerStyle={{ paddingBottom: filterPanelBottomPadding }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0 }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Quick filters</Text>
              <Pressable onPress={resetFilters}>
                <Text className="text-sm font-semibold text-blue-600">Reset</Text>
              </Pressable>
            </View>

            <View className="mt-4">
              <Text className="text-xs font-semibold uppercase text-slate-400">Location</Text>
              <Pressable
                className={`mt-3 rounded-2xl border px-4 py-3 ${
                  locationDropdownOpen
                    ? 'border-blue-200 bg-blue-50/50'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
                onPress={() =>
                  setLocationDropdownOpen((prev) => {
                    const nextState = !prev;
                    if (nextState) setLocationSearchTerm('');
                    return nextState;
                  })
                }>
                <View className="flex-row items-center gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                    <Feather name="map-pin" size={16} color="#1d4ed8" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase text-slate-500">Area</Text>
                    <Text className="mt-0.5 text-base font-semibold text-slate-900">
                      {filters.location || 'Choose a location'}
                    </Text>
                  </View>
                  <Feather
                    name={locationDropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#475569"
                  />
                </View>
              </Pressable>
              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-xs font-medium text-slate-500">
                  Search and pick from preferred neighborhoods
                </Text>
                {filters.location ? (
                  <Pressable onPress={() => setFilters((prev) => ({ ...prev, location: '' }))}>
                    <Text className="text-sm font-semibold text-blue-600">Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              {locationDropdownOpen ? (
                <View className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                  <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
                    <Feather name="search" size={16} color="#64748b" />
                    <TextInput
                      className="ml-2 flex-1 py-2.5 text-sm font-medium text-slate-800"
                      placeholder="Search locations"
                      placeholderTextColor="#94a3b8"
                      value={locationSearchTerm}
                      onChangeText={setLocationSearchTerm}
                      editable={!availableLocationsLoading}
                    />
                  </View>

                  <View className="mt-3 overflow-hidden rounded-xl border border-slate-100">
                    {availableLocationsLoading ? (
                      <View className="flex-row items-center gap-2 px-3 py-4">
                        <ActivityIndicator color="#1d4ed8" size="small" />
                        <Text className="text-sm font-medium text-slate-500">
                          Loading locations...
                        </Text>
                      </View>
                    ) : availableLocationsError ? (
                      <View className="px-3 py-4">
                        <Text className="text-sm font-medium text-red-600">
                          Unable to load locations.
                        </Text>
                        <Pressable
                          className="mt-2 self-start rounded-full border border-red-200 bg-white px-3 py-2"
                          onPress={() => {
                            void refetchAvailableLocations();
                          }}>
                          <Text className="text-xs font-semibold text-red-700">Retry</Text>
                        </Pressable>
                      </View>
                    ) : filteredLocations.length ? (
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={
                          filteredLocations.length > MAX_VISIBLE_LOCATION_OPTIONS
                        }
                        style={{
                          maxHeight: LOCATION_OPTION_ROW_HEIGHT * MAX_VISIBLE_LOCATION_OPTIONS,
                        }}>
                        {filteredLocations.map((location, index) => {
                          const isActive = filters.location === location;

                          return (
                            <Pressable
                              key={location}
                              className={`flex-row items-center justify-between px-3 py-3 ${
                                isActive ? 'bg-blue-50' : 'bg-white'
                              } ${index < filteredLocations.length - 1 ? 'border-b border-slate-100' : ''}`}
                              style={{ minHeight: LOCATION_OPTION_ROW_HEIGHT }}
                              onPress={() => {
                                setFilters((prev) => ({
                                  ...prev,
                                  location,
                                }));
                                setLocationDropdownOpen(false);
                                setLocationSearchTerm('');
                              }}>
                              <Text
                                className={`text-sm font-semibold ${
                                  isActive ? 'text-blue-700' : 'text-slate-700'
                                }`}>
                                {location}
                              </Text>
                              {isActive ? (
                                <Feather name="check-circle" size={16} color="#1d4ed8" />
                              ) : (
                                <Feather name="circle" size={16} color="#cbd5e1" />
                              )}
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    ) : (
                      <View className="px-3 py-4">
                        <Text className="text-sm font-medium text-slate-500">
                          {availableLocationNames.length
                            ? 'No matching location found.'
                            : 'No locations available right now.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

            <View className="mt-5 rounded-[28px] border border-slate-200 bg-slate-50/70">
              <Pressable
                className="flex-row items-center justify-between px-4 py-4"
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setAdvancedFiltersOpen((prev) => !prev);
                }}>
                <View className="flex-1 pr-4">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-semibold text-slate-900">Advanced filters</Text>
                    {advancedFilterCount > 0 ? (
                      <View className="rounded-full bg-blue-100 px-2.5 py-1">
                        <Text className="text-[11px] font-semibold text-blue-700">
                          {advancedFilterCount} active
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text className="mt-1 text-sm text-slate-500">{advancedFilterSummary}</Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
                  <Feather
                    name={advancedFiltersOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color="#334155"
                  />
                </View>
              </Pressable>

              {advancedFiltersOpen ? (
                <View className="border-t border-slate-200 px-4 pb-4 pt-2">
                  <View className="mt-4">
                    <Text className="text-xs font-semibold uppercase text-slate-400">Dates</Text>
                    <View className="mt-3 flex-row gap-3">
                      <Pressable
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                        onPress={() => setCalendarVisible(true)}>
                        <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                        <Text className="mt-1 text-base font-semibold text-slate-900">
                          {filters.checkIn ? formatDateDisplay(filters.checkIn) : 'Add date'}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3"
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
                    <Text className="text-xs font-semibold uppercase text-slate-400">
                      Budget per night (₦)
                    </Text>
                    <BudgetRangeSlider
                      minValue={selectedBudgetRange.min}
                      maxValue={selectedBudgetRange.max}
                      onChange={setBudgetRange}
                    />
                    <View className="mt-3 flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-slate-500">
                        {selectedBudgetRange.min === BUDGET_MIN_VALUE &&
                        selectedBudgetRange.max === BUDGET_MAX_VALUE
                          ? 'Any budget'
                          : `Showing ₦${selectedBudgetRange.min.toLocaleString()} - ₦${selectedBudgetRange.max.toLocaleString()}`}
                      </Text>
                      {(filters.minBudget || filters.maxBudget) ? (
                        <Pressable onPress={() => setBudgetRange(BUDGET_MIN_VALUE, BUDGET_MAX_VALUE)}>
                          <Text className="text-sm font-semibold text-blue-600">Clear</Text>
                        </Pressable>
                      ) : null}
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
                      <View className="flex-row gap-3">
                        {GUEST_OPTIONS.map((option) => {
                          const isActive = filters.guests === option;
                          return (
                            <Pressable
                              key={option}
                              className={`rounded-full px-4 py-2 ${
                                isActive ? 'bg-blue-600' : 'border border-slate-200 bg-white'
                              }`}
                              onPress={() =>
                                setFilters((prev) => ({
                                  ...prev,
                                  guests: isActive ? '' : option,
                                }))
                              }>
                              <Text
                                className={`text-sm font-semibold ${
                                  isActive ? 'text-white' : 'text-slate-600'
                                }`}>
                                {option} guests
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
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
                </View>
              ) : null}
            </View>

            <Pressable
              className="mb-6 mt-6 items-center justify-center rounded-2xl bg-blue-600 px-4 py-3"
              onPress={applyFilters}>
              <Text className="text-base font-semibold text-white">Apply filters</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {error && previewListings.length > 0 ? (
        <View className="mx-6 mt-4 rounded-3xl border border-rose-200 bg-rose-50/70 px-4 py-3">
          <Text className="text-sm font-semibold text-rose-700">
            {isNetworkError ? 'Network error' : 'Unable to load explore'}
          </Text>
          <Text className="mt-1 text-xs text-rose-600">
            {isNetworkError
              ? 'Check your connection and try again.'
              : 'Something went wrong while fetching explore sections.'}
          </Text>
          <Pressable
            className="mt-3 self-start rounded-full bg-rose-600 px-4 py-2"
            onPress={handleRetry}>
            <Text className="text-xs font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.FlatList
        data={previewListings}
        renderItem={({ item }) => (
          <ExploreListingCard
            item={item}
            onPress={(listing) => {
              track(ANALYTICS_EVENTS.SelectItem, {
                source_screen: 'explore_home',
                source_surface: 'explore_preview_card',
                item_list_id: 'explore_home_preview',
                item_list_name: 'Explore home preview',
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
                    itemListId: 'explore_home_preview',
                    itemListName: 'Explore home preview',
                  }),
                ],
              });

              router.push({
                pathname: '/listing/[id]',
                params: {
                  id: listing.id,
                  source_screen: 'explore_home',
                  source_surface: 'explore_preview_card',
                  item_list_id: 'explore_home_preview',
                  item_list_name: 'Explore home preview',
                },
              });
            }}
            onToggleWishlist={handleToggleWishlist}
          />
        )}
        keyExtractor={(item, index) => `${item.id || 'listing'}-${index}`}
        contentContainerStyle={{
          padding: 24,
          paddingTop: 16,
          paddingBottom: tabBarHeight + insets.bottom + 32,
        }}
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
        ListEmptyComponent={
          <View className="py-24">
            {error ? (
              <View className="items-center justify-center px-6">
                <Text className="text-base font-semibold text-slate-900">
                  {isNetworkError ? 'Network error' : 'Unable to load explore'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  {isNetworkError
                    ? 'Check your connection and try again.'
                    : 'Something went wrong while fetching explore sections.'}
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
                  Loading explore sections...
                </Text>
              </View>
            ) : sectionCount === 0 ? (
              <View className="items-center justify-center px-6">
                <Text className="text-center text-base font-semibold text-slate-900">
                  No explore sections available yet.
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  Pull to refresh and check back soon.
                </Text>
              </View>
            ) : (
              <View className="items-center justify-center px-6">
                <Text className="text-center text-base font-semibold text-slate-900">
                  {appliedFilters.location
                    ? `No explore results found in ${appliedFilters.location}.`
                    : 'No apartments found with the selected filters.'}
                </Text>
                <Text className="mt-2 text-center text-sm text-slate-500">
                  Adjust your filters and try again.
                </Text>
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

            <View className="mt-3 flex-row flex-wrap">
              {calendarDays.map((day) => {
                const isDisabled = day.isPast;
                const isSelected = day.isStart || day.isEnd;
                return (
                  <Pressable
                    key={day.date.toISOString()}
                    className="w-[14.28%] p-1"
                    disabled={isDisabled}
                    onPress={() => handleSelectDate(day.date)}>
                    <View
                      className={`aspect-square items-center justify-center rounded-2xl ${
                        isSelected
                          ? 'bg-blue-600'
                          : day.isBetween
                            ? 'bg-blue-50'
                            : 'bg-transparent'
                      }`}>
                      <Text
                        className={`text-sm font-medium ${
                          !day.isCurrentMonth
                            ? 'text-slate-300'
                            : isDisabled
                              ? 'text-slate-300'
                              : isSelected
                                ? 'text-white'
                                : day.isBetween
                                  ? 'text-blue-700'
                                  : 'text-slate-700'
                        }`}>
                        {day.date.getDate()}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View className="mt-5 flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase text-slate-400">Selected</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">
                  {filters.checkIn ? formatDateDisplay(filters.checkIn) : 'Check-in'} {' - '}
                  {filters.checkOut ? formatDateDisplay(filters.checkOut) : 'Check-out'}
                </Text>
              </View>
              <Pressable
                className="rounded-full bg-blue-600 px-5 py-2.5"
                onPress={() => setCalendarVisible(false)}>
                <Text className="text-sm font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
