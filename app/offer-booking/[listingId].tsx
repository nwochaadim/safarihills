import { BackButton } from '@/components/BackButton';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import {
  buildMockOffersForListing,
  formatListingOfferExpiry,
  isListingOfferExpired,
  parseListingOfferParam,
  type ListingOffer,
} from '@/data/listingOffers';
import { findListingById } from '@/data/listings';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const getOfferThemeMeta = (theme: ListingOffer['theme']) => {
  if (theme === 'emerald') {
    return {
      badgeClass: 'bg-emerald-500/95',
      badgeTextClass: 'text-white',
      chipClass: 'border-emerald-200 bg-emerald-50',
      chipTextClass: 'text-emerald-700',
      iconColor: '#059669',
      actionClass: 'bg-emerald-600',
    };
  }

  if (theme === 'sky') {
    return {
      badgeClass: 'bg-sky-500/95',
      badgeTextClass: 'text-white',
      chipClass: 'border-sky-200 bg-sky-50',
      chipTextClass: 'text-sky-700',
      iconColor: '#0284c7',
      actionClass: 'bg-sky-600',
    };
  }

  return {
    badgeClass: 'bg-amber-400/95',
    badgeTextClass: 'text-amber-950',
    chipClass: 'border-amber-200 bg-amber-50',
    chipTextClass: 'text-amber-700',
    iconColor: '#d97706',
    actionClass: 'bg-slate-900',
  };
};

const parseNumberParam = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

