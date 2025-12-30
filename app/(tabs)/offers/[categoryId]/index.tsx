import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { OFFER_CATEGORIES } from '@/data/offers';
import { FIND_OFFERS_FOR_CAMPAIGN_CATEGORY } from '@/queries/findOffersForCampaignCategory';

type OfferCategory = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  rewards?: (string | null)[] | null;
  image?: string | null;
  numberOfOffers?: number | null;
};

type OfferCampaignReward = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
};

type OfferCampaignListing = {
  id?: string | null;
  listing?: {
    name?: string | null;
    rating?: number | null;
    coverPhoto?: string | null;
    description?: string | null;
    area?: string | null;
  } | null;
  price?: number | null;
};

type OfferCampaign = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  coverPhoto?: string | null;
  imagesUrl?: (string | null)[] | null;
  offerCampaignRewards?: OfferCampaignReward[] | null;
  offerCampaignListings?: OfferCampaignListing[] | null;
};

type FindOffersForCampaignCategoryResponse = {
  category?: OfferCategory | null;
  offers?: OfferCampaign[] | null;
};

type FindOffersForCampaignCategoryVariables = {
  categoryId: string;
};

type OfferCard = {
  id: string;
  title: string;
  description: string;
  rewards: string[];
  image: string;
};

const FALLBACK_CATEGORY_TITLE = 'Offer category';
const FALLBACK_OFFER_TITLE = 'Offer';
const FALLBACK_DESCRIPTION = 'Capture the essence of this offer category.';
const FALLBACK_OFFER_DESCRIPTION = 'Enjoy a curated offer tailored for you.';
const FALLBACK_REWARDS = ['Exclusive rewards', 'Member pricing', 'Bonus perks'];
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

const stripHtml = (value?: string | null) => {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

export default function OfferCategoryScreen() {
  const router = useRouter();
  const { categoryId: categoryParam } = useLocalSearchParams<{ categoryId?: string | string[] }>();
  const categoryId = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  const localCategory = useMemo(
    () => OFFER_CATEGORIES.find((item) => item.id === categoryId),
    [categoryId]
  );

  const { data, error } = useQuery<
    FindOffersForCampaignCategoryResponse,
    FindOffersForCampaignCategoryVariables
  >(FIND_OFFERS_FOR_CAMPAIGN_CATEGORY, {
    variables: { categoryId: categoryId ?? '' },
    skip: !categoryId,
  });

  const category = useMemo(() => {
    const remoteCategory = data?.category ?? null;
    const rewards = (remoteCategory?.rewards ?? [])
      .map((reward) => reward?.trim())
      .filter((reward): reward is string => Boolean(reward));
    return {
      id: remoteCategory?.id ?? localCategory?.id ?? categoryId ?? 'offer-category',
      title: remoteCategory?.name?.trim() || localCategory?.title || FALLBACK_CATEGORY_TITLE,
      description:
        remoteCategory?.description?.trim() ||
        localCategory?.description ||
        FALLBACK_DESCRIPTION,
      rewards: rewards.length > 0 ? rewards : localCategory?.rewards ?? FALLBACK_REWARDS,
      image: remoteCategory?.image || localCategory?.image || FALLBACK_IMAGE,
      offersCount:
        remoteCategory?.numberOfOffers ??
        data?.offers?.length ??
        localCategory?.offers.length ??
        0,
    };
  }, [categoryId, data?.category, data?.offers?.length, localCategory]);

  const offers = useMemo<OfferCard[]>(() => {
    const remoteOffers = data?.offers ?? [];
    if (remoteOffers.length > 0) {
      return remoteOffers.map((offer, index) => {
        const rewards = (offer?.offerCampaignRewards ?? [])
          .map((reward) => reward?.name?.trim() || reward?.description?.trim())
          .filter((reward): reward is string => Boolean(reward));
        const description = stripHtml(offer?.description) || FALLBACK_OFFER_DESCRIPTION;
        const coverPhoto = offer?.coverPhoto?.trim();
        const galleryImage = offer?.imagesUrl?.find((image) => image?.trim())?.trim();
        return {
          id: offer?.id ?? `offer-${index + 1}`,
          title: offer?.name?.trim() || FALLBACK_OFFER_TITLE,
          description,
          rewards: rewards.length > 0 ? rewards : category.rewards,
          image: coverPhoto || galleryImage || category.image || FALLBACK_IMAGE,
        };
      });
    }

    if (localCategory?.offers.length) {
      return localCategory.offers.map((offer) => ({
        id: offer.id,
        title: offer.title,
        description: offer.description || FALLBACK_OFFER_DESCRIPTION,
        rewards: offer.rewards.length > 0 ? offer.rewards : category.rewards,
        image: offer.image || category.image || FALLBACK_IMAGE,
      }));
    }

    return [];
  }, [category.image, category.rewards, data?.offers, localCategory]);

  const hasRemoteCategory = Boolean(data?.category);
  const hasLocalCategory = Boolean(localCategory);
  const hasOffers =
    (data?.offers?.length ?? 0) > 0 || (localCategory?.offers?.length ?? 0) > 0;
  const hasCategory = hasRemoteCategory || hasLocalCategory || hasOffers;

  if (!categoryId || !hasCategory) {
    const title = error
      ? 'Encountered error while trying to fetch offers.'
      : 'Offer not found';
    const description = error
      ? 'Try again later.'
      : 'Try another offer category from the main deals page.';
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50 px-6">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-4 text-2xl font-bold text-slate-900">{title}</Text>
        <Text className="mt-2 text-sm text-slate-500">{description}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Offers
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">{category.title}</Text>
        <Text className="mt-1 text-sm text-slate-500">{category.description}</Text>

        <View className="mt-8 gap-5">
          {offers.map((offer) => (
            <Pressable
              key={offer.id}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm shadow-slate-100"
              onPress={() => router.push(`/offers/${category.id}/${offer.id}`)}>
              <LoadingImageBackground source={{ uri: offer.image }} className="h-36">
                <View className="absolute inset-0 bg-black/35" />
                <View className="flex-1 justify-end p-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                    Rewards
                  </Text>
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {offer.rewards.map((reward) => (
                      <View key={reward} className="rounded-full bg-white/90 px-3 py-1">
                        <Text className="text-xs font-semibold text-blue-700">{reward}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </LoadingImageBackground>
              <View className="p-5">
                <Text className="text-lg font-semibold text-slate-900">{offer.title}</Text>
                <Text className="mt-2 text-sm text-slate-500">{offer.description}</Text>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-blue-700">See listings</Text>
                  <Feather name="arrow-right" size={18} color="#1d4ed8" />
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
