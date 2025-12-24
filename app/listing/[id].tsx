import { BackButton } from '@/components/BackButton';
import { LoadingImage } from '@/components/LoadingImage';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { BookingOption, findListingById, ListingDetail } from '@/data/listings';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 0.9;

type BookingOptionMeta = {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  containerClass: string;
  textClass: string;
  iconColor: string;
};

const getBookingOptionMeta = (option: BookingOption): BookingOptionMeta => {
  if (option === 'room') {
    return {
      label: 'Single room',
      icon: 'key',
      containerClass: 'border-amber-200 bg-amber-50',
      textClass: 'text-amber-700',
      iconColor: '#b45309',
    };
  }

  return {
    label: 'Entire apartment',
    icon: 'home',
    containerClass: 'border-blue-200 bg-blue-50',
    textClass: 'text-blue-700',
    iconColor: '#1d4ed8',
  };
};

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const listing = useMemo(() => (id ? findListingById(id) : undefined), [id]);

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Stack.Screen options={{ headerShown: false }} />
        <Pressable
          className="rounded-full bg-blue-600 px-5 py-3"
          onPress={() => router.back()}>
          <Text className="text-base font-semibold text-white">Listing not found. Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return <ListingDetailContent listing={listing} onBack={() => router.back()} />;
}

type ListingDetailContentProps = {
  listing: ListingDetail;
  onBack: () => void;
};

