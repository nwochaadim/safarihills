import { BackButton } from '@/components/BackButton';
import { LoadingImage } from '@/components/LoadingImage';
import { OFFER_CATEGORIES } from '@/data/offers';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SafeAreaView, Text, View } from 'react-native';

export default function OfferBookingScreen() {
  const router = useRouter();
  const {
    categoryId: categoryParam,
    offerId: offerParam,
    listingId: listingParam,
  } = useLocalSearchParams<{
    categoryId?: string | string[];
    offerId?: string | string[];
    listingId?: string | string[];
  }>();
  const categoryId = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  const offerId = Array.isArray(offerParam) ? offerParam[0] : offerParam;
  const listingId = Array.isArray(listingParam) ? listingParam[0] : listingParam;

  const { offer, listing } = useMemo(() => {
    const category = OFFER_CATEGORIES.find((item) => item.id === categoryId);
    const foundOffer = category?.offers.find((item) => item.id === offerId);
    const foundListing = foundOffer?.listings.find((item) => item.id === listingId);
    return { offer: foundOffer, listing: foundListing };
  }, [categoryId, offerId, listingId]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6">
      <View className="pt-2">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-6 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Offer booking
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Coming soon</Text>
        <Text className="mt-2 text-sm text-slate-500">
          We’re preparing a smooth booking flow for this offer.
        </Text>
      </View>

      {offer ? (
        <View className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Selected offer
          </Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">{offer.title}</Text>
          <Text className="mt-2 text-sm text-slate-500">{offer.description}</Text>

          {listing ? (
            <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <LoadingImage
                source={{ uri: listing.image }}
                style={{ height: 54, width: 54 }}
                className="rounded-2xl"
              />
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900">{listing.name}</Text>
                <View className="mt-1 flex-row items-center gap-2">
                  <Feather name="map-pin" size={14} color="#94a3b8" />
                  <Text className="text-sm text-slate-500">{listing.location}</Text>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
