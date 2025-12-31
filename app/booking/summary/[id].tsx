import { BackButton } from '@/components/BackButton';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

const WALLET_BALANCE = 120000;

const formatDateDisplay = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatCurrency = (value: number) => `₦${value.toLocaleString('en-NG')}`;

const normalizeCouponCode = (value: string) => value.trim().toUpperCase();

const getCouponAmount = (code: string, subtotal: number) => {
  if (code === 'SAFARI10') {
    return Math.round(subtotal * 0.1);
  }
  if (code === 'WELCOME5') {
    return 5000;
  }
  return 0;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getNights = (checkIn: Date, checkOut: Date) => {
  const diff = startOfDay(checkOut).getTime() - startOfDay(checkIn).getTime();
  return Math.max(Math.round(diff / (1000 * 60 * 60 * 24)), 0);
};

export default function BookingSummaryScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const bookingId = Array.isArray(idParam) ? idParam[0] : idParam;

  const booking = useMemo(
    () => ({
      id: bookingId ?? 'BK-1024',
      listingName: '4 Bedroom Urban Haven',
      area: 'Lekki Phase 1',
      roomCategory: 'Premium Room',
      numberOfGuests: 2,
      bookingPurpose: 'Vacation',
      checkIn: new Date(2026, 0, 12),
      checkOut: new Date(2026, 0, 15),
      nightlyRate: 45000,
      cautionFee: 30000,
    }),
    [bookingId]
  );

  const nights = useMemo(
    () => getNights(booking.checkIn, booking.checkOut),
    [booking.checkIn, booking.checkOut]
  );
  const subtotal = nights * booking.nightlyRate;

  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [couponAmount, setCouponAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wallet'>('paystack');

  const discount = Math.min(couponAmount, subtotal);
  const total = subtotal - discount + booking.cautionFee;
  const walletHasFunds = total > 0 && WALLET_BALANCE >= total;
  const canPay = paymentMethod === 'paystack' || walletHasFunds;

  const handleApplyCoupon = () => {
    const normalized = normalizeCouponCode(couponCode);
    if (!normalized) {
      setCouponStatus('invalid');
      setCouponAmount(0);
      return;
    }
    const amount = getCouponAmount(normalized, subtotal);
    if (amount > 0 || normalized === 'SAFARI10' || normalized === 'WELCOME5') {
      setCouponAmount(amount);
      setCouponStatus('valid');
      return;
    }
    setCouponStatus('invalid');
    setCouponAmount(0);
  };

  const clearCouponFeedback = () => {
    if (couponStatus !== 'idle') {
      setCouponStatus('idle');
    }
  };

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
                  Booking #{booking.id}
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
                {booking.listingName}
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <Feather name="map-pin" size={14} color="#1d4ed8" />
                <Text className="text-sm text-slate-600">{booking.area}</Text>
              </View>
            </View>

            {booking.roomCategory ? (
              <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <View>
                  <Text className="text-xs font-semibold uppercase text-slate-400">
                    Room category
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-slate-900">
                    {booking.roomCategory}
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
                  {booking.numberOfGuests}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Purpose</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {booking.bookingPurpose}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row gap-3">
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-in</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(booking.checkIn)}
                </Text>
              </View>
              <View className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
                <Text className="text-xs font-semibold uppercase text-slate-500">Check-out</Text>
                <Text className="mt-1 text-base font-semibold text-slate-900">
                  {formatDateDisplay(booking.checkOut)}
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
                  {formatCurrency(booking.cautionFee)}
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
              <Pressable className="rounded-2xl bg-blue-600 px-4 py-3" onPress={handleApplyCoupon}>
                <Text className="text-sm font-semibold text-white">Apply</Text>
              </Pressable>
            </View>
            {couponStatus === 'valid' ? (
              <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-emerald-600">
                  {discount > 0
                    ? `Coupon applied. You saved ${formatCurrency(discount)}.`
                    : 'Coupon applied. Savings will show in the total.'}
                </Text>
              </View>
            ) : null}
            {couponStatus === 'invalid' ? (
              <View className="mt-3 rounded-2xl border border-rose-200 bg-rose-50/70 px-3 py-2">
                <Text className="text-xs font-semibold text-rose-600">
                  That coupon code is invalid.
                </Text>
              </View>
            ) : null}
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
                onPress={() => setPaymentMethod('paystack')}>
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
          </View>

          <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Pressable
              className={`items-center justify-center rounded-full py-4 ${
                canPay ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              disabled={!canPay}
              onPress={() => {}}>
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
    </SafeAreaView>
  );
}
