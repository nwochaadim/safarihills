import { BackButton } from '@/components/BackButton';
import { BlankSlate } from '@/components/BlankSlate';
import { LoadingImage } from '@/components/LoadingImage';
import { AuthStatus } from '@/lib/authStatus';
import { CREATE_BOOKING_WITHOUT_OFFER } from '@/mutations/createBookingWithoutOffer';
import { NEW_BOOKING_DETAILS } from '@/queries/newBookingDetails';
import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const GALLERY_HORIZONTAL_PADDING = 24;
const GALLERY_WIDTH = width - GALLERY_HORIZONTAL_PADDING * 2;
const TERMS_URL = 'https://safarihills.app/terms';

const PURPOSE_OPTIONS: { label: string; icon: 'moon' | 'sun' | 'briefcase' | 'monitor' | 'users' | 'music' | 'camera' }[] =
  [
    { label: 'Sleep over', icon: 'moon' },
    { label: 'Vacation', icon: 'sun' },
    { label: 'Business', icon: 'briefcase' },
    { label: 'Work related', icon: 'monitor' },
    { label: 'Get Together', icon: 'users' },
    { label: 'Parties', icon: 'music' },
    { label: 'PhotoShoot', icon: 'camera' },
  ];

type BookingOption = 'room' | 'entire';

type RemotePropertyPhoto = {
  mediumUrl: string | null;
  largeUrl: string | null;
};

type RemoteListableDetails = {
  name: string | null;
  nightlyRate: number | null;
  cautionFee: number | null;
  soldOutDays: Record<string, boolean> | null;
  blockedDays: Record<string, boolean> | null;
  priceAdjustments: Record<string, number> | null;
  weeklyDiscount: number | null;
  monthlyDiscount: number | null;
  amenities: string[] | null;
  restrictions: string[] | null;
  maxNumberOfGuestsAllowed: number | null;
  cautionFeeNotApplicableForCheckins: Record<string, boolean> | null;
  propertyPhotos: RemotePropertyPhoto[] | null;
};

type NewBookingDetailsResponse = {
  newBookingDetails: {
    listing: {
      name: string | null;
      area: string | null;
    } | null;
    entireApartment: RemoteListableDetails | null;
    roomCategories: RemoteListableDetails[] | null;
    bookableOptions: string[] | null;
  } | null;
};

type BookingListable = {
  id: string;
  name: string;
  nightlyRate: number;
  cautionFee: number;
  soldOutDays: Record<string, boolean>;
  blockedDays: Record<string, boolean>;
  priceAdjustments: Record<string, number>;
  weeklyDiscount: number;
  monthlyDiscount: number;
  amenities: string[];
  maxNumberOfGuestsAllowed: number;
  photos: string[];
  description: string;
  restrictions: string[];
  cautionFeeNotApplicableForCheckins: Record<string, boolean>;
};

type CreateBookingResponse = {
  createBookingV3: {
    id: string | null;
    referenceNumber: string | null;
    errors: string[] | string | null;
  } | null;
};

