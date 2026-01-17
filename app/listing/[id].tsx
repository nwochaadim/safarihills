import { useQuery } from '@apollo/client';
import { BackButton } from '@/components/BackButton';
import { LoadingImage } from '@/components/LoadingImage';
import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { SkeletonBar } from '@/components/SkeletonBar';
import {
  BookingOption,
  findListingById,
  ListingAttraction,
  ListingDetail,
  ListingReview,
  LISTINGS,
} from '@/data/listings';
import { useSkeletonPulse } from '@/hooks/use-skeleton-pulse';
import { V2_USER_FIND_LISTING } from '@/queries/v2UserFindListing';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
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

type RemoteReview = {
  id: string;
  userName: string | null;
  rating: number | null;
  comments: string | null;
  createdAt: string | null;
};

type RemotePropertyPhoto = {
  id: string;
  tinyUrl: string | null;
  smallUrl: string | null;
  mediumUrl: string | null;
  largeUrl: string | null;
  xtraLargeUrl: string | null;
};

type RemoteAttraction = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  googleLocation: string | null;
  avatar: string | null;
};

type RemoteListing = {
  id: string;
  name: string | null;
  apartmentType: string | null;
  coverPhoto: string | null;
  description: string | null;
  minimumPrice: number | null;
  rating: number | null;
  area: string | null;
  pointsToWin: number | null;
  maxNumberOfGuestsAllowed: number | null;
  amenities: string[] | null;
  bookableOptions: string[] | null;
  reviews: RemoteReview[] | null;
  propertyPhotos: RemotePropertyPhoto[] | null;
  bookedDays: Record<string, boolean> | null;
  attractions: RemoteAttraction[] | null;
};

type V2UserFindListingResponse = {
  v2UserFindListing: RemoteListing | null;
};

const mapBookableOptions = (options: string[] | null | undefined): BookingOption[] => {
  const mapped: BookingOption[] = [];
  if (options?.includes('single_room')) mapped.push('room');
  if (options?.includes('entire_apartment')) mapped.push('entire');
  return mapped.length ? mapped : ['entire'];
};

