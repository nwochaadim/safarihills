import { BackButton } from '@/components/BackButton';
import { LoadingImage } from '@/components/LoadingImage';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { OFFER_CATEGORIES, OfferDeal } from '@/data/offers';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

export default function OfferCategoryScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const [selectedOffer, setSelectedOffer] = useState<OfferDeal | null>(null);
  const modalMaxHeight = Math.min(700, Dimensions.get('window').height * 0.82);

  const category = useMemo(
    () => OFFER_CATEGORIES.find((item) => item.id === id),
    [id]
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
              onPress={() => setSelectedOffer(offer)}>
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

      <Modal
        animationType="slide"
        transparent
        visible={Boolean(selectedOffer)}
        onRequestClose={() => setSelectedOffer(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-[32px] bg-white px-6 pb-10 pt-6"
            style={{ maxHeight: modalMaxHeight }}>
            <View className="mb-6 h-1 w-14 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-4">
                <Text className="text-2xl font-bold text-slate-900">
                  {selectedOffer?.title}
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {selectedOffer?.description}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedOffer(null)}>
                <Feather name="x" size={22} color="#0f172a" />
              </Pressable>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {selectedOffer?.rewards.map((reward) => (
                <View key={reward} className="rounded-full bg-blue-50 px-3 py-1">
                  <Text className="text-xs font-semibold text-blue-700">{reward}</Text>
                </View>
              ))}
            </View>

            <View className="mt-5 rounded-2xl border border-slate-100 bg-slate-50/70">
              <FlatList
                data={selectedOffer?.listings ?? []}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index !== 0 ? 'border-t border-slate-100' : ''
                    }`}>
                    <LoadingImage
                      source={{ uri: item.image }}
                      style={{ height: 58, width: 58 }}
                      className="rounded-2xl"
                    />
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
                      <View className="mt-1 flex-row items-center gap-2">
                        <Feather name="map-pin" size={14} color="#94a3b8" />
                        <Text className="text-sm text-slate-500">{item.location}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-base font-semibold text-slate-900">
                        {formatCurrency(item.price)}
                      </Text>
                      <Text className="text-xs text-slate-500">{item.priceUnit}</Text>
                    </View>
                  </View>
                )}
              />
            </View>

            <Pressable
              className="mt-6 items-center justify-center rounded-full bg-blue-600 py-4 shadow-sm shadow-blue-200"
              onPress={() => setSelectedOffer(null)}>
              <Text className="text-base font-semibold text-white">Browse all listings</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
