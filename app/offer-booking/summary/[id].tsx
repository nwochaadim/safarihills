import { useQuery } from '@apollo/client';
import { BackButton } from '@/components/BackButton';
import { FIND_OFFER_BOOKING_SUMMARY_DETAILS } from '@/queries/findOfferBookingSummaryDetails';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

const WALLET_BALANCE = 120000;

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
    checkInTime: string | null;
    checkOutTime: string | null;
    numberOfNights: number | null;
    subtotal: number | null;
    cautionFee: number | null;
    bookingTotal: number | null;
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
    FIND_OFFER_BOOKING_SUMMARY_DETAILS,
    {
      variables: { bookingId: bookingId ?? '' },
      skip: !bookingId,
    }
  );
  useFocusEffect(
    useCallback(() => {
      if (bookingId) {
        refetch({ bookingId });
      }
    }, [bookingId, refetch])
  );

  const booking = data?.findBookingSummaryDetails ?? null;
  const rewards = booking?.bookingRewards ?? [];
  const offerCampaign = booking?.offerCampaign ?? null;
  const isTimeBased =
    offerCampaign?.bookableOption?.toLowerCase() === 'time_based';
  const bookingLabel = booking?.referenceNumber ?? booking?.id ?? bookingId ?? 'Booking';
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

  const total = bookingTotal;
  const walletHasFunds = total > 0 && WALLET_BALANCE >= total;
  const canPay = paymentMethod === 'paystack' || walletHasFunds;

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
