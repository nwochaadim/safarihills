import { useMutation, useQuery } from '@apollo/client';
import { BackButton } from '@/components/BackButton';
import { CREATE_WALLET_PAYMENT_FOR_BOOKING } from '@/mutations/createWalletPaymentForBooking';
import { FIND_USER_AND_OFFER_BOOKING_SUMMARY_DETAILS } from '@/queries/findUserAndOfferBookingSummaryDetails';
import { VALIDATE_BOOKING } from '@/mutations/validateBooking';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';
const PAYSTACK_FALLBACK_EMAIL = 'no-reply@safarihills.app';

const formatDateDisplay = (value: string | null | undefined) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG')}`;

const formatTimeDisplay = (value: string | null | undefined) => {
  if (!value) return '—';
  const match = value.match(/(\d{2}):(\d{2})/);
  if (!match) return value;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

type BookingSummaryResponse = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    walletBalance: number | null;
  } | null;
  findBookingSummaryDetails: {
    id: string;
    timelineStatus: string | null;
    state: string | null;
    referenceNumber: string | null;
    listing: {
      name: string | null;
      area: string | null;
    } | null;
    roomCategory: {
      name: string | null;
    } | null;
    numberOfGuests: number | null;
    bookingPurpose: string | null;
    checkIn: string | null;
    checkOut: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    numberOfNights: number | null;
    subtotal: number | null;
    cautionFee: number | null;
    bookingTotal: number | null;
    couponAppliedAmount: number | null;
    offerCampaign: {
      name: string | null;
      bookableOption: string | null;
    } | null;
    bookingRewards: BookingReward[] | null;
  } | null;
};

type BookingSummaryVariables = {
  bookingId: string;
};

type ValidateBookingResponse = {
  validateBooking: {
    errors: string[] | string | null;
  } | null;
};

type ValidateBookingVariables = {
  reference: string;
};

type CreateWalletPaymentResponse = {
  createWalletPayment: {
    errors: string[] | string | null;
  } | null;
};

type CreateWalletPaymentVariables = {
  reference: string;
};

type BookingReward = {
  id: string | null;
  type: string | null;
  name: string | null;
  description: string | null;
};

const getRewardIcon = (rewardType: string | null) => {
  const normalized = rewardType?.toLowerCase() ?? '';
  if (normalized.includes('discount')) return 'percent';
  if (normalized.includes('perk') || normalized.includes('gift')) return 'gift';
  return 'award';
};

const getRewardTag = (reward: BookingReward) => {
  if (reward.type?.trim()) return reward.type.replace(/_/g, ' ');
  if (reward.name?.trim()) return reward.name.trim();
  return 'Reward';
};