type CreateBookingVariables = {
  checkIn: string;
  checkOut: string;
  listingId: number;
  roomCategoryName?: string | null;
  bookingPurpose: string;
  referenceNumber: string;
  bookingTotal: number;
  cautionFee: number;
  numberOfGuests: number;
  entireProperty: boolean;
  extending?: boolean | null;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfMonth = (date: Date) => {
  const next = new Date(date);
  next.setDate(1);
  next.setHours(0, 0, 0, 0);
  return next;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (date: Date | null) =>
  date
    ? date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Add date';

const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG')}`;

const generateBookingReference = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let value = 'BK-';
  for (let i = 0; i < 6; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
};

const normalizeNumber = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const normalizeDaysMap = (value: Record<string, boolean> | null | undefined) => {
  if (!value) return {};
  return Object.entries(value).reduce<Record<string, boolean>>((acc, [key, entry]) => {
    if (entry) {
      acc[key] = true;
    }
    return acc;
  }, {});
};

const normalizePriceAdjustments = (value: Record<string, number> | null | undefined) => {
  if (!value) return {};
  return Object.entries(value).reduce<Record<string, number>>((acc, [key, entry]) => {
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      acc[key] = entry;
    }
    return acc;
  }, {});
};

const mapPhotoUrls = (photos: RemotePropertyPhoto[] | null | undefined) =>
  (photos ?? [])
    .map((photo) => photo.largeUrl || photo.mediumUrl)
    .filter((url): url is string => Boolean(url));

const mapBookableOptions = (options: string[] | null | undefined): BookingOption[] => {
  const mapped: BookingOption[] = [];
  if (options?.includes('single_room')) mapped.push('room');
  if (options?.includes('entire_apartment')) mapped.push('entire');
  return mapped.length ? mapped : ['entire'];
};

const mapListableDetails = (details: RemoteListableDetails | null, id: string): BookingListable => ({
  id,
  name: details?.name ?? 'Listing',
  nightlyRate: normalizeNumber(details?.nightlyRate),
  cautionFee: normalizeNumber(details?.cautionFee),
  soldOutDays: normalizeDaysMap(details?.soldOutDays),
  blockedDays: normalizeDaysMap(details?.blockedDays),
  priceAdjustments: normalizePriceAdjustments(details?.priceAdjustments),
  weeklyDiscount: normalizeNumber(details?.weeklyDiscount),
  monthlyDiscount: normalizeNumber(details?.monthlyDiscount),
  amenities: details?.amenities ?? [],
  restrictions: details?.restrictions ?? [],
  maxNumberOfGuestsAllowed: Math.max(1, normalizeNumber(details?.maxNumberOfGuestsAllowed)),
  cautionFeeNotApplicableForCheckins: normalizeDaysMap(details?.cautionFeeNotApplicableForCheckins),
  photos: mapPhotoUrls(details?.propertyPhotos),
  description: '',
});

type CalendarDay = {
  date: Date;
  isCurrentMonth: boolean;
  isPast: boolean;
  isBooked: boolean;
  isBlocked: boolean;
  isStart: boolean;
  isEnd: boolean;
  isBetween: boolean;
  nightlyPrice: number;
};

const formatShortCurrency = (value: number) => {
  if (value >= 1000000) {
    const millions = value / 1000000;
    const label = millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1);
    return `${label}m`;
  }
  if (value >= 1000) {
    return `${Math.round(value / 1000)}k`;
  }
  return `${value}`;
};

const getDatePrice = (
  date: Date,
  basePrice: number,
  priceAdjustments: Record<string, number>
) => {
  const key = formatDateKey(date);
  const adjusted = priceAdjustments[key];
  if (typeof adjusted === 'number') return adjusted;
  return basePrice > 0 ? basePrice : 0;
};

const buildCalendarDays = (
  calendarMonth: Date,
  checkIn: Date | null,
  checkOut: Date | null,
  soldOutDays: Record<string, boolean>,
  blockedDays: Record<string, boolean>,
  basePrice: number,
  priceAdjustments: Record<string, number>
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
    const key = formatDateKey(date);
    const isStart = startDate ? normalized.getTime() === startDate.getTime() : false;
    const isEnd = endDate ? normalized.getTime() === endDate.getTime() : false;
    const isBetween = startDate && endDate && normalized > startDate && normalized < endDate;

    const isBooked = soldOutDays[key] === true;
    const isBlocked = blockedDays[key] === true;

    days.push({
      date,
      isCurrentMonth: date.getMonth() === month,
      isPast: normalized < today,
      isBooked,
      isBlocked,
      isStart,
      isEnd,
      isBetween: Boolean(isBetween),
      nightlyPrice: getDatePrice(date, basePrice, priceAdjustments),
    });
  }

  return days;
};

