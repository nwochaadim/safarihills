import { useMutation, useQuery } from '@apollo/client';
import { BackButton } from '@/components/BackButton';
import { APPLY_COUPON_TO_BOOKING } from '@/mutations/applyCouponToBooking';
import { FIND_BOOKING_SUMMARY_DETAILS } from '@/queries/findBookingSummaryDetails';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const WALLET_BALANCE = 120000;
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';
const PAYSTACK_EMAIL = 'random@email.com';

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

const normalizeCouponCode = (value: string) => value.trim().toUpperCase();

type BookingSummaryResponse = {
  findBookingSummaryDetails: {
    id: string;
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
    numberOfNights: number | null;
    subtotal: number | null;
    cautionFee: number | null;
    bookingTotal: number | null;
    couponAppliedAmount: number | null;
  } | null;
};

type BookingSummaryVariables = {
  bookingId: string;
};

type ApplyCouponResponse = {
  applyCouponToBooking: {
    errors: string[] | string | null;
    appliedAmount: number | null;
    successMessage: string | null;
  } | null;
};

type ApplyCouponVariables = {
  bookingId: string;
  couponCode: string;
};

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const bookingId = Array.isArray(idParam) ? idParam[0] : idParam;
  const { data, loading, refetch, error } = useQuery<
    BookingSummaryResponse,
    BookingSummaryVariables
  >(
    FIND_BOOKING_SUMMARY_DETAILS,
    {
      variables: { bookingId: bookingId ?? '' },
      skip: !bookingId,
    }
  );
  const [applyCoupon, { loading: isApplyingCoupon }] = useMutation<
    ApplyCouponResponse,
    ApplyCouponVariables
  >(APPLY_COUPON_TO_BOOKING);

  useFocusEffect(
    useCallback(() => {
      if (!bookingId) return;
      refetch({ bookingId });
    }, [bookingId, refetch])
  );

  const booking = data?.findBookingSummaryDetails ?? null;
  const bookingLabel = booking?.referenceNumber ?? booking?.id ?? bookingId ?? 'Booking';
  const listingName = booking?.listing?.name ?? 'Listing';
  const listingArea = booking?.listing?.area ?? '';
  const roomCategory = booking?.roomCategory?.name ?? null;
  const numberOfGuests = booking?.numberOfGuests ?? 0;
  const bookingPurpose = booking?.bookingPurpose ?? '';
  const checkIn = booking?.checkIn ?? null;
  const checkOut = booking?.checkOut ?? null;
  const nights = booking?.numberOfNights ?? 0;
  const subtotal = booking?.subtotal ?? 0;
  const cautionFee = booking?.cautionFee ?? 0;
  const serverCouponAmount = booking?.couponAppliedAmount ?? 0;
  const baseTotal = subtotal + cautionFee;

  const [couponCode, setCouponCode] = useState('');
  const [couponMessage, setCouponMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [appliedAmount, setAppliedAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack');

  const effectiveCouponAmount = serverCouponAmount > 0 ? serverCouponAmount : appliedAmount;
  const discount = Math.min(effectiveCouponAmount, baseTotal);
  const total = Math.max(baseTotal - discount, 0);
  const walletHasFunds = total > 0 && WALLET_BALANCE >= total;
  const canPay = paymentMethod === 'paystack' || walletHasFunds;
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const paystackReference = booking?.referenceNumber ?? bookingId ?? 'booking-reference';
  const paystackAmount = Math.max(Math.round(total * 100), 0);
  const paystackHtml = useMemo(() => {
    const configJson = JSON.stringify({
      key: PAYSTACK_PUBLIC_KEY,
      email: PAYSTACK_EMAIL,
      amount: paystackAmount,
      currency: 'NGN',
      ref: paystackReference,
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
  }, [paystackAmount, paystackReference, PAYSTACK_EMAIL, PAYSTACK_PUBLIC_KEY]);

  const handleOpenPaystack = () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      setPaymentError('Paystack is unavailable right now.');
      return;
    }
    if (!paystackReference) {
      setPaymentError('Booking reference is missing.');
      return;
    }
    if (paystackAmount <= 0) {
      setPaymentError('Payment amount is unavailable.');
      return;
    }
    setPaymentError(null);
    setPaystackVisible(true);
  };

  const handlePaystackMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'close') {
        setPaystackVisible(false);
      }
      if (payload?.type === 'success') {
        setPaystackVisible(false);
      }
    } catch {
      setPaystackVisible(false);
    }
  };

  const handleApplyCoupon = () => {
    const normalized = normalizeCouponCode(couponCode);
    if (!normalized) {
      setCouponError('Enter a coupon code to apply.');
      setCouponMessage(null);
      setAppliedAmount(0);
      return;
    }
    if (!bookingId) {
      setCouponError('Booking reference is missing.');
      setCouponMessage(null);
      setAppliedAmount(0);
      return;
    }
    if (serverCouponAmount > 0) {
      setCouponError('A coupon has already been applied to this booking.');
      setCouponMessage(null);
      setAppliedAmount(0);
      return;
    }
    setCouponError(null);
    setCouponMessage(null);
    setAppliedAmount(0);
    applyCoupon({
      variables: { bookingId, couponCode: normalized },
    })
      .then(({ data: response }) => {
        const result = response?.applyCouponToBooking;
        const errors = result?.errors;
        if (Array.isArray(errors) && errors.length) {
          setCouponError(errors.join(' '));
          return;
        }
        if (typeof errors === 'string' && errors.trim()) {
          setCouponError(errors);
          return;
        }
        const amount = result?.appliedAmount ?? 0;
        setAppliedAmount(amount);
        setCouponMessage(result?.successMessage ?? 'Coupon applied successfully.');
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Unable to apply coupon right now.';
        setCouponError(message);
      });
  };

  const clearCouponFeedback = () => {
    if (couponMessage) setCouponMessage(null);
    if (couponError) setCouponError(null);
    if (appliedAmount) setAppliedAmount(0);
  };

  useEffect(() => {
    setCouponMessage(null);
    setCouponError(null);
    setAppliedAmount(0);
  }, [bookingId]);

  useEffect(() => {
    if (serverCouponAmount > 0) {
      setCouponMessage(null);
      setCouponError(null);
      setAppliedAmount(0);
    }
  }, [serverCouponAmount]);

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
              </View>
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(checkOut)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Price summary
            </Text>
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
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Apply coupon
            </Text>
            {serverCouponAmount > 0 ? (
              <View className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Discount already applied
                </Text>
                <Text className="mt-2 text-sm font-semibold text-blue-700">
                  A coupon discount is already active for this booking.
                </Text>
                <Text className="mt-1 text-xs text-blue-600">
                  Discount: {formatCurrency(serverCouponAmount)}
                </Text>
              </View>
            ) : couponMessage ? (
              <View className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                  Coupon applied
                </Text>
                <Text className="mt-2 text-sm font-semibold text-emerald-700">
                  {couponMessage}
                </Text>
                <Text className="mt-1 text-xs text-emerald-600">
                  Discount: {formatCurrency(discount)}
                </Text>
              </View>
            ) : (
              <>
                <Text className="mt-2 text-sm text-slate-500">
                  Add a promo code to unlock extra savings.
                </Text>
                <View className="mt-4 flex-row items-center gap-3">
                  <TextInput
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-base font-semibold text-slate-900"
                    placeholder="Enter coupon code"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    value={couponCode}
                    onChangeText={(value) => {
                      setCouponCode(value);
                      clearCouponFeedback();
                    }}
                  />
                  <Pressable
                    className={`rounded-2xl px-4 py-3 ${
                      isApplyingCoupon ? 'bg-slate-300' : 'bg-blue-600'
                    }`}
                    disabled={isApplyingCoupon}
                    onPress={handleApplyCoupon}>
                    <Text className="text-sm font-semibold text-white">
                      {isApplyingCoupon ? 'Applying' : 'Apply'}
                    </Text>
                  </Pressable>
                </View>
                {couponError ? (
                  <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                    <Text className="text-xs font-semibold text-rose-600">
                      {couponError}
                    </Text>
                  </View>
                ) : null}
              </>
            )}
          </View>

          <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
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
                  handleOpenPaystack();
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
                  paymentMethod === 'wallet' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
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
                      Balance {formatCurrency(WALLET_BALANCE)}
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
                <Text className="text-xs font-semibold text-rose-600">
                  {paymentError}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Pressable
              className={`items-center justify-center rounded-full py-4 ${
                canPay ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              disabled={!canPay}
              onPress={() => {
                if (paymentMethod === 'paystack') {
                  handleOpenPaystack();
                }
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
                  Final total
                </Text>
              </View>
            </Pressable>
          </View>
        </View>
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
