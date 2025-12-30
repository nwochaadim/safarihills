import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { FIND_OFFER_CATEGORIES } from '@/queries/findOfferCategories';

type OfferCategoryCard = {
  id: string;
  title: string;
  description: string;
  rewards: string[];
  image: string;
  offersCount: number;
};

type FindOfferCategory = {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  rewards?: (string | null)[] | null;
  coverPhoto?: string | null;
  numberOfOffers?: number | null;
};

type FindOfferCategoriesResponse = {
  findOfferCategories: FindOfferCategory[];
};

type FindOfferCategoriesVariables = {
  limit?: number | null;
  offset?: number | null;
};

const FALLBACK_TITLE = 'Offer category';
const FALLBACK_REWARDS = ['Exclusive rewards', 'Member pricing', 'Bonus perks'];
const FALLBACK_DESCRIPTION = 'Capture the essence of this offer category.';
const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';

export default function OffersScreen() {
  const router = useRouter();
  const queryVariables = useMemo<FindOfferCategoriesVariables>(
    () => ({
      limit: 20,
      offset: 0,
    }),
    []
  );
  const [refreshing, setRefreshing] = useState(false);
  const { data, error, refetch } = useQuery<
    FindOfferCategoriesResponse,
    FindOfferCategoriesVariables
  >(
    FIND_OFFER_CATEGORIES,
    {
      variables: queryVariables,
    }
  );
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch(queryVariables);
    } finally {
      setRefreshing(false);
    }
  }, [queryVariables, refetch]);

  const categories = useMemo<OfferCategoryCard[]>(() => {
    const remoteCategories = data?.findOfferCategories ?? [];
    return remoteCategories.map((category, index) => {
      const rewards = (category?.rewards ?? [])
        .map((reward) => reward?.trim())
        .filter((reward): reward is string => Boolean(reward));
      return {
        id: category?.id ?? `offer-category-${index + 1}`,
        title: category?.name?.trim() || FALLBACK_TITLE,
        description: category?.description?.trim() || FALLBACK_DESCRIPTION,
        rewards: rewards.length > 0 ? rewards : FALLBACK_REWARDS,
        image: category?.coverPhoto || FALLBACK_IMAGE,
        offersCount: category?.numberOfOffers ?? 0,
      };
    });
  }, [data]);

  const hasError = Boolean(error);
  const showEmptyState = !hasError && categories.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#1d4ed8"
            colors={['#1d4ed8']}
          />
        }>
        <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Safarihills
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Apartment deals and offers</Text>
        <Text className="mt-1 text-sm text-slate-500">
          The biggest marketplace for apartment deals, flash discounts, and stay rewards.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100">
          <View className="flex-row items-center gap-4">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <Feather name="tag" size={20} color="#1d4ed8" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-slate-900">
                New deals drop every week
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Save on late-night arrivals, long stays, half-day rests, and spa perks.
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Offer categories
          </Text>
        </View>

        {hasError ? (
          <View className="mt-6">
            <BlankSlate
              title="Encountered error while trying to fetch offers."
              description="Try again later."
              iconName="alert-triangle"
            />
          </View>
        ) : null}

        {showEmptyState ? (
          <View className="mt-6">
            <BlankSlate
              title="No offers exist yet."
              description="Check back soon."
              iconName="tag"
            />
          </View>
        ) : (
          categories.map((category) => (
            <Pressable
              key={category.id}
              className="mt-5 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-slate-100"
              onPress={() => router.push(`/offers/${category.id}`)}>
              <LoadingImageBackground source={{ uri: category.image }} className="h-40">
                <View className="absolute inset-0 bg-black/35" />
                <View className="flex-1 justify-between p-4">
                  <View className="self-end rounded-full bg-white/90 px-3 py-1">
                    <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                      {category.offersCount} offers
                    </Text>
                  </View>
                  <Text className="text-2xl font-bold text-white">{category.title}</Text>
                </View>
              </LoadingImageBackground>

              <View className="p-5">
                <View className="flex-row flex-wrap gap-2">
                  {category.rewards.map((reward) => (
                    <View
                      key={reward}
                      className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                      <Text className="text-xs font-semibold text-blue-700">{reward}</Text>
                    </View>
                  ))}
                </View>
                <Text className="mt-3 text-sm text-slate-500">{category.description}</Text>
                <View className="mt-4 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-blue-700">View offers</Text>
                  <Feather name="arrow-right" size={18} color="#1d4ed8" />
                </View>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
