import { BackButton } from '@/components/BackButton';
import { APPLY_COUPON_TO_BOOKING } from '@/mutations/applyCouponToBooking';
import { CREATE_WALLET_PAYMENT_FOR_BOOKING } from '@/mutations/createWalletPaymentForBooking';
import { VALIDATE_BOOKING } from '@/mutations/validateBooking';
import { FIND_USER_AND_OFFER_BOOKING_SUMMARY_DETAILS } from '@/queries/findUserAndOfferBookingSummaryDetails';
import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView as TabSafeAreaView } from '@/components/tab-safe-area-view';
import { SafeAreaView as BaseSafeAreaView } from 'react-native-safe-area-context';
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

const normalizeCouponCode = (value: string) => value.trim().toUpperCase();

type BookingSummaryResponse = {
  user: {
    email: string | null;
    name: string | null;
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

export default function BookingSummaryScreen() {
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
  const [applyCoupon, { loading: isApplyingCoupon }] = useMutation<
    ApplyCouponResponse,
    ApplyCouponVariables
  >(APPLY_COUPON_TO_BOOKING);
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
      if (!bookingId) return;
      refetch({ bookingId });
    }, [bookingId, refetch])
  );

  const booking = data?.findBookingSummaryDetails ?? null;
  const user = data?.user ?? null;
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
  const bookingReference = booking?.referenceNumber?.trim() ?? '';
  const userEmail = user?.email?.trim() || PAYSTACK_FALLBACK_EMAIL;
  const userName = user?.name?.trim() || 'Guest';
  const userPhone = user?.phone?.trim() || '—';
  const bookingLabel = bookingReference || booking?.id || bookingId;
  const listingName = booking?.listing?.name;
  const listingArea = booking?.listing?.area;
  const roomCategory = booking?.roomCategory?.name;
  const offerCampaign = booking?.offerCampaign ?? null;
  const rewards = booking?.bookingRewards ?? [];
  const numberOfGuests = booking?.numberOfGuests;
  const bookingPurpose = booking?.bookingPurpose;
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
  const walletBalance = user?.walletBalance ?? 0;
  const walletHasFunds = total > 0 && walletBalance >= total;
  const canPay = paymentMethod === 'paystack' || walletHasFunds;
  const isProcessingPayment = isValidating || isPayingWithWallet;
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const paystackReference = bookingReference;
  const paystackAmount = Math.max(Math.round(total * 100), 0);
  const paystackBridgeScript = `
    (function() {
      function postClipboardText(text) {
        try {
          if (!text) return;
          var payload = { type: 'clipboard', text: String(text) };
          try {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
              return;
            }
          } catch (err) {}
          try {
            if (window.parent && window.parent !== window && window.parent.postMessage) {
              window.parent.postMessage(payload, '*');
            }
          } catch (err) {}
          try {
            if (window.top && window.top !== window && window.top.postMessage) {
              window.top.postMessage(payload, '*');
            }
          } catch (err) {}
        } catch (err) {}
      }
      function readSelectedText() {
        try {
          const selection =
            window.getSelection && window.getSelection().toString
              ? window.getSelection().toString()
              : '';
          if (selection) return selection;
        } catch (err) {}
        try {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            const start = active.selectionStart;
            const end = active.selectionEnd;
            if (typeof start === 'number' && typeof end === 'number') {
              const value = active.value || '';
              return value.substring(start, end) || value;
            }
            return active.value || '';
          }
        } catch (err) {}
        return '';
      }
      function extractFromTarget(target) {
        try {
          let node = target;
          while (node && node !== document.body) {
            if (node.dataset) {
              if (node.dataset.clipboardText) return node.dataset.clipboardText;
              if (node.dataset.clipboardValue) return node.dataset.clipboardValue;
              if (node.dataset.copyText) return node.dataset.copyText;
            }
            if (node.getAttribute) {
              const direct =
                node.getAttribute('data-clipboard-text') ||
                node.getAttribute('data-clipboard-value') ||
                node.getAttribute('data-copy-text') ||
                node.getAttribute('data-copy-value');
              if (direct) return direct;
              const targetSelector =
                node.getAttribute('data-clipboard-target') ||
                node.getAttribute('data-copy-target');
              if (targetSelector) {
                try {
                  const targetEl = document.querySelector(targetSelector);
                  if (targetEl) {
                    const value = targetEl.value || targetEl.textContent || '';
                    if (value) return value.trim();
                  }
                } catch (err) {}
              }
            }
            node = node.parentElement;
          }
        } catch (err) {}
        return '';
      }
      function findAccountNumberFromNode(node) {
        try {
          let current = node;
          while (current && current !== document.body) {
            const text = current.textContent || '';
            const match = text.match(/\\b\\d{10}\\b/);
            if (match) return match[0];
            current = current.parentElement;
          }
        } catch (err) {}
        return '';
      }
      function findAccountNumberInDocument() {
        try {
          const docText =
            (document.body && (document.body.innerText || document.body.textContent)) || '';
          if (docText) {
            const labeled = docText.match(/account\\s*number[^\\d]*([0-9]{10})/i);
            if (labeled && labeled[1]) return labeled[1];
            const generic = docText.match(/\\b\\d{10}\\b/);
            if (generic && generic[0]) return generic[0];
          }
        } catch (err) {}
        return '';
      }
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.addEventListener(
            'message',
            function(event) {
              try {
                var data = event && event.data ? event.data : null;
                if (!data) return;
                if (typeof data === 'string') {
                  try {
                    data = JSON.parse(data);
                  } catch (err) {
                    return;
                  }
                }
                if (data && data.type === 'clipboard' && data.text) {
                  window.ReactNativeWebView.postMessage(
                    JSON.stringify({ type: 'clipboard', text: String(data.text) })
                  );
                }
              } catch (err) {}
            },
            true
          );
        }
      } catch (err) {}
      try {
        if (!navigator.clipboard) {
          navigator.clipboard = {};
        }
        const originalWriteText = navigator.clipboard.writeText;
        navigator.clipboard.writeText = function(text) {
          postClipboardText(text);
          if (typeof originalWriteText === 'function') {
            try {
              return originalWriteText.call(navigator.clipboard, text);
            } catch (err) {}
          }
          return Promise.resolve();
        };
      } catch (err) {}
      try {
        const originalExecCommand = document.execCommand;
        document.execCommand = function(command, showUI, value) {
          if (command && String(command).toLowerCase() === 'copy') {
            postClipboardText(readSelectedText());
          }
          if (typeof originalExecCommand === 'function') {
            try {
              return originalExecCommand.call(document, command, showUI, value);
            } catch (err) {}
          }
          return false;
        };
      } catch (err) {}
      try {
        document.addEventListener('copy', function(event) {
          try {
            const data =
              event &&
              event.clipboardData &&
              typeof event.clipboardData.getData === 'function'
                ? event.clipboardData.getData('text/plain')
                : '';
            const fallback = data || readSelectedText() || findAccountNumberInDocument();
            postClipboardText(fallback);
            return;
          } catch (err) {}
          postClipboardText(readSelectedText() || findAccountNumberInDocument());
        });
      } catch (err) {}
      try {
        document.addEventListener(
          'click',
          function(event) {
            try {
              const target = event && event.target ? event.target : null;
              if (!target) return;
              const direct = extractFromTarget(target);
              if (direct) {
                postClipboardText(direct);
                return;
              }
              const label = (target.textContent || '').trim().toLowerCase();
              if (label === 'copy' || label.indexOf('copy') !== -1) {
                const fallback =
                  readSelectedText() ||
                  findAccountNumberFromNode(target) ||
                  findAccountNumberInDocument();
                if (fallback) postClipboardText(fallback);
              }
            } catch (err) {}
          },
          true
        );
      } catch (err) {}
    })();
    true;
  `;
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
      if (payload?.type === 'clipboard') {
        const text = typeof payload?.text === 'string' ? payload.text.trim() : '';
        if (text) {
          Clipboard.setStringAsync(text).catch(() => null);
        }
        return;
      }
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
    <TabSafeAreaView className="flex-1 bg-slate-50" edges={['top', 'left', 'right', 'bottom']}>
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

        {offerCampaign ? (
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
                        className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
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
                          <View className="flex-row items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1">
                            <Feather
                              name={getRewardIcon(safeReward.type)}
                              size={12}
                              color="#2563eb"
                            />
                            <Text className="text-xs font-semibold text-blue-700">
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
        ) : null}

        {showPaymentSections ? (
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
                    void handleOpenPaystack();
                  }}>
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text
                        className={`text-sm font-semibold ${
                          paymentMethod === 'paystack'
                            ? 'text-blue-700'
                            : 'text-slate-700'
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
                          paymentMethod === 'wallet'
                            ? 'text-blue-700'
                            : 'text-slate-700'
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
                  <Text className="text-xs font-semibold text-rose-600">
                    {paymentError}
                  </Text>
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
        <BaseSafeAreaView
          edges={['top', 'left', 'right', 'bottom']}
          style={{ flex: 1, backgroundColor: '#fff' }}>
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
            injectedJavaScriptBeforeContentLoaded={paystackBridgeScript}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScript={paystackBridgeScript}
            injectedJavaScriptForMainFrameOnly={false}
            source={{ html: paystackHtml }}
            onMessage={handlePaystackMessage}
          />
        </BaseSafeAreaView>
      </Modal>
    </TabSafeAreaView>
  );
}