export default function LocalOfferBookingScreen() {
  const router = useRouter();
  const {
    listingId: listingIdParam,
    listingName: listingNameParam,
    listingArea: listingAreaParam,
    listingImage: listingImageParam,
    minimumPrice: minimumPriceParam,
    offer: offerParam,
  } = useLocalSearchParams<{
    listingId?: string | string[];
    listingName?: string | string[];
    listingArea?: string | string[];
    listingImage?: string | string[];
    minimumPrice?: string | string[];
    offer?: string | string[];
  }>();

  const listingId = Array.isArray(listingIdParam) ? listingIdParam[0] : listingIdParam;
  const listingName = Array.isArray(listingNameParam) ? listingNameParam[0] : listingNameParam;
  const listingArea = Array.isArray(listingAreaParam) ? listingAreaParam[0] : listingAreaParam;
  const listingImage = Array.isArray(listingImageParam) ? listingImageParam[0] : listingImageParam;
  const minimumPrice = parseNumberParam(minimumPriceParam);
  const parsedOffer = parseListingOfferParam(offerParam);
  const fallbackListing = useMemo(
    () => (listingId ? findListingById(listingId) : undefined),
    [listingId]
  );
  const [offerSeedTimestamp] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const resolvedListing = useMemo(
    () => ({
      id: listingId ?? fallbackListing?.id ?? 'listing',
      name: listingName ?? fallbackListing?.name ?? 'Safarihills stay',
      area: listingArea ?? fallbackListing?.area ?? 'Lagos',
      image: listingImage ?? fallbackListing?.coverPhoto ?? fallbackListing?.gallery[0] ?? '',
      minimumPrice: minimumPrice ?? fallbackListing?.minimumPrice ?? 0,
      bookingOptions: fallbackListing?.bookingOptions ?? ['entire'],
    }),
    [fallbackListing, listingArea, listingId, listingImage, listingName, minimumPrice]
  );

  const selectedOffer = useMemo(
    () =>
      parsedOffer ??
      buildMockOffersForListing(
        {
          id: resolvedListing.id,
          name: resolvedListing.name,
          area: resolvedListing.area,
          minimumPrice: resolvedListing.minimumPrice,
          bookingOptions: resolvedListing.bookingOptions,
        },
        offerSeedTimestamp
      )[0] ??
      null,
    [offerSeedTimestamp, parsedOffer, resolvedListing]
  );

  useEffect(() => {
    if (!selectedOffer || selectedOffer.expirationMode !== 'countdown') return undefined;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedOffer]);

  if (!selectedOffer) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-lg font-semibold text-slate-900">Offer unavailable</Text>
        <Pressable
          className="mt-4 rounded-full bg-blue-600 px-5 py-3"
          onPress={() => router.back()}>
          <Text className="text-sm font-semibold text-white">Return to listing</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const theme = getOfferThemeMeta(selectedOffer.theme);
  const expiryLabel = formatListingOfferExpiry(selectedOffer, now);
  const isExpired = isListingOfferExpired(selectedOffer, now);

  const handleContinueWithOffer = () => {
    router.push({
      pathname: '/booking/[id]',
      params: {
        id: resolvedListing.id,
        claimedOfferTitle: selectedOffer.title,
        claimedOfferSavingsLabel: selectedOffer.savingsLabel,
        claimedOfferExpiryLabel: expiryLabel,
      },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-4">
          <BackButton onPress={() => router.back()} />
          <Text className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-amber-500">
            Offer booking
          </Text>
          <Text className="mt-2 text-3xl font-bold text-slate-900">Claim your offer</Text>
          <Text className="mt-2 text-base leading-6 text-slate-500">
            Review the offer for {resolvedListing.name} before continuing to your booking details.
          </Text>
        </View>

        <View className="mt-6 px-6">
          <View className="overflow-hidden rounded-[30px] border border-slate-200 bg-slate-900">
            <LoadingImageBackground
              source={{ uri: resolvedListing.image }}
              className="h-80 justify-end"
              imageStyle={{ opacity: 0.9 }}>
              <View className="absolute inset-0 bg-slate-950/35" />
              <View className="p-5">
                <View className={`self-start rounded-full px-3 py-1.5 ${theme.badgeClass}`}>
                  <Text
                    className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${theme.badgeTextClass}`}>
                    {selectedOffer.badge}
                  </Text>
                </View>

                <Text className="mt-4 text-3xl font-bold text-white">{selectedOffer.title}</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-100">
                  {selectedOffer.subtitle}
                </Text>

                <View className="mt-5 flex-row flex-wrap gap-3">
                  <View className="rounded-2xl bg-white/95 px-4 py-3">
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Savings
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-slate-900">
                      {selectedOffer.savingsLabel}
                    </Text>
                  </View>

                  <View className="rounded-2xl border border-white/20 bg-black/20 px-4 py-3">
                    <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      Expiry
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-white">{expiryLabel}</Text>
                  </View>
                </View>
              </View>
            </LoadingImageBackground>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Stay snapshot
            </Text>
            <Text className="mt-3 text-xl font-semibold text-slate-900">{resolvedListing.name}</Text>
            <Text className="mt-1 text-sm text-slate-500">
              {resolvedListing.area} · From {formatCurrency(resolvedListing.minimumPrice)} per
              night
            </Text>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {selectedOffer.highlights.map((highlight) => (
                <View
                  key={`${selectedOffer.id}-${highlight}`}
                  className={`rounded-full border px-3 py-1.5 ${theme.chipClass}`}>
                  <Text className={`text-xs font-semibold ${theme.chipTextClass}`}>
                    {highlight}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              What happens next
            </Text>
            <View className="mt-4 gap-3">
              {[
                'Continue to booking and choose your dates.',
                'Complete your stay details while the offer is still active.',
                'Review the listing and finish your booking request.',
              ].map((step) => (
                <View
                  key={step}
                  className="flex-row items-start gap-3 rounded-2xl border border-white bg-white px-4 py-3">
                  <View
                    className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-white"
                    style={{ borderWidth: 1, borderColor: `${theme.iconColor}33` }}>
                    <Feather name="check" size={14} color={theme.iconColor} />
                  </View>
                  <Text className="flex-1 text-sm leading-6 text-slate-600">{step}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Offer terms
            </Text>
            <Text className="mt-3 text-sm leading-6 text-slate-600">{selectedOffer.terms}</Text>
          </View>
        </View>

        <View className="mt-8 px-6">
          <Pressable
            className={`items-center justify-center rounded-full py-4 ${
              isExpired ? 'bg-slate-200' : theme.actionClass
            }`}
            disabled={isExpired}
            onPress={handleContinueWithOffer}>
            <Text
              className={`text-base font-semibold ${
                isExpired ? 'text-slate-500' : 'text-white'
              }`}>
              {isExpired ? 'This offer has ended' : 'Continue with this offer'}
            </Text>
          </Pressable>

          <Pressable
            className="mt-3 items-center justify-center rounded-full border border-slate-200 bg-white py-4"
            onPress={() =>
              router.push({ pathname: '/booking/[id]', params: { id: resolvedListing.id } })
            }>
            <Text className="text-base font-semibold text-slate-700">Book without this offer</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
