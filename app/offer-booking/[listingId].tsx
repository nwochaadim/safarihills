import { BackButton } from '@/components/BackButton';
import { HtmlViewer } from '@/components/HtmlViewer';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import {
  buildActiveListingOfferClaimsById,
  formatListingOfferClaimDeadline,
  formatListingOfferClaimWindow,
  formatListingOfferPublicWindow,
  getListingOfferPublicStatus,
  ListingOfferClaimSnapshot,
  ListingOffersResponse,
  mapRemoteListingOffers,
  parseListingOfferParam,
  type ListingOffer,
  type ListingOfferReward,
} from '@/data/listingOffers';
import { findListingById } from '@/data/listings';
import { AuthStatus } from '@/lib/authStatus';
import { CLAIM_LISTING_OFFER } from '@/mutations/claimListingOffer';
import { LISTING_OFFERS } from '@/queries/listingOffers';
import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { trackEvent } from '@/lib/analytics';
import { ANALYTICS_EVENTS } from '@/lib/analytics.schema';

const getOfferThemeMeta = (theme: ListingOffer['theme']) => {
  if (theme === 'emerald') {
    return {
      badgeClass: 'bg-emerald-500/95',
      badgeTextClass: 'text-white',
      chipClass: 'border-emerald-200 bg-emerald-50',
      chipTextClass: 'text-emerald-700',
      iconColor: '#059669',
      actionClass: 'bg-emerald-600',
      cardClass: 'border-emerald-200 bg-emerald-50/85',
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
      cardClass: 'border-sky-200 bg-sky-50/85',
    };
  }

  return {
    badgeClass: 'bg-amber-400/95',
    badgeTextClass: 'text-amber-950',
    chipClass: 'border-amber-200 bg-amber-50',
    chipTextClass: 'text-amber-700',
    iconColor: '#d97706',
    actionClass: 'bg-slate-900',
    cardClass: 'border-amber-200 bg-amber-50/90',
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

const normalizePercentage = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 100);
};

const getRewardIcon = (rewardType: string | null) => {
  if (rewardType?.includes('Discount')) return 'percent';
  if (rewardType?.includes('Perk')) return 'gift';
  return 'award';
};

const getRewardTag = (reward: ListingOfferReward) => {
  if (reward.rewardType?.includes('Discount')) return 'Discount';
  if (reward.rewardType?.includes('Perk')) return 'Perk';
  return 'Reward';
};

const getRewardTitle = (reward: ListingOfferReward) => {
  if (reward.name?.trim()) return reward.name.trim();
  if (reward.rewardType?.includes('Discount')) return 'Discounted rate';
  if (reward.rewardType?.includes('Perk')) return 'Included perk';
  return 'Offer reward';
};

const getRewardDescription = (reward: ListingOfferReward) => {
  if (reward.description?.trim()) return reward.description.trim();
  if (reward.rewardType?.includes('Perk') && reward.name?.trim()) {
    return reward.name.trim();
  }
  return null;
};

const getDiscountedPrice = (basePrice: number, percentDiscount: number) =>
  Math.round(basePrice * (1 - percentDiscount / 100));

type ClaimListingOfferResponse = {
  claimListingOffer: {
    success?: boolean | null;
    message?: string | null;
    errors?: string[] | string | null;
    claim?: {
      id?: string | null;
      status?: string | null;
      claimedAt?: string | null;
      holdExpiresAt?: string | null;
    } | null;
  } | null;
};

type ClaimListingOfferVariables = {
  offerId: string;
  listingId: string;
};