function ListingDetailContent({ listing, onBack }: ListingDetailContentProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [bookingSheetVisible, setBookingSheetVisible] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleOpenAttraction = (mapUrl: string) => {
    Linking.openURL(mapUrl);
  };

  const renderBookingOptions = () => (
    <View className="flex-row flex-wrap gap-2">
      {listing.bookingOptions.map((option) => {
        const meta = getBookingOptionMeta(option);
        return (
          <View
            key={`${listing.id}-${option}`}
            className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 ${meta.containerClass}`}>
            <Feather name={meta.icon} size={12} color={meta.iconColor} />
            <Text className={`text-xs font-semibold ${meta.textClass}`}>{meta.label}</Text>
          </View>
        );
      })}
    </View>
  );

  const headerHeight = scrollY.interpolate({
    inputRange: [-100, 0, IMAGE_HEIGHT],
    outputRange: [IMAGE_HEIGHT + 120, IMAGE_HEIGHT, IMAGE_HEIGHT * 0.65],
    extrapolate: 'clamp',
  });
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, IMAGE_HEIGHT],
    outputRange: [0, -IMAGE_HEIGHT * 0.25],
    extrapolate: 'clamp',
  });

  const attractions = useMemo(() => listing.attractions ?? [], [listing]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          transform: [{ translateY: headerTranslate }],
          zIndex: 10,
        }}>
        <FlatList
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          data={listing.gallery}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setActiveImage(index);
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: '100%' }}>
              <LoadingImageBackground source={{ uri: item }} className="flex-1" imageStyle={{ opacity: 0.95 }}>
                <View className="absolute inset-0 bg-black/30" />
              </LoadingImageBackground>
            </View>
          )}
        />
        <View style={{ position: 'absolute', top: 50, left: 15, right: 24 }}>
          <BackButton onPress={onBack} />
        </View>
        <View
          className="flex-row items-center justify-center gap-2"
          style={{ position: 'absolute', bottom: 16, left: 0, right: 0 }}>
          {listing.gallery.map((_, index) => (
            <View
              key={`${index}-dot`}
              className={`h-1.5 rounded-full ${
                index === activeImage ? 'w-10 bg-white' : 'w-4 bg-white/60'
              }`}
            />
          ))}
        </View>
      </Animated.View>

      <Animated.ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 160,
          paddingTop: IMAGE_HEIGHT + 48,
        }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}>
        <View className="px-6">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                {listing.apartmentType}
              </Text>
              <Text className="mt-2 text-3xl font-bold text-slate-900">{listing.name}</Text>
              <Text className="mt-1 text-base text-slate-500">{listing.area}</Text>
            </View>
            <View className="items-end flex-shrink">
              <Text className="text-lg font-semibold text-blue-600">
                ₦{listing.minimumPrice.toLocaleString()}
              </Text>
              <Text className="text-xs font-medium text-slate-500">per night</Text>
              <View className="mt-2 flex-row items-center gap-2">
                <Feather name="award" size={16} color="#0f172a" />
                <Text className="text-sm font-semibold text-slate-800">+{listing.pointsToWin} pts</Text>
              </View>
            </View>
          </View>

          <View className="mt-5">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Bookable as
            </Text>
            <View className="mt-2">{renderBookingOptions()}</View>
          </View>

          <Text className="mt-6 text-base leading-6 text-slate-600">{listing.description}</Text>

          <View className="mt-8 rounded-3xl border border-blue-50 bg-blue-50/40 p-5 shadow-sm shadow-blue-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
              Amenities
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {listing.amenities.length === 0 ? (
                <Text className="text-sm text-slate-500">Amenities will be shared soon.</Text>
              ) : (
                listing.amenities.map((amenity) => (
                  <View
                    key={amenity}
                    className="rounded-full border border-blue-100 bg-white px-4 py-2">
                    <Text className="text-sm font-semibold text-blue-700">{amenity}</Text>
                  </View>
                ))
              )}
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Attractions nearby
            </Text>
            <Text className="mt-2 text-sm text-slate-500">
              Curated spots for food, culture, and experiences around {listing.area}.
            </Text>
            {attractions.length === 0 ? (
              <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4">
                <Text className="text-sm text-slate-500">
                  Attractions will be highlighted soon for this listing.
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-4"
                contentContainerStyle={{ paddingRight: 16 }}>
                {attractions.map((attraction) => (
                  <Pressable
                    key={attraction.id}
                    onPress={() => handleOpenAttraction(attraction.mapUrl)}
                    className="mr-4 w-64 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-100">
                    <LoadingImage
                      source={{ uri: attraction.image }}
                      className="h-32 w-full"
                      resizeMode="cover"
                    />
                    <View className="p-4">
                      <Text className="text-base font-semibold text-slate-900">
                        {attraction.name}
                      </Text>
                      <Text className="mt-1 text-sm text-slate-500" numberOfLines={3}>
                        {attraction.description}
                      </Text>
                      <View className="mt-3 flex-row items-center gap-2">
                        <Feather name="map-pin" size={14} color="#1d4ed8" />
                        <Text className="text-xs font-semibold text-blue-600">
                          Open in Google Maps
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          <View className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
              Past reviews
            </Text>
            {listing.reviews.length === 0 ? (
              <Text className="mt-3 text-sm text-slate-500">
                No reviews yet. Be the first to stay and leave feedback.
              </Text>
            ) : (
              listing.reviews.map((review) => (
                <View key={review.id} className="mt-5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-slate-900">{review.guest}</Text>
                    <View className="flex-row items-center gap-1">
                      <Feather name="star" size={16} color="#fbbf24" />
                      <Text className="text-sm font-semibold text-slate-700">{review.rating.toFixed(1)}</Text>
                    </View>
                  </View>
                  <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {review.stay}
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View
        className="absolute left-0 right-0 bg-white px-6 pb-10 pt-4 shadow-lg shadow-slate-200"
        style={{ bottom: 0 }}>
        <Pressable
          className="items-center justify-center rounded-full bg-blue-600 py-4"
          onPress={() => setBookingSheetVisible(true)}>
          <Text className="text-base font-semibold text-white">Book Now</Text>
        </Pressable>
      </Animated.View>

      <Modal animationType="slide" transparent visible={bookingSheetVisible}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-[32px] bg-white px-6 pb-10 pt-6">
            <View className="mb-6 h-1 w-14 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-start justify-between">
              <Text className="text-2xl font-bold text-slate-900">Book your stay</Text>
              <Pressable onPress={() => setBookingSheetVisible(false)}>
                <Feather name="x" size={22} color="#0f172a" />
              </Pressable>
            </View>
            <Text className="mt-2 text-base text-slate-500">
              Secure this listing in minutes. Confirm dates and guests in the next step.
            </Text>

            <View className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-slate-500">From</Text>
                <Text className="text-lg font-semibold text-slate-900">
                  ₦{listing.minimumPrice.toLocaleString()}
                  <Text className="text-xs font-medium text-slate-500"> / night</Text>
                </Text>
              </View>
              <View className="mt-3 flex-row items-center justify-between">
                <Text className="text-sm text-slate-500">Max guests</Text>
                <Text className="text-sm font-semibold text-slate-800">
                  {listing.maxNumberOfGuestsAllowed}
                </Text>
              </View>
              <View className="mt-4">
                <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Booking options
                </Text>
                <View className="mt-2">{renderBookingOptions()}</View>
              </View>
            </View>

            <Pressable
              className="mt-8 items-center justify-center rounded-full bg-blue-600 py-4"
              onPress={() => setBookingSheetVisible(false)}>
              <Text className="text-base font-semibold text-white">Continue to booking</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