const formatReviewStay = (dateString: string | null) => {
  if (!dateString) return 'Recent stay';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'Recent stay';
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const mapReviews = (reviews: RemoteReview[] | null | undefined): ListingReview[] | null => {
  if (!reviews) return null;
  return reviews.map((review) => ({
    id: review.id,
    guest: review.userName ?? 'Guest',
    stay: formatReviewStay(review.createdAt),
    comment: review.comments ?? 'No review comment provided.',
    rating: review.rating ?? 0,
  }));
};

const getGalleryFromPhotos = (photos: RemotePropertyPhoto[] | null | undefined) => {
  if (!photos?.length) return null;
  return photos
    .map((photo) => photo.largeUrl || photo.mediumUrl || photo.smallUrl || photo.xtraLargeUrl || photo.tinyUrl)
    .filter((url): url is string => Boolean(url));
};

const mapAttractions = (
  attractions: RemoteAttraction[] | null | undefined,
  fallbackImage: string
): ListingAttraction[] | null => {
  if (!Array.isArray(attractions)) return null;
  return attractions
    .map((attraction, index) => {
      const name = attraction?.name?.trim() || `Attraction ${index + 1}`;
      const description = attraction?.description?.trim() || 'Details coming soon.';
      const mapUrl = attraction?.googleLocation?.trim() || '';
      const image = attraction?.avatar?.trim() || fallbackImage;
      return {
        id: attraction?.id ?? `${name}-${index}`,
        name,
        description,
        image,
        mapUrl,
      };
    })
    .filter((item) => item.name.length > 0);
};

export default function ListingDetailScreen() {
  const router = useRouter();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const fallbackListing = useMemo(() => (id ? findListingById(id) : undefined), [id]);
  const { data, error, loading } = useQuery<V2UserFindListingResponse>(V2_USER_FIND_LISTING, {
    variables: { id: id ?? '' },
    skip: !id,
  });

  const remoteListing = data?.v2UserFindListing ?? null;
  const listing = useMemo<ListingDetail | undefined>(() => {
    if (!fallbackListing && !remoteListing) return undefined;
    const baseListing =
      fallbackListing ??
      LISTINGS[0] ?? {
        id: id ?? 'listing',
        name: 'Safarihills stay',
        apartmentType: 'Apartment',
        coverPhoto: '',
        description: '',
        minimumPrice: 0,
        rating: 0,
        area: '',
        pointsToWin: 0,
        maxNumberOfGuestsAllowed: 1,
        bookingOptions: ['entire'],
        attractions: [],
        roomCategories: [],
        amenities: [],
        gallery: [],
        reviews: [],
        availability: {},
      };

    if (!remoteListing || error) {
      return baseListing;
    }

    const gallery = getGalleryFromPhotos(remoteListing.propertyPhotos) ?? [];
    const fallbackGallery = baseListing.gallery.length ? baseListing.gallery : [];
    const coverFallback = remoteListing.coverPhoto ?? baseListing.coverPhoto;
    const finalGallery =
      gallery.length > 0
        ? gallery
        : fallbackGallery.length > 0
          ? fallbackGallery
          : coverFallback
            ? [coverFallback]
            : [];
    const reviews = mapReviews(remoteListing.reviews);
    const bookingOptions = remoteListing.bookableOptions
      ? mapBookableOptions(remoteListing.bookableOptions)
      : baseListing.bookingOptions;
    const fallbackAttractionImage = finalGallery[0] ?? baseListing.coverPhoto;
    const attractions = mapAttractions(remoteListing.attractions, fallbackAttractionImage);

    return {
      ...baseListing,
      id: remoteListing.id ?? baseListing.id,
      name: remoteListing.name ?? baseListing.name,
      apartmentType: remoteListing.apartmentType ?? baseListing.apartmentType,
      coverPhoto: remoteListing.coverPhoto ?? baseListing.coverPhoto,
      description: remoteListing.description ?? baseListing.description,
      minimumPrice: remoteListing.minimumPrice ?? baseListing.minimumPrice,
      rating: remoteListing.rating ?? baseListing.rating,
      area: remoteListing.area ?? baseListing.area,
      pointsToWin: remoteListing.pointsToWin ?? baseListing.pointsToWin,
      maxNumberOfGuestsAllowed:
        remoteListing.maxNumberOfGuestsAllowed ?? baseListing.maxNumberOfGuestsAllowed,
      amenities: remoteListing.amenities ?? baseListing.amenities,
      bookingOptions,
      reviews: reviews ?? baseListing.reviews,
      attractions: attractions ?? baseListing.attractions,
      gallery: finalGallery,
      coverPhoto:
        remoteListing.coverPhoto ??
        finalGallery[0] ??
        baseListing.coverPhoto,
    };
  }, [fallbackListing, remoteListing, error, id]);

  if (!listing) {
    if (loading) {
      return <ListingDetailSkeleton onBack={() => router.back()} />;
    }
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

  return (
    <ListingDetailContent
      listing={listing}
      onBack={() => router.back()}
      onBook={() => router.push({ pathname: '/booking/[id]', params: { id: listing.id } })}
    />
  );
}

type ListingDetailContentProps = {
  listing: ListingDetail;
  onBack: () => void;
  onBook: () => void;
};

function ListingDetailSkeleton({ onBack }: { onBack: () => void }) {
  const pulse = useSkeletonPulse();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ height: IMAGE_HEIGHT }}>
        <SkeletonBar pulse={pulse} className="h-full w-full rounded-none" />
        <View style={{ position: 'absolute', top: 50, left: 15, right: 24 }}>
          <BackButton onPress={onBack} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        <SkeletonBar pulse={pulse} className="h-3 w-24 rounded-full" />
        <SkeletonBar pulse={pulse} className="mt-4 h-7 w-3/4 rounded-2xl" />
        <SkeletonBar pulse={pulse} className="mt-2 h-4 w-1/2 rounded-xl" />

        <View className="mt-6">
          <SkeletonBar pulse={pulse} className="h-3 w-32 rounded-full" />
          <View className="mt-3 flex-row flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <SkeletonBar
                key={`booking-pill-${index}`}
                pulse={pulse}
                className="h-7 w-24 rounded-full"
              />
            ))}
          </View>
        </View>

        <View className="mt-6 gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBar
              key={`desc-line-${index}`}
              pulse={pulse}
              className={`h-3 rounded-full ${index === 3 ? 'w-1/2' : 'w-full'}`}
            />
          ))}
        </View>

        <View className="mt-8 rounded-3xl border border-slate-100 bg-slate-50/80 p-5">
          <SkeletonBar pulse={pulse} className="h-3 w-28 rounded-full" />
          <View className="mt-4 flex-row flex-wrap gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBar
                key={`amenity-pill-${index}`}
                pulse={pulse}
                className="h-8 w-24 rounded-full"
              />
            ))}
          </View>
        </View>

        <View className="mt-8">
          <SkeletonBar pulse={pulse} className="h-3 w-36 rounded-full" />
          <SkeletonBar pulse={pulse} className="mt-2 h-4 w-2/3 rounded-xl" />
          <View className="mt-4 flex-row gap-4">
            {Array.from({ length: 2 }).map((_, index) => (
              <View
                key={`attraction-card-${index}`}
                className="w-64 overflow-hidden rounded-3xl border border-slate-100 bg-white">
                <SkeletonBar pulse={pulse} className="h-32 w-full rounded-none" />
                <View className="p-4">
                  <SkeletonBar pulse={pulse} className="h-4 w-3/4 rounded-xl" />
                  <SkeletonBar pulse={pulse} className="mt-3 h-3 w-full rounded-full" />
                  <SkeletonBar pulse={pulse} className="mt-2 h-3 w-5/6 rounded-full" />
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ListingDetailContent({ listing, onBack, onBook }: ListingDetailContentProps) {
  const [activeImage, setActiveImage] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleOpenAttraction = (mapUrl: string) => {
    if (!mapUrl) return;
    Linking.openURL(mapUrl).catch(() => null);
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
              <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                From
              </Text>
              <Text className="text-lg font-semibold text-blue-600">
                ₦{listing.minimumPrice.toLocaleString()}
              </Text>
              <Text className="text-xs font-medium text-slate-500">per night</Text>
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
                {attractions.map((attraction) => {
                  const canOpenMap = Boolean(attraction.mapUrl);
                  return (
                  <Pressable
                    key={attraction.id}
                    onPress={() => handleOpenAttraction(attraction.mapUrl)}
                    disabled={!canOpenMap}
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
                        <Feather name="map-pin" size={14} color={canOpenMap ? '#1d4ed8' : '#94a3b8'} />
                        <Text
                          className={`text-xs font-semibold ${
                            canOpenMap ? 'text-blue-600' : 'text-slate-400'
                          }`}>
                          {canOpenMap ? 'Open in Google Maps' : 'Map link unavailable'}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                  );
                })}
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
          onPress={onBook}>
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-semibold text-white">Book Now</Text>
            <Text className="text-xs font-semibold text-blue-100">
              ₦{listing.minimumPrice.toLocaleString()} / night
            </Text>
          </View>
        </Pressable>
        <Text className="mt-2 text-center text-xs text-slate-500">
          Discounts apply for weekly stays and above
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}