export default function LocalOfferBookingScreen() {
  const router = useRouter();
  const {
    listingId: listingIdParam,
    offerId: offerIdParam,
    listingName: listingNameParam,
    listingArea: listingAreaParam,
    listingImage: listingImageParam,
    minimumPrice: minimumPriceParam,
    offer: offerParam,
    source_screen: sourceScreenParam,
    source_surface: sourceSurfaceParam,
    source_section: sourceSectionParam,
    item_list_id: itemListIdParam,
    item_list_name: itemListNameParam,
  } = useLocalSearchParams<{
    listingId?: string | string[];
    offerId?: string | string[];
    listingName?: string | string[];
    listingArea?: string | string[];
    listingImage?: string | string[];
    minimumPrice?: string | string[];
    offer?: string | string[];
    source_screen?: string | string[];
    source_surface?: string | string[];
    source_section?: string | string[];
    item_list_id?: string | string[];
    item_list_name?: string | string[];
  }>();

  const listingId = Array.isArray(listingIdParam) ? listingIdParam[0] : listingIdParam;
  const offerId = Array.isArray(offerIdParam) ? offerIdParam[0] : offerIdParam;
  const listingName = Array.isArray(listingNameParam) ? listingNameParam[0] : listingNameParam;
  const listingArea = Array.isArray(listingAreaParam) ? listingAreaParam[0] : listingAreaParam;
  const listingImage = Array.isArray(listingImageParam) ? listingImageParam[0] : listingImageParam;
  const minimumPrice = parseNumberParam(minimumPriceParam);
  const parsedOffer = parseListingOfferParam(offerParam);
  const sourceScreen = Array.isArray(sourceScreenParam) ? sourceScreenParam[0] : sourceScreenParam;
  const sourceSurface = Array.isArray(sourceSurfaceParam)
    ? sourceSurfaceParam[0]
    : sourceSurfaceParam;
  const sourceSection = Array.isArray(sourceSectionParam)
    ? sourceSectionParam[0]
    : sourceSectionParam;
  const itemListId = Array.isArray(itemListIdParam) ? itemListIdParam[0] : itemListIdParam;
  const itemListName = Array.isArray(itemListNameParam)
    ? itemListNameParam[0]
    : itemListNameParam;
  const backToListingHref = useMemo(
    () =>
      listingId
        ? {
            pathname: '/listing/[id]' as const,
            params: {
              id: listingId,
              source_screen: sourceScreen ?? 'listing_detail',
              source_surface: sourceSurface,
              source_section: sourceSection,
              item_list_id: itemListId,
              item_list_name: itemListName,
            },
          }
        : null,
    [itemListId, itemListName, listingId, sourceScreen, sourceSection, sourceSurface]
  );
  const handleBack = useCallback(() => {
    if (backToListingHref) {
      router.dismissTo(backToListingHref);
      return;
    }

    router.back();
  }, [backToListingHref, router]);
  const fallbackListing = useMemo(
    () => (listingId ? findListingById(listingId) : undefined),
    [listingId]
  );
  const [now, setNow] = useState(() => Date.now());
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [claimOverride, setClaimOverride] = useState<ListingOfferClaimSnapshot | null>(null);
  const [isLocking, setIsLocking] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const { data, loading, refetch } = useQuery<ListingOffersResponse>(LISTING_OFFERS, {
    variables: { listingId: listingId ?? '' },
    skip: !listingId,
  });
  const [claimListingOffer] = useMutation<
    ClaimListingOfferResponse,
    ClaimListingOfferVariables
  >(CLAIM_LISTING_OFFER);

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
  const remoteOffers = useMemo(
    () => mapRemoteListingOffers(data?.listingOffers, resolvedListing),
    [data?.listingOffers, resolvedListing]
  );
  const remoteClaimsById = useMemo(
    () =>
      buildActiveListingOfferClaimsById({
        offers: data?.listingOffers,
        listingId: resolvedListing.id,
      }),
    [data?.listingOffers, resolvedListing.id]
  );

  const selectedOffer = useMemo(
    () => remoteOffers.find((offer) => offer.id === offerId) ?? parsedOffer ?? null,
    [offerId, parsedOffer, remoteOffers]
  );
  const claim = useMemo(() => {
    if (!selectedOffer) return null;
    if (claimOverride && claimOverride.offerId === selectedOffer.id) return claimOverride;
    return remoteClaimsById[selectedOffer.id] ?? null;
  }, [claimOverride, remoteClaimsById, selectedOffer]);

  useEffect(() => {
    let isActive = true;
    AuthStatus.isSignedIn().then((signedIn) => {
      if (isActive) {
        setAuthStatus(signedIn ? 'signed-in' : 'signed-out');
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const shouldTick = Boolean(claim) || selectedOffer?.urgencyMode === 'countdown';
    if (!shouldTick) return undefined;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [claim, selectedOffer]);

  useEffect(() => {
    if (!claim) return;
    if (new Date(claim.holdExpiresAt).getTime() > now) return;
    setClaimOverride(null);
    void refetch({ listingId: resolvedListing.id });
  }, [claim, now, refetch, resolvedListing.id]);

  useEffect(() => {
    if (!selectedOffer) {
      return;
    }

    void trackEvent(ANALYTICS_EVENTS.ViewPromotion, {
      promotion_id: selectedOffer.id,
      promotion_name: selectedOffer.title,
      source_screen: 'listing_offer_review',
      source_surface: 'offer_review',
      listing_id: resolvedListing.id,
      listing_name: resolvedListing.name,
      city: resolvedListing.area,
      offer_type: selectedOffer.badge,
      savings_label: selectedOffer.savingsLabel,
    });
  }, [resolvedListing.area, resolvedListing.id, resolvedListing.name, selectedOffer]);

  if (!selectedOffer) {
    if (loading) {
      return (
        <SafeAreaView className="flex-1 bg-white">
          <Stack.Screen options={{ headerShown: false }} />
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#2563eb" />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-lg font-semibold text-slate-900">Offer unavailable</Text>
        <Pressable
          className="mt-4 rounded-full bg-blue-600 px-5 py-3"
          onPress={handleBack}>
          <Text className="text-sm font-semibold text-white">Return to listing</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const theme = getOfferThemeMeta(selectedOffer.theme);
  const publicStatus = getListingOfferPublicStatus(selectedOffer, now);
  const publicWindowLabel = formatListingOfferPublicWindow(selectedOffer, now);
  const claimWindowLabel = claim ? formatListingOfferClaimWindow(claim.holdExpiresAt, now) : null;
  const claimDeadlineLabel = claim ? formatListingOfferClaimDeadline(claim.holdExpiresAt) : null;
  const offerRewards = selectedOffer.rewards ?? [];
  const canLockOffer = publicStatus === 'live' && !claim;
  const canContinueWithOffer = Boolean(claim);

  const handleLockOffer = async () => {
    if (!canLockOffer || isLocking) return;
    if (authStatus !== 'signed-in') {
      router.push('/auth/login');
      return;
    }

    void trackEvent(ANALYTICS_EVENTS.SelectPromotion, {
      promotion_id: selectedOffer.id,
      promotion_name: selectedOffer.title,
      source_screen: sourceScreen ?? 'listing_detail',
      source_surface: 'lock_offer_cta',
      listing_id: resolvedListing.id,
      listing_name: resolvedListing.name,
      city: resolvedListing.area,
      offer_type: selectedOffer.badge,
      savings_label: selectedOffer.savingsLabel,
    });

    setIsLocking(true);
    setClaimError(null);
    try {
      const { data: response } = await claimListingOffer({
        variables: {
          offerId: selectedOffer.id,
          listingId: resolvedListing.id,
        },
      });
      const payload = response?.claimListingOffer;
      const errors = payload?.errors;
      if (Array.isArray(errors) && errors.length) {
        setClaimError(errors.join(' '));
        return;
      }
      if (typeof errors === 'string' && errors.trim()) {
        setClaimError(errors);
        return;
      }
      if (!payload?.claim?.id || !payload.claim.claimedAt || !payload.claim.holdExpiresAt) {
        setClaimError(payload?.message ?? 'Unable to lock this offer right now.');
        return;
      }

      setClaimOverride({
        id: payload.claim.id,
        offerId: selectedOffer.id,
        listingId: resolvedListing.id,
        status: payload.claim.status ?? 'active',
        claimedAt: payload.claim.claimedAt,
        holdExpiresAt: payload.claim.holdExpiresAt,
      });
      setNow(Date.now());
      await refetch({ listingId: resolvedListing.id });
    } finally {
      setIsLocking(false);
    }
  };

  const handleContinueWithOffer = () => {
    if (!claim) return;

    void trackEvent(ANALYTICS_EVENTS.BeginBooking, {
      booking_mode: 'offer',
      source_screen: sourceScreen ?? 'listing_offer_review',
      source_surface: sourceSurface ?? 'locked_offer_cta',
      source_section: sourceSection,
      listing_id: resolvedListing.id,
      listing_name: resolvedListing.name,
      city: resolvedListing.area,
      offer_id: selectedOffer.id,
      offer_name: selectedOffer.title,
      offer_selected: 1,
      value: resolvedListing.minimumPrice,
      currency: 'NGN',
    });

    router.push({
      pathname: '/(tabs)/offers/[categoryId]/[offerId]/book',
      params: {
        categoryId: 'listing-offers',
        offerId: selectedOffer.id,
        listingId: resolvedListing.id,
        source_screen: sourceScreen ?? 'listing_offer_review',
        source_surface: sourceSurface ?? 'locked_offer_cta',
        source_section: sourceSection,
        item_list_id: itemListId,
        item_list_name: itemListName,
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
          <BackButton onPress={handleBack} />
          <Text className="mt-5 text-xs font-semibold uppercase tracking-[0.35em] text-amber-500">
            Offer booking
          </Text>
          <Text className="mt-2 text-3xl font-bold text-slate-900">Review this offer</Text>
        </View>

        <View className="mt-6 px-6">
          <View className={`overflow-hidden rounded-[30px] border ${theme.cardClass}`}>
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
                <HtmlViewer
                  html={selectedOffer.subtitle}
                  className="mt-2"
                  textClassName="text-sm leading-6 text-slate-100"
                />

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
                      Public window
                    </Text>
                    <Text className="mt-1 text-base font-semibold text-white">
                      {publicWindowLabel}
                    </Text>
                  </View>

                  {claim ? (
                    <View className="rounded-2xl border border-emerald-200 bg-emerald-500/25 px-4 py-3">
                      <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-100">
                        Your lock
                      </Text>
                      <Text className="mt-1 text-base font-semibold text-white">
                        {claimWindowLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </LoadingImageBackground>
          </View>
        </View>

        {claim ? (
          <View className="mt-6 px-6">
            <View className="rounded-3xl border border-emerald-200 bg-emerald-50/80 p-5">
              <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Rate locked for you
              </Text>
              <Text className="mt-2 text-2xl font-bold text-slate-900">{claimWindowLabel}</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                {claimDeadlineLabel}. Finish your stay details before the lock ends and we will
                keep this offer visible throughout the booking flow.
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
  
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
          <View className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Offer description
            </Text>
            <HtmlViewer
              html={selectedOffer.terms}
              className="mt-3"
              textClassName="text-sm leading-6 text-slate-600"
            />
            {claimError ? (
              <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                <Text className="text-sm font-semibold text-rose-600">{claimError}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-6 px-6">
          <View className="rounded-3xl border border-slate-200 bg-slate-50/85 p-5">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              What you get
            </Text>
            {offerRewards.length > 0 ? (
              <View className="mt-4 gap-3">
                {offerRewards.map((reward) => {
                  const percentDiscount = normalizePercentage(reward.percentDiscount);
                  const isDiscountReward =
                    reward.rewardType?.includes('Discount') && percentDiscount > 0;
                  const rewardDescription = getRewardDescription(reward);

                  return (
                    <View
                      key={reward.id}
                      className="rounded-2xl border border-white bg-white px-4 py-4">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-slate-900">
                            {getRewardTitle(reward)}
                          </Text>
                          {rewardDescription ? (
                            <Text className="mt-1 text-sm leading-6 text-slate-600">
                              {rewardDescription}
                            </Text>
                          ) : null}
                        </View>

                        <View className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                          <Feather
                            name={getRewardIcon(reward.rewardType)}
                            size={12}
                            color={theme.iconColor}
                          />
                          <Text className="text-xs font-semibold text-slate-700">
                            {getRewardTag(reward)}
                          </Text>
                        </View>
                      </View>

                      {isDiscountReward ? (
                        <View className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
                          <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            Discounted listing price
                          </Text>
                          <View className="mt-2 flex-row items-center gap-3">
                            <Text
                              className="text-base font-medium text-slate-400"
                              style={{ textDecorationLine: 'line-through' }}>
                              {formatCurrency(resolvedListing.minimumPrice)}
                            </Text>
                            <Text className="text-xl font-bold text-emerald-700">
                              {formatCurrency(
                                getDiscountedPrice(resolvedListing.minimumPrice, percentDiscount)
                              )}
                            </Text>
                            <Text className="text-sm font-semibold text-emerald-700">
                              {percentDiscount}% off
                            </Text>
                          </View>
                          <Text className="mt-1 text-sm text-emerald-700">per night</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text className="mt-3 text-sm leading-6 text-slate-600">
                No rewards have been listed for this offer yet.
              </Text>
            )}
          </View>
        </View>

        <View className="mt-8 px-6">
          {!claim ? (
            <Pressable
              className={`items-center justify-center rounded-full py-4 ${
                canLockOffer && !isLocking ? 'bg-blue-600' : 'bg-slate-200'
              }`}
              disabled={!canLockOffer || isLocking}
              onPress={handleLockOffer}>
              <Text
                className={`text-base font-semibold ${
                  canLockOffer && !isLocking ? 'text-white' : 'text-slate-500'
                }`}>
                {publicStatus === 'live'
                  ? authStatus !== 'signed-in'
                    ? 'Sign in to lock this offer'
                    : isLocking
                      ? 'Locking your offer...'
                      : `Book this offer - Locked for ${selectedOffer.claimHoldMinutes}mins`
                  : 'Offer not live yet'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              className={`items-center justify-center rounded-full py-4 ${theme.actionClass}`}
              disabled={!canContinueWithOffer}
              onPress={handleContinueWithOffer}>
              <Text className="text-base font-semibold text-white">Continue with locked offer</Text>
            </Pressable>
          )}

          <Pressable
            className="mt-3 items-center justify-center rounded-full border border-slate-200 bg-white py-4"
            onPress={() => {
              void trackEvent(ANALYTICS_EVENTS.BeginBooking, {
                booking_mode: 'standard',
                source_screen: sourceScreen ?? 'listing_offer_review',
                source_surface: 'book_without_offer_cta',
                source_section: sourceSection,
                listing_id: resolvedListing.id,
                listing_name: resolvedListing.name,
                city: resolvedListing.area,
                offer_selected: 0,
                value: resolvedListing.minimumPrice,
                currency: 'NGN',
              });

              router.push({
                pathname: '/booking/[id]',
                params: {
                  id: resolvedListing.id,
                  source_screen: sourceScreen ?? 'listing_offer_review',
                  source_surface: 'book_without_offer_cta',
                  source_section: sourceSection,
                  item_list_id: itemListId,
                  item_list_name: itemListName,
                },
              });
            }}>
            <Text className="text-base font-semibold text-slate-700">Book without this offer</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