export default function OfferBookingSummaryScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const bookingId = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data, loading, refetch, error } = useQuery<
    BookingSummaryResponse,
    BookingSummaryVariables
  >(
    FIND_USER_AND_OFFER_BOOKING_SUMMARY_DETAILS,
    {
      variables: { bookingId: bookingId ?? '' },
      skip: !bookingId,
    }
  );
  const [validateBooking, { loading: isValidating }] = useMutation<
    ValidateBookingResponse,
    ValidateBookingVariables
  >(VALIDATE_BOOKING);
  const [createWalletPayment, { loading: isPayingWithWallet }] = useMutation<
    CreateWalletPaymentResponse,
    CreateWalletPaymentVariables
  >(CREATE_WALLET_PAYMENT_FOR_BOOKING);
  useFocusEffect(
    useCallback(() => {
      if (bookingId) {
        refetch({ bookingId });
      }
    }, [bookingId, refetch])
  );

  const user = data?.user ?? null;
  const booking = data?.findBookingSummaryDetails ?? null;
  const bookingState = booking?.state?.trim().toLowerCase() ?? '';
  const bookingTimelineStatus = booking?.timelineStatus?.trim().toLowerCase() ?? '';
  const isPastTimeline = bookingTimelineStatus === 'past';
  const isPaymentPending = bookingState === 'payment_pending';
  const isPaymentConfirmed = bookingState === 'payment_confirmed';
  const paymentStatus = isPaymentConfirmed
    ? {
        label: 'Payment confirmed',
        message: 'Your payment has been received and this booking is confirmed.',
        icon: 'check-circle' as const,
        containerClass: 'border-emerald-200 bg-emerald-50/70',
        textClass: 'text-emerald-700',
        iconColor: '#047857',
      }
    : isPaymentPending
      ? {
          label: 'Payment pending',
          message: 'Complete payment to secure this booking.',
          icon: 'clock' as const,
          containerClass: 'border-amber-200 bg-amber-50/70',
          textClass: 'text-amber-700',
          iconColor: '#b45309',
        }
      : null;
  const showPaymentSections = isPaymentPending && !isPastTimeline;
  const showPayNow = isPaymentPending && !isPastTimeline;
  const rewards = booking?.bookingRewards ?? [];
  const offerCampaign = booking?.offerCampaign ?? null;
  const isTimeBased =
    offerCampaign?.bookableOption?.toLowerCase() === 'time_based';
  const bookingReference = booking?.referenceNumber?.trim() ?? '';
  const bookingLabel = bookingReference || booking?.id || bookingId || 'Booking';
  const userEmail = user?.email?.trim() || PAYSTACK_FALLBACK_EMAIL;
  const userName = user?.name?.trim() || 'Guest';
  const userPhone = user?.phone?.trim() || '—';
  const listingName = booking?.listing?.name ?? 'Listing';
  const listingArea = booking?.listing?.area ?? '';
  const roomCategory = booking?.roomCategory?.name ?? null;
  const numberOfGuests = booking?.numberOfGuests ?? 0;
  const bookingPurpose = booking?.bookingPurpose ?? '';
  const checkIn = booking?.checkIn ?? null;
  const checkOut = booking?.checkOut ?? null;
  const checkInTime = booking?.checkInTime ?? null;
  const checkOutTime = booking?.checkOutTime ?? null;
  const nights = booking?.numberOfNights ?? 0;
  const subtotal = booking?.subtotal ?? 0;
  const cautionFee = booking?.cautionFee ?? 0;
  const bookingTotal = booking?.bookingTotal ?? subtotal + cautionFee;

  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack');
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const total = bookingTotal;
  const walletBalance = user?.walletBalance ?? 0;
  const walletHasFunds = total > 0 && walletBalance >= total;
  const canPay = paymentMethod === 'paystack' || walletHasFunds;
  const isProcessingPayment = isValidating || isPayingWithWallet;
  const paystackAmount = Math.max(Math.round(total * 100), 0);
  const paystackReference = bookingReference || 'booking-reference';
  const paystackHtml = useMemo(() => {
    const configJson = JSON.stringify({
      key: PAYSTACK_PUBLIC_KEY,
      email: userEmail,
      amount: paystackAmount,
      currency: 'NGN',
      ref: paystackReference,
      metadata: {
        custom_fields: [
          { display_name: 'Name', variable_name: 'name', value: userName },
          { display_name: 'Phone', variable_name: 'phone', value: userPhone },
        ],
      },
    });
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://js.paystack.co/v1/inline.js"></script>
          <style>
            html, body { margin: 0; padding: 0; background: #ffffff; }
          </style>
        </head>
        <body>
          <script>
            const config = ${configJson};
            config.callback = function(response) {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                reference: response.reference
              }));
            };
            config.onClose = function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'close'
              }));
            };
            const handler = PaystackPop.setup(config);
            handler.openIframe();
          </script>
        </body>
      </html>
    `;
  }, [
    paystackAmount,
    paystackReference,
    PAYSTACK_PUBLIC_KEY,
    userEmail,
    userName,
    userPhone,
  ]);

  const validateBeforePayment = async () => {
    if (!bookingReference) {
      setPaymentError('Booking reference is missing.');
      return false;
    }
    setPaymentError(null);
    try {
      const { data: response } = await validateBooking({
        variables: { reference: bookingReference },
      });
      const errors = response?.validateBooking?.errors;
      if (Array.isArray(errors) && errors.length) {
        setPaymentError(errors.join(' '));
        return false;
      }
      if (typeof errors === 'string' && errors.trim()) {
        setPaymentError(errors);
        return false;
      }
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to validate booking right now.';
      setPaymentError(message);
      return false;
    }
  };

  const handleOpenPaystack = async () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      setPaymentError('Paystack is unavailable right now.');
      return;
    }
    if (paystackAmount <= 0) {
      setPaymentError('Payment amount is unavailable.');
      return;
    }
    const isValid = await validateBeforePayment();
    if (!isValid) {
      return;
    }
    setPaystackVisible(true);
  };

  const handleWalletPayment = async () => {
    if (!walletHasFunds) {
      setPaymentError('Wallet balance is lower than the booking total.');
      return;
    }
    const isValid = await validateBeforePayment();
    if (!isValid) {
      return;
    }
    setPaymentError(null);
    try {
      const { data: response } = await createWalletPayment({
        variables: { reference: bookingReference },
      });
      const errors = response?.createWalletPayment?.errors;
      if (Array.isArray(errors) && errors.length) {
        setPaymentError(errors.join(' '));
        return;
      }
      if (typeof errors === 'string' && errors.trim()) {
        setPaymentError(errors);
        return;
      }
      router.replace({
        pathname: '/(tabs)/bookings',
        params: {
          paymentStatus: 'success',
          message: 'Payment completed successfully.',
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to complete wallet payment.';
      setPaymentError(message);
    }
  };

  const handlePaystackMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'close') {
        setPaystackVisible(false);
      }
      if (payload?.type === 'success') {
        setPaymentError(null);
        setPaystackVisible(false);
        router.replace({
          pathname: '/(tabs)/bookings',
          params: {
            paymentStatus: 'success',
            message: 'Payment completed successfully.',
          },
        });
      }
    } catch {
      setPaystackVisible(false);
    }
  };

  if (!bookingId) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
            <Text className="text-lg font-semibold text-slate-900">Booking unavailable</Text>
            <Text className="mt-2 text-sm text-slate-500">
              We couldn&apos;t find a booking reference for this screen.
            </Text>
            <Pressable
              className="mt-4 items-center justify-center rounded-full bg-blue-600 px-5 py-3"
              onPress={() => router.back()}>
              <Text className="text-sm font-semibold text-white">Go back</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !booking) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
          <Text className="mt-3 text-sm text-slate-500">Loading booking summary...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full rounded-3xl border border-rose-200 bg-rose-50/70 p-6">
            <Text className="text-lg font-semibold text-rose-700">
              Booking summary not available
            </Text>
            <Text className="mt-2 text-sm text-rose-600">
              {error?.message ?? 'We could not load this booking right now.'}
            </Text>
            <Pressable
              className="mt-4 items-center justify-center rounded-full bg-blue-600 px-5 py-3"
              onPress={() => refetch({ bookingId })}>
              <Text className="text-sm font-semibold text-white">Try again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="px-6 pt-4">
          <BackButton onPress={() => router.back()} />
          <View className="mt-4">
            <Text className="text-3xl font-bold text-slate-900">Booking summary</Text>
            <View className="mt-3 flex-row items-center gap-2">
              <View className="rounded-full bg-blue-100 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  Booking #{bookingLabel}
                </Text>
              </View>
              <View className="flex-row items-center gap-1 rounded-full bg-white px-3 py-1 shadow-sm shadow-slate-100">
                <Feather name="shield" size={12} color="#1d4ed8" />
                <Text className="text-xs font-semibold text-slate-500">Secure checkout</Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Booking details
            </Text>
            <View className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
                Listing
              </Text>
              <Text className="mt-2 text-lg font-semibold text-slate-900">
                {listingName}
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <Feather name="map-pin" size={14} color="#1d4ed8" />
                <Text className="text-sm text-slate-600">{listingArea || '—'}</Text>
              </View>
            </View>

            {roomCategory ? (
              <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <View>
                  <Text className="text-xs font-semibold uppercase text-slate-400">
                    Room category
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-slate-900">
                    {roomCategory}
                  </Text>
                </View>
                <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                  <Feather name="key" size={16} color="#1d4ed8" />
                </View>
              </View>
            ) : null}

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Guests</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {numberOfGuests}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Purpose</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {bookingPurpose || '—'}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(checkIn)}
                </Text>
                {isTimeBased ? (
                  <Text className="mt-1 text-xs text-slate-500">
                    {formatTimeDisplay(checkInTime)}
                  </Text>
                ) : null}
              </View>
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(checkOut)}
                </Text>
                {isTimeBased ? (
                  <Text className="mt-1 text-xs text-slate-500">
                    {formatTimeDisplay(checkOutTime)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Rewards
            </Text>
            {rewards.length ? (
              <View className="mt-4 space-y-3">
                {rewards.map((reward, index) => {
                  const safeReward: BookingReward = reward ?? {
                    id: null,
                    type: null,
                    name: null,
                    description: null,
                  };
                  return (
                    <View
                      key={safeReward.id ?? `reward-${index}`}
                      className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-3">
                          <Text className="text-sm font-semibold text-slate-900">
                            {safeReward.name?.trim() || 'Offer reward'}
                          </Text>
                          {safeReward.description?.trim() ? (
                            <Text className="mt-1 text-xs text-slate-500">
                              {safeReward.description.trim()}
                            </Text>
                          ) : null}
                        </View>
                        <View className="flex-row items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1">
                          <Feather
                            name={getRewardIcon(safeReward.type)}
                            size={12}
                            color="#047857"
                          />
                          <Text className="text-xs font-semibold text-emerald-700">
                            {getRewardTag(safeReward)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-slate-500">
                Rewards will appear here once available.
              </Text>
            )}
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Price summary
            </Text>
            <View className="mt-4 space-y-3">
              {!isTimeBased ? (
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-slate-500">Nights</Text>
                  <Text className="text-sm font-semibold text-slate-900">{nights}</Text>
                </View>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Subtotal</Text>
                <Text className="text-sm font-semibold text-slate-900">
                  {formatCurrency(subtotal)}
                </Text>
              </View>
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
            </View>
          </View>
        </View>

        {showPaymentSections ? (
          <View className="mt-6 px-6">
            <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
              <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Payment method
              </Text>
              <View className="mt-4 flex-row gap-3">
                <Pressable
                  className={`flex-1 rounded-2xl border px-4 py-3 ${
                    paymentMethod === 'paystack'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  onPress={() => {
                    setPaymentMethod('paystack');
                    void handleOpenPaystack();
                  }}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text
                        className={`text-sm font-semibold ${
                          paymentMethod === 'paystack' ? 'text-blue-700' : 'text-slate-700'
                        }`}>
                        Pay Online
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">via Paystack</Text>
                    </View>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full border ${
                        paymentMethod === 'paystack'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300'
                      }`}>
                      {paymentMethod === 'paystack' ? (
                        <View className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-2xl border px-4 py-3 ${
                    paymentMethod === 'wallet'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 bg-white'
                  }`}
                  onPress={() => setPaymentMethod('wallet')}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text
                        className={`text-sm font-semibold ${
                          paymentMethod === 'wallet' ? 'text-blue-700' : 'text-slate-700'
                        }`}>
                        Pay via wallet
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        Balance {formatCurrency(walletBalance)}
                      </Text>
                    </View>
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full border ${
                        paymentMethod === 'wallet'
                          ? 'border-blue-600 bg-blue-600'
                          : 'border-slate-300'
                      }`}>
                      {paymentMethod === 'wallet' ? (
                        <View className="h-2 w-2 rounded-full bg-white" />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              </View>
              {paymentMethod === 'wallet' && total > 0 && !walletHasFunds ? (
                <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                  <Text className="text-xs font-semibold text-rose-600">
                    Wallet balance is lower than the booking total.
                  </Text>
                </View>
              ) : null}
              {paymentError ? (
                <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                  <Text className="text-xs font-semibold text-rose-600">{paymentError}</Text>
                </View>
              ) : null}
            </View>

            {showPayNow ? (
              <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
                <Pressable
                  className={`items-center justify-center rounded-full py-4 ${
                    canPay ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                  disabled={!canPay || isProcessingPayment}
                  onPress={() => {
                    if (paymentMethod === 'paystack') {
                      void handleOpenPaystack();
                      return;
                    }
                    void handleWalletPayment();
                  }}>
                  <View className="items-center">
                    <Text
                      className={`text-base font-semibold ${
                        canPay ? 'text-white' : 'text-slate-500'
                      }`}>
                      Pay Now · {formatCurrency(total)}
                    </Text>
                    <Text
                      className={`text-xs font-semibold ${
                        canPay ? 'text-blue-100' : 'text-slate-400'
                      }`}>
                      {isProcessingPayment ? 'Processing payment' : 'Final total'}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null}
          </View>
        ) : null}

        {paymentStatus ? (
          <View className="mt-6 px-6">
            <View className={`rounded-3xl border p-5 ${paymentStatus.containerClass}`}>
              <View className="flex-row items-center gap-2">
                <Feather name={paymentStatus.icon} size={16} color={paymentStatus.iconColor} />
                <Text className={`text-sm font-semibold ${paymentStatus.textClass}`}>
                  {paymentStatus.label}
                </Text>
              </View>
              <Text className={`mt-2 text-sm ${paymentStatus.textClass}`}>
                {paymentStatus.message}
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={paystackVisible}
        animationType="slide"
        onRequestClose={() => setPaystackVisible(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-6 py-4">
            <Text className="text-base font-semibold text-slate-900">Pay with Paystack</Text>
            <Pressable
              className="rounded-full border border-slate-200 px-3 py-1.5"
              onPress={() => setPaystackVisible(false)}>
              <Text className="text-xs font-semibold text-slate-600">Close</Text>
            </Pressable>
          </View>
          <WebView
            key={`${paystackReference}-${paystackAmount}`}
            originWhitelist={['*']}
            source={{ html: paystackHtml }}
            onMessage={handlePaystackMessage}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
