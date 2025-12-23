import { BackButton } from '@/components/BackButton';
import { LoadingImage } from '@/components/LoadingImage';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { OFFER_CATEGORIES } from '@/data/offers';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import { Animated, Pressable, SafeAreaView, Text, View } from 'react-native';

const HEADER_HEIGHT = 280;
const IMAGE_PARALLAX_DISTANCE = 36;

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

export default function OfferDetailScreen() {
  const router = useRouter();
  const { categoryId: categoryParam, offerId: offerParam } = useLocalSearchParams<{
    categoryId?: string | string[];
    offerId?: string | string[];
  }>();
  const categoryId = Array.isArray(categoryParam) ? categoryParam[0] : categoryParam;
  const offerId = Array.isArray(offerParam) ? offerParam[0] : offerParam;
  const scrollY = useRef(new Animated.Value(0)).current;

  const { category, offer } = useMemo(() => {
    const foundCategory = OFFER_CATEGORIES.find((item) => item.id === categoryId);
    const foundOffer = foundCategory?.offers.find((item) => item.id === offerId);
    return { category: foundCategory, offer: foundOffer };
  }, [categoryId, offerId]);

  const imageTranslate = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [0, -IMAGE_PARALLAX_DISTANCE],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-HEADER_HEIGHT, 0],
    outputRange: [1.15, 1],
    extrapolate: 'clamp',
  });

  if (!category || !offer) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50 px-6">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-4 text-2xl font-bold text-slate-900">Offer not found</Text>
        <Text className="mt-2 text-sm text-slate-500">
          Try another offer from the deals page.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="relative" style={{ height: HEADER_HEIGHT }}>
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: imageTranslate }, { scale: imageScale }],
          }}>
          <LoadingImageBackground source={{ uri: offer.image }} className="flex-1" />
        </Animated.View>
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute bottom-7 left-6 right-6">
          <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            {category.title}
          </Text>
          <Text className="mt-2 text-3xl font-bold text-white">{offer.title}</Text>
        </View>
        <View className="absolute left-6 top-4">
          <BackButton onPress={() => router.back()} />
        </View>
      </View>

      <Animated.ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}>
        <View className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">Rewards</Text>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
              <Feather name="gift" size={18} color="#1d4ed8" />
            </View>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {offer.rewards.map((reward) => (
              <View
                key={reward}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">{reward}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
          <Text className="text-base font-semibold text-slate-900">Offer details</Text>
          <Text className="mt-2 text-sm text-slate-500">{offer.description}</Text>
        </View>

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Eligible listings
          </Text>
          <Text className="mt-2 text-sm text-slate-500">
            Book now to lock in the offer rate for these apartments.
          </Text>
        </View>

        <View className="mt-4 gap-4">
          {offer.listings.map((listing) => (
            <View
              key={listing.id}
              className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
              <View className="flex-row items-center gap-4">
                <LoadingImage
                  source={{ uri: listing.image }}
                  style={{ height: 64, width: 64 }}
                  className="rounded-2xl"
                />
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900">{listing.name}</Text>
                  <View className="mt-1 flex-row items-center gap-2">
                    <Feather name="map-pin" size={14} color="#94a3b8" />
                    <Text className="text-sm text-slate-500">{listing.location}</Text>
                  </View>
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <Feather name="star" size={14} color="#f59e0b" />
                    <Text className="text-xs font-semibold text-amber-600">
                      {listing.rating.toFixed(1)}
                    </Text>
                    <Text className="text-xs text-slate-400">rating</Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-semibold text-slate-900">
                    {formatCurrency(listing.price)}
                  </Text>
                  <Text className="text-xs text-slate-500">{listing.priceUnit}</Text>
                </View>
                <Pressable
                  className="rounded-full bg-blue-600 px-4 py-2 shadow-sm shadow-blue-200"
                  onPress={() =>
                    router.push({
                      pathname: '/offers/[categoryId]/[offerId]/book',
                      params: {
                        categoryId: category.id,
                        offerId: offer.id,
                        listingId: listing.id,
                      },
                    })
                  }>
                  <Text className="text-xs font-semibold text-white">Book now</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
