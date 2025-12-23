import { BackButton } from '@/components/BackButton';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { OFFER_CATEGORIES } from '@/data/offers';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

export default function OfferCategoryScreen() {
  const router = useRouter();
  const { categoryId: categoryParam } = useLocalSearchParams<{ categoryId?: string | string[] }>();
  const categoryId = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;

  const category = useMemo(
    () => OFFER_CATEGORIES.find((item) => item.id === categoryId),
    [categoryId]
  );

  if (!category) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50 px-6">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-4 text-2xl font-bold text-slate-900">Offer not found</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Try another offer category from the main deals page.
        </Text>
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
          {category.offers.map((offer) => (
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