const isRangeAvailable = (
  start: Date,
  end: Date,
  soldOutDays: Record<string, boolean>,
  blockedDays: Record<string, boolean>
) => {
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (cursor < endDate) {
    const key = formatDateKey(cursor);
    if (soldOutDays[key] === true || blockedDays[key] === true) {
      return false;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return true;
};

const calculateSubtotal = (
  start: Date | null,
  end: Date | null,
  basePrice: number,
  priceAdjustments: Record<string, number>
) => {
  if (!start || !end) return 0;
  const cursor = startOfDay(start);
  const endDate = startOfDay(end);
  let total = 0;

  while (cursor < endDate) {
    total += getDatePrice(cursor, basePrice, priceAdjustments);
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
};

const getBookingTypeLabel = (option: BookingOption) =>
  option === 'room' ? 'Single room' : 'Entire apartment';

const getBookingTypeIcon = (option: BookingOption) => (option === 'room' ? 'key' : 'home');

export default function BookingScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const { id: idParam, referenceNumber: referenceParam } = useLocalSearchParams<{
    id?: string;
    referenceNumber?: string;
  }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const referenceNumber = Array.isArray(referenceParam) ? referenceParam[0] : referenceParam;
  const { data, loading } = useQuery<NewBookingDetailsResponse>(NEW_BOOKING_DETAILS, {
    variables: { listingId: id ?? '' },
    skip: !id || authStatus !== 'signed-in',
  });
  const [createBooking, { loading: isCreating }] = useMutation<
    CreateBookingResponse,
    CreateBookingVariables
  >(CREATE_BOOKING_WITHOUT_OFFER);
  const bookingDetails = data?.newBookingDetails ?? null;
  const entireApartment = useMemo(
    () =>
      bookingDetails?.entireApartment
        ? mapListableDetails(bookingDetails.entireApartment, 'entire')
        : null,
    [bookingDetails]
  );
  const roomCategories = useMemo(
    () =>
      (bookingDetails?.roomCategories ?? []).map((room, index) =>
        mapListableDetails(room, `${room?.name ?? 'room'}-${index}`)
      ),
    [bookingDetails]
  );
  const listingName = bookingDetails?.listing?.name ?? entireApartment?.name ?? 'Listing';
  const listingArea = bookingDetails?.listing?.area ?? '';

  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [guestError, setGuestError] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [purposeModalVisible, setPurposeModalVisible] = useState(false);
  const [galleryRoom, setGalleryRoom] = useState<BookingListable | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingReference, setBookingReference] = useState(
    () => referenceNumber ?? generateBookingReference()
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

  const bookingOptions = useMemo(() => {
    if (!bookingDetails) return [];
    const mapped = mapBookableOptions(bookingDetails.bookableOptions);
    if (!roomCategories.length) {
      return mapped.filter((option) => option !== 'room');
    }
    return mapped;
  }, [bookingDetails, roomCategories.length]);
  const defaultBookingType = useMemo<BookingOption>(() => {
    if (bookingOptions.includes('entire')) return 'entire';
    return bookingOptions[0] ?? 'entire';
  }, [bookingOptions]);
  const [bookingType, setBookingType] = useState<BookingOption>('entire');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  useEffect(() => {
    if (bookingOptions.length && !bookingOptions.includes(bookingType)) {
      setBookingType(defaultBookingType);
    }
  }, [bookingOptions, bookingType, defaultBookingType]);

  useEffect(() => {
    if (bookingType !== 'room') return;
    if (selectedRoomId && roomCategories.some((room) => room.id === selectedRoomId)) return;
    if (roomCategories.length) {
      setSelectedRoomId(roomCategories[0].id);
    }
  }, [bookingType, roomCategories, selectedRoomId]);

  useEffect(() => {
    if (referenceNumber) {
      setBookingReference(referenceNumber);
      return;
    }
    setBookingReference(generateBookingReference());
  }, [id, referenceNumber]);

  const selectedRoom = useMemo<BookingListable | undefined>(
    () => roomCategories.find((room) => room.id === selectedRoomId),
    [roomCategories, selectedRoomId]
  );
  const activeListable = bookingType === 'room' ? selectedRoom : entireApartment;
  const baseNightlyRate = activeListable?.nightlyRate ?? 0;
  const soldOutDays = activeListable?.soldOutDays ?? {};
  const blockedDays = activeListable?.blockedDays ?? {};
  const priceAdjustments = activeListable?.priceAdjustments ?? {};
  const baseCautionFee = activeListable?.cautionFee ?? 0;
  const cautionFeeNotApplicableForCheckins =
    activeListable?.cautionFeeNotApplicableForCheckins ?? {};
  const maxGuestsAllowed = activeListable?.maxNumberOfGuestsAllowed ?? 1;

  useEffect(() => {
    if (guestCount > maxGuestsAllowed) {
      setGuestCount(maxGuestsAllowed);
      setGuestError(`Maximum ${maxGuestsAllowed} guests allowed.`);
    }
  }, [guestCount, maxGuestsAllowed]);

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff = startOfDay(checkOut).getTime() - startOfDay(checkIn).getTime();
    return Math.max(Math.round(diff / (1000 * 60 * 60 * 24)), 0);
  }, [checkIn, checkOut]);

  const isExtension = useMemo(() => {
    if (!checkIn) return false;
    const key = formatDateKey(checkIn);
    return cautionFeeNotApplicableForCheckins[key] === true;
  }, [checkIn, cautionFeeNotApplicableForCheckins]);

  const calendarDays = useMemo(
    () =>
      buildCalendarDays(
        calendarMonth,
        checkIn,
        checkOut,
        soldOutDays,
        blockedDays,
        baseNightlyRate,
        priceAdjustments
      ),
    [calendarMonth, checkIn, checkOut, soldOutDays, blockedDays, baseNightlyRate, priceAdjustments]
  );

  const subtotal = useMemo(
    () => calculateSubtotal(checkIn, checkOut, baseNightlyRate, priceAdjustments),
    [checkIn, checkOut, baseNightlyRate, priceAdjustments]
  );
  const discount = 0;
  const cautionFee = useMemo(
    () => (nights > 0 ? (isExtension ? 0 : baseCautionFee) : 0),
    [nights, isExtension, baseCautionFee]
  );
  const total = subtotal - discount + cautionFee;
  const hasDates = nights > 0;
  const hasPrice = baseNightlyRate > 0;
  const hasPurpose = Boolean(purpose.trim());
  const canReview = acceptedTerms && hasDates && hasPrice && hasPurpose && !isCreating;
  const missingRequirements = useMemo(() => {
    const missing: string[] = [];
    if (!hasDates) missing.push('Select check-in and check-out dates.');
    if (!hasPurpose) missing.push('Select purpose of stay.');
    if (!acceptedTerms) missing.push('Accept the Terms of use.');
    if (!hasPrice) missing.push('Pricing is unavailable.');
    return missing;
  }, [acceptedTerms, hasDates, hasPrice, hasPurpose]);

  const handleCreateBooking = async () => {
    if (!checkIn || !checkOut) return;
    const listingId = id ? Number.parseInt(id, 10) : NaN;
    if (!Number.isFinite(listingId)) {
      setBookingError('Listing is unavailable right now.');
      return;
    }

    setBookingError(null);

    try {
      const { data: response } = await createBooking({
        variables: {
          checkIn: formatDateKey(checkIn),
          checkOut: formatDateKey(checkOut),
          listingId,
          roomCategoryName: bookingType === 'room' ? selectedRoom?.name ?? null : null,
          bookingPurpose: purpose,
          referenceNumber: bookingReference,
          bookingTotal: Math.round(total),
          cautionFee: Math.round(cautionFee),
          numberOfGuests: guestCount,
          entireProperty: bookingType === 'entire',
          extending: isExtension,
        },
      });

      const result = response?.createBookingV3;
      const errors = result?.errors;
      if (Array.isArray(errors) && errors.length) {
        setBookingError(errors.join(' '));
        return;
      }
      if (typeof errors === 'string' && errors.trim()) {
        setBookingError(errors);
        return;
      }
      if (result?.id) {
        router.push({
          pathname: '/booking/summary/[id]',
          params: { id: result.id },
        });
        return;
      }
      setBookingError('Unable to create booking right now.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create booking right now.';
      setBookingError(message);
    }
  };

  const openCalendar = () => {
    setSelectionError(null);
    setCalendarVisible(true);
  };

  const handleOpenTerms = () => {
    Linking.openURL(TERMS_URL);
  };

  const openGallery = (room: BookingListable) => {
    setGalleryRoom(room);
    setGalleryIndex(0);
  };

  const closeGallery = () => {
    setGalleryRoom(null);
  };

  const handleSelectDate = (day: CalendarDay) => {
    if (day.isPast) {
      setSelectionError('Past dates are unavailable.');
      return;
    }
    if (day.isBooked) {
      setSelectionError('This date is already booked.');
      return;
    }
    if (day.isBlocked) {
      setSelectionError('This date is unavailable.');
      return;
    }

    const normalized = startOfDay(day.date);
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(normalized);
      setCheckOut(null);
      setSelectionError(null);
      return;
    }

    if (checkIn && !checkOut) {
      if (normalized <= checkIn) {
        setCheckIn(normalized);
        setCheckOut(null);
        setSelectionError(null);
        return;
      }
      const isAvailable = isRangeAvailable(checkIn, normalized, soldOutDays, blockedDays);
      if (!isAvailable) {
        setSelectionError('Some dates in that range are unavailable.');
        return;
      }
      setCheckOut(normalized);
      setSelectionError(null);
      setCalendarVisible(false);
    }
  };

  const adjustGuestCount = (delta: number) => {
    setGuestCount((prev) => {
      const next = prev + delta;
      if (next < 1) {
        setGuestError(null);
        return 1;
      }
      if (next > maxGuestsAllowed) {
        setGuestError(`Maximum ${maxGuestsAllowed} guests allowed.`);
        return prev;
      }
      if (guestError) {
        setGuestError(null);
      }
      return next;
    });
  };

  if (authStatus === 'checking') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (authStatus === 'signed-out') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 px-6 pt-4">
          <BackButton onPress={() => router.back()} />
          <View className="flex-1 items-center justify-center px-2">
            <BlankSlate
              title="Sign in to continue"
              description="Create an account or sign in to complete your booking."
              iconName="user"
              primaryAction={{ label: 'Sign in', onPress: () => router.push('/auth/login') }}
              secondaryAction={{
                label: 'Create account',
                onPress: () => router.push('/auth/sign-up'),
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading || (!entireApartment && roomCategories.length === 0)) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-6 pt-4">
          <BackButton onPress={() => router.back()} />
          <Text className="mt-4 text-3xl font-bold text-slate-900">Book your stay</Text>
          <Text className="mt-2 text-base text-slate-500">
            {listingName}
            {listingArea ? ` \u00b7 ${listingArea}` : ''}
          </Text>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Booking type
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {bookingOptions.map((option) => {
                const isActive = bookingType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setBookingType(option)}
                    className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                      isActive ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}>
                    <Feather
                      name={getBookingTypeIcon(option)}
                      size={14}
                      color={isActive ? '#1d4ed8' : '#94a3b8'}
                    />
                    <Text
                      className={`text-sm font-semibold ${
                        isActive ? 'text-blue-700' : 'text-slate-600'
                      }`}>
                      {getBookingTypeLabel(option)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {bookingType === 'entire' ? (
              <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                  Entire apartment rate
                </Text>
                <Text className="mt-1 text-lg font-semibold text-slate-900">
                  {formatCurrency(entireApartment?.nightlyRate ?? 0)}
                  <Text className="text-xs font-medium text-slate-500"> / night</Text>
                </Text>
                <View className="mt-3 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
                  <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-500">
                    Restrictions
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {(entireApartment?.restrictions ?? []).length === 0 ? (
                      <Text className="text-xs text-slate-500">No restrictions listed.</Text>
                    ) : (
                      (entireApartment?.restrictions ?? []).map((restriction) => (
                        <View
                          key={`entire-${restriction}`}
                          className="rounded-full border border-rose-100 bg-white px-3 py-1.5">
                          <Text className="text-xs font-semibold text-rose-700">
                            {restriction}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View className="mt-4">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Choose a room category
                </Text>
                {roomCategories.length === 0 ? (
                  <View className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
                    <Text className="text-sm text-slate-500">
                      Room options will be available soon for this listing.
                    </Text>
                  </View>
                ) : (
                  <View className="mt-3 space-y-4">
                    {roomCategories.map((room) => {
                      const isSelected = selectedRoomId === room.id;
                      return (
                        <Pressable
                          key={room.id}
                          onPress={() => setSelectedRoomId(room.id)}
                          className={`rounded-3xl border p-4 ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/40'
                              : 'border-slate-200 bg-white'
                          }`}>
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1 pr-3">
                              <Text className="text-base font-semibold text-slate-900">
                                {room.name}
                              </Text>
                              <Text className="mt-1 text-sm text-slate-500">
                                {room.description}
                              </Text>
                            </View>
                            <Text className="text-base font-semibold text-blue-700">
                              {formatCurrency(room.nightlyRate)}
                              <Text className="text-xs font-medium text-slate-500"> / night</Text>
                            </Text>
                          </View>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="mt-4"
                            contentContainerStyle={{ paddingRight: 8 }}>
                            {room.photos.map((photo, index) => (
                              <LoadingImage
                                key={`${room.id}-${index}`}
                                source={{ uri: photo }}
                                className="mr-3 h-28 w-44 rounded-2xl"
                                resizeMode="cover"
                              />
                            ))}
                          </ScrollView>
                          <View className="mt-3 flex-row items-center justify-between">
                            <Text className="text-xs text-slate-500">
                              {room.photos.length} photos
                            </Text>
                            <Pressable
                              className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
                              onPress={() => openGallery(room)}>
                              <Feather name="image" size={14} color="#1d4ed8" />
                              <Text className="text-xs font-semibold text-blue-700">
                                View all
                              </Text>
                            </Pressable>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Stay details
            </Text>
            <View className="mt-4 flex-row gap-3">
              <Pressable
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                onPress={openCalendar}>
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(checkIn)}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                onPress={openCalendar}>
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(checkOut)}
                </Text>
              </Pressable>
            </View>
            <Text className="mt-2 text-xs text-slate-400">Tap a date to open the calendar.</Text>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
              <Text className="text-sm font-semibold text-slate-700">Guests</Text>
              <View className="flex-row items-center gap-3">
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white"
                  onPress={() => adjustGuestCount(-1)}>
                  <Feather name="minus" size={16} color="#475569" />
                </Pressable>
                <Text className="text-base font-semibold text-slate-900">{guestCount}</Text>
                <Pressable
                  className="h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white"
                  onPress={() => adjustGuestCount(1)}>
                  <Feather name="plus" size={16} color="#475569" />
                </Pressable>
              </View>
            </View>
            {guestError ? (
              <View className="mt-2 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-600">{guestError}</Text>
              </View>
            ) : null}

            <Pressable
              className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3"
              onPress={() => setPurposeModalVisible(true)}>
              <View className="flex-1 pr-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Purpose</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {purpose || 'Select purpose of stay'}
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  This helps us tailor your stay experience.
                </Text>
              </View>
              <View className="flex-row items-center gap-2 rounded-full bg-white px-3 py-1.5">
                <Feather name="sliders" size={14} color="#1d4ed8" />
                <Text className="text-xs font-semibold text-blue-700">
                  {purpose ? 'Change' : 'Choose'}
                </Text>
              </View>
            </Pressable>
            {!hasPurpose ? (
              <View className="mt-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-700">
                  Select a purpose of stay to continue.
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Price summary
            </Text>
            {nights > 0 ? (
              <View className="mt-4 space-y-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Nights</Text>
                  <Text className="text-sm font-semibold text-slate-900">{nights}</Text>
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Subtotal</Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {formatCurrency(subtotal)}
                  </Text>
                </View>
                {discount > 0 ? (
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm text-emerald-600">Coupon discount</Text>
                    <Text className="text-sm font-semibold text-emerald-600">
                      -{formatCurrency(discount)}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Caution fee</Text>
                  <Text className="text-sm font-semibold text-slate-900">
                    {formatCurrency(cautionFee)}
                  </Text>
                </View>
                <View className="mt-2 flex-row items-center justify-between border-t border-slate-200 pt-3">
                  <Text className="text-base font-semibold text-slate-900">Total</Text>
                  <Text className="text-base font-semibold text-blue-700">
                    {formatCurrency(total)}
                  </Text>
                </View>
                <Text className="text-xs text-slate-500">
                  Discounts apply for weekly stays and above.
                </Text>
              </View>
            ) : (
              <Text className="mt-3 text-sm text-slate-500">
                Select your dates to see a detailed price breakdown.
              </Text>
            )}
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <View className="flex-row items-start gap-3">
              <Pressable
                className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                  acceptedTerms ? 'border-blue-600 bg-blue-600' : 'border-slate-300 bg-white'
                }`}
                onPress={() => setAcceptedTerms((prev) => !prev)}>
                {acceptedTerms ? <Feather name="check" size={12} color="#ffffff" /> : null}
              </Pressable>
              <Text className="flex-1 text-sm text-slate-600">
                I have read and accepted the{' '}
                <Text className="font-semibold text-blue-600" onPress={handleOpenTerms}>
                  Terms of use
                </Text>
              </Text>
            </View>

            {bookingError ? (
              <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-600">{bookingError}</Text>
              </View>
            ) : null}
            {!canReview && missingRequirements.length > 0 ? (
              <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-700">
                  {missingRequirements.join(' ')}
                </Text>
              </View>
            ) : null}
            <Pressable
              className={`mt-5 items-center justify-center rounded-full py-4 ${
                canReview ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              disabled={!canReview}
              onPress={handleCreateBooking}>
              <View className="items-center">
                <Text
                  className={`text-base font-semibold ${
                    canReview ? 'text-white' : 'text-slate-500'
                  }`}>
                  Review & Pay · {formatCurrency(total)}
                </Text>
                <Text
                  className={`text-xs font-semibold ${
                    canReview ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                  Booking total
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal transparent animationType="slide" visible={Boolean(galleryRoom)} onRequestClose={closeGallery}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="max-h-[85%] rounded-t-[32px] bg-white">
            <View className="flex-row items-start justify-between px-6 pt-6">
              <View>
                <Text className="text-lg font-semibold text-slate-900">
                  {galleryRoom?.name ?? 'Room gallery'}
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {galleryRoom?.photos.length ?? 0} photos
                </Text>
              </View>
              <Pressable onPress={closeGallery} className="rounded-full border border-slate-200 p-2">
                <Feather name="x" size={18} color="#0f172a" />
              </Pressable>
            </View>
            <ScrollView className="mt-4" contentContainerStyle={{ paddingBottom: 24 }}>
              <View className="px-6">
                <FlatList
                  data={galleryRoom?.photos ?? []}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(photo, index) => `${galleryRoom?.id ?? 'room'}-${index}`}
                  snapToInterval={GALLERY_WIDTH}
                  decelerationRate="fast"
                  onMomentumScrollEnd={(event) => {
                    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / GALLERY_WIDTH);
                    setGalleryIndex(nextIndex);
                  }}
                  renderItem={({ item }) => (
                    <View style={{ width: GALLERY_WIDTH }}>
                      <LoadingImage
                        source={{ uri: item }}
                        className="h-64 w-full rounded-3xl"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                />
                <View className="mt-3 flex-row items-center justify-center gap-2">
                  {(galleryRoom?.photos ?? []).map((_, index) => (
                    <View
                      key={`${galleryRoom?.id ?? 'room'}-dot-${index}`}
                      className={`h-1.5 rounded-full ${
                        index === galleryIndex ? 'w-8 bg-slate-900' : 'w-3 bg-slate-300'
                      }`}
                    />
                  ))}
                </View>

                <Text className="mt-5 text-base font-semibold text-slate-900">About this room</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  {galleryRoom?.description
                    ? galleryRoom.description
                    : 'Room details will be updated soon.'}
                </Text>

                <View className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                    Amenities
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {(galleryRoom?.amenities ?? []).length === 0 ? (
                      <Text className="text-sm text-slate-500">Amenities coming soon.</Text>
                    ) : (
                      (galleryRoom?.amenities ?? []).map((amenity) => (
                        <View
                          key={`${galleryRoom?.id ?? 'room'}-${amenity}`}
                          className="rounded-full border border-blue-100 bg-white px-3 py-1.5">
                          <Text className="text-xs font-semibold text-blue-700">{amenity}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                <View className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-500">
                    Restrictions
                  </Text>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {(galleryRoom?.restrictions ?? []).length === 0 ? (
                      <Text className="text-sm text-slate-500">No restrictions listed.</Text>
                    ) : (
                      (galleryRoom?.restrictions ?? []).map((restriction) => (
                        <View
                          key={`${galleryRoom?.id ?? 'room'}-${restriction}`}
                          className="rounded-full border border-rose-100 bg-white px-3 py-1.5">
                          <Text className="text-xs font-semibold text-rose-700">{restriction}</Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={calendarVisible}
        onRequestClose={() => setCalendarVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white px-6 pb-8 pt-6">
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Select dates</Text>
              <Pressable onPress={() => setCalendarVisible(false)}>
                <Feather name="x" size={20} color="#0f172a" />
              </Pressable>
            </View>

            <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <View>
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateDisplay(checkIn)}
                </Text>
              </View>
              <Feather name="arrow-right" size={16} color="#94a3b8" />
              <View>
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                <Text className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDateDisplay(checkOut)}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                className="rounded-full border border-slate-200 p-2"
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() - 1, 1);
                    return startOfMonth(next);
                  })
                }>
                <Feather name="chevron-left" size={18} color="#0f172a" />
              </Pressable>
              <Text className="text-base font-semibold text-slate-900">
                {calendarMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <Pressable
                className="rounded-full border border-slate-200 p-2"
                onPress={() =>
                  setCalendarMonth((prev) => {
                    const next = new Date(prev);
                    next.setMonth(prev.getMonth() + 1, 1);
                    return startOfMonth(next);
                  })
                }>
                <Feather name="chevron-right" size={18} color="#0f172a" />
              </Pressable>
            </View>

            <View className="mt-4 flex-row justify-between">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text
                  key={day}
                  className="w-[13%] text-center text-xs font-semibold uppercase text-slate-400">
                  {day}
                </Text>
              ))}
            </View>

            <View className="mt-3 flex-row flex-wrap">
              {calendarDays.map((day) => {
                const isDisabled =
                  day.isPast || day.isBooked || day.isBlocked || !day.isCurrentMonth;
                const isSelected = day.isStart || day.isEnd;
                const priceLabel =
                  day.isCurrentMonth && day.nightlyPrice > 0
                    ? formatShortCurrency(day.nightlyPrice)
                    : '';
                let containerClass =
                  'm-[1.3%] h-14 w-[13%] items-center justify-center rounded-2xl border';
                let textClass = 'text-sm font-semibold';
                let priceClass = 'text-[10px] font-semibold';

                if (!day.isCurrentMonth) {
                  containerClass += ' border-transparent bg-transparent';
                  textClass += ' text-slate-300';
                  priceClass += ' text-slate-300';
                } else if (day.isBooked) {
                  containerClass += ' border-rose-200 bg-rose-50';
                  textClass += ' text-rose-500';
                  priceClass += ' text-rose-400';
                } else if (day.isPast || day.isBlocked) {
                  containerClass += ' border-slate-100 bg-slate-50';
                  textClass += ' text-slate-300';
                  priceClass += ' text-slate-300';
                } else if (isSelected) {
                  containerClass += ' border-blue-600 bg-blue-600';
                  textClass += ' text-white';
                  priceClass += ' text-white/80';
                } else if (day.isBetween) {
                  containerClass += ' border-blue-100 bg-blue-50';
                  textClass += ' text-blue-700';
                  priceClass += ' text-blue-600';
                } else {
                  containerClass += ' border-slate-200 bg-white';
                  textClass += ' text-slate-700';
                  priceClass += ' text-slate-500';
                }

                return (
                  <Pressable
                    key={day.date.toDateString()}
                    disabled={isDisabled}
                    className={containerClass}
                    onPress={() => handleSelectDate(day)}>
                    <View className="items-center">
                      <Text className={textClass}>{day.date.getDate()}</Text>
                      {priceLabel ? <Text className={priceClass}>{priceLabel}</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectionError ? (
              <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-600">{selectionError}</Text>
              </View>
            ) : null}

            <View className="mt-4 flex-row flex-wrap items-center gap-4">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-6 rounded-full bg-blue-500" />
                <Text className="text-xs text-slate-500">Selected</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-6 rounded-full bg-blue-100" />
                <Text className="text-xs text-slate-500">In range</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-6 rounded-full bg-rose-200" />
                <Text className="text-xs text-slate-500">Booked</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-6 rounded-full bg-slate-200" />
                <Text className="text-xs text-slate-500">Unavailable</Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between">
              <Pressable
                className="rounded-full border border-slate-200 px-4 py-2"
                onPress={() => {
                  setCheckIn(null);
                  setCheckOut(null);
                  setSelectionError(null);
                }}>
                <Text className="text-xs font-semibold text-slate-600">Clear dates</Text>
              </Pressable>
              <Pressable
                className="rounded-full bg-blue-600 px-5 py-2.5"
                onPress={() => setCalendarVisible(false)}>
                <Text className="text-xs font-semibold text-white">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={purposeModalVisible}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white px-6 pb-8 pt-6">
            <View className="mb-4 h-1 w-12 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-slate-900">Purpose of stay</Text>
              <Pressable onPress={() => setPurposeModalVisible(false)}>
                <Feather name="x" size={20} color="#0f172a" />
              </Pressable>
            </View>
            <Text className="mt-2 text-sm text-slate-500">
              Let us know why you are visiting so we can personalize your experience.
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {PURPOSE_OPTIONS.map((option) => {
                const isSelected = purpose === option.label;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setPurpose(option.label);
                      setPurposeModalVisible(false);
                    }}
                    className={`w-[48%] rounded-2xl border px-4 py-3 ${
                      isSelected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}>
                    <View className="flex-row items-center gap-2">
                      <View
                        className={`h-8 w-8 items-center justify-center rounded-full ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-100'
                        }`}>
                        <Feather
                          name={option.icon}
                          size={16}
                          color={isSelected ? '#ffffff' : '#64748b'}
                        />
                      </View>
                      <Text
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-blue-700' : 'text-slate-700'
                        }`}>
                        {option.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
