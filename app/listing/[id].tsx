import { BackButton } from '@/components/BackButton';
import { HtmlViewer } from '@/components/HtmlViewer';
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
import {
  buildActiveListingOfferClaimsById,
  formatListingOfferClaimDeadline,
  formatListingOfferClaimWindow,
  formatListingOfferPublicWindow,
  getListingOfferPublicStatus,
  ListingOffer,
  ListingOfferClaimSnapshot,
  ListingOffersResponse,
  mapRemoteListingOffers,
} from '@/data/remoteListingOffers';
import { useAnalyticsTracker } from '@/hooks/use-analytics-tracker';
import { useListingWishlistToggle } from '@/hooks/use-listing-wishlist';
import { useSkeletonPulse } from '@/hooks/use-skeleton-pulse';
import {
  ANALYTICS_EVENTS,
  buildListingAnalyticsItem,
  toFlag,
} from '@/lib/analytics.schema';
import { LISTING_OFFERS } from '@/queries/listingOffers';
import { V2_USER_FIND_LISTING } from '@/queries/v2UserFindListing';
import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WishlistToggleButton } from '@/components/wishlist/WishlistToggleButton';
import {
  ListingWishlistRecord,
} from '@/lib/listingWishlist';

const { width } = Dimensions.get('window');
const IMAGE_HEIGHT = width * 0.9;
const OFFER_CARD_WIDTH = width - 64;
const OFFER_CARD_GAP = 12;

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
  isWishlisted: boolean | null;
  wishlistedAt: string | null;
  unwishlistedAt: string | null;
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

const getOfferThemeMeta = (theme: ListingOffer['theme']) => {
  if (theme === 'emerald') {
    return {
      cardClass: 'border-emerald-200 bg-emerald-50/80',
      badgeClass: 'bg-emerald-600',
      badgeTextClass: 'text-white',
      savingsClass: 'border-emerald-200 bg-white',
      savingsTextClass: 'text-emerald-700',
      chipClass: 'border-emerald-200 bg-white/95',
      chipTextClass: 'text-emerald-700',
      footerClass: 'border-emerald-200 bg-white/85',
      copyClass: 'text-emerald-900',
      actionClass: 'bg-emerald-600',
    };
  }

  if (theme === 'sky') {
    return {
      cardClass: 'border-sky-200 bg-sky-50/85',
      badgeClass: 'bg-sky-600',
      badgeTextClass: 'text-white',
      savingsClass: 'border-sky-200 bg-white',
      savingsTextClass: 'text-sky-700',
      chipClass: 'border-sky-200 bg-white/95',
      chipTextClass: 'text-sky-700',
      footerClass: 'border-sky-200 bg-white/85',
      copyClass: 'text-sky-950',
      actionClass: 'bg-sky-600',
    };
  }

  return {
    cardClass: 'border-amber-200 bg-amber-50/90',
    badgeClass: 'bg-amber-500',
    badgeTextClass: 'text-amber-950',
    savingsClass: 'border-amber-200 bg-white',
    savingsTextClass: 'text-amber-700',
    chipClass: 'border-amber-200 bg-white/95',
    chipTextClass: 'text-amber-700',
    footerClass: 'border-amber-200 bg-white/85',
    copyClass: 'text-amber-950',
    actionClass: 'bg-slate-900',
  };
};

const truncateOfferDescription = (value: string, maxChars = 100) => {
  const normalized = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars - 1).trimEnd()}…`;
};

export default function ListingDetailScreen() {
  const router = useRouter();
  const {
    id: idParam,
    source_screen: sourceScreenParam,
    source_surface: sourceSurfaceParam,
    source_section: sourceSectionParam,
    item_list_id: itemListIdParam,
    item_list_name: itemListNameParam,
  } = useLocalSearchParams<{
    id?: string;
    source_screen?: string;
    source_surface?: string;
    source_section?: string;
    item_list_id?: string;
    item_list_name?: string;
  }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const sourceScreen = Array.isArray(sourceScreenParam)
    ? sourceScreenParam[0]
    : sourceScreenParam;
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

  const fallbackListing = useMemo(() => (id ? findListingById(id) : undefined), [id]);
  const { data, error, loading } = useQuery<V2UserFindListingResponse>(V2_USER_FIND_LISTING, {
    variables: { id: id ?? '' },
    skip: !id,
  });
  const {
    data: listingOffersData,
    loading: listingOffersLoading,
    refetch: refetchListingOffers,
  } = useQuery<ListingOffersResponse>(LISTING_OFFERS, {
    variables: { listingId: id ?? '' },
    skip: !id,
  });

  const remoteListing = data?.v2UserFindListing ?? null;
  const listingOfferSeed = useMemo(
    () => ({
      id: remoteListing?.id ?? fallbackListing?.id ?? id ?? 'listing',
      name: remoteListing?.name ?? fallbackListing?.name ?? 'Safarihills stay',
      area: remoteListing?.area ?? fallbackListing?.area ?? 'Lagos',
      minimumPrice: remoteListing?.minimumPrice ?? fallbackListing?.minimumPrice ?? 0,
      bookingOptions: remoteListing?.bookableOptions
        ? mapBookableOptions(remoteListing.bookableOptions)
        : fallbackListing?.bookingOptions ?? ['entire'],
    }),
    [fallbackListing, id, remoteListing]
  );
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
        isWishlisted: false,
        wishlistedAt: null,
        unwishlistedAt: null,
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
      description: remoteListing.description ?? baseListing.description,
      minimumPrice: remoteListing.minimumPrice ?? baseListing.minimumPrice,
      rating: remoteListing.rating ?? baseListing.rating,
      area: remoteListing.area ?? baseListing.area,
      isWishlisted: remoteListing.isWishlisted ?? baseListing.isWishlisted ?? false,
      wishlistedAt: remoteListing.wishlistedAt ?? baseListing.wishlistedAt ?? null,
      unwishlistedAt: remoteListing.unwishlistedAt ?? baseListing.unwishlistedAt ?? null,
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
  const offers = useMemo(
    () => mapRemoteListingOffers(listingOffersData?.listingOffers, listingOfferSeed),
    [listingOfferSeed, listingOffersData?.listingOffers]
  );
  const activeOfferClaims = useMemo(
    () =>
      buildActiveListingOfferClaimsById({
        offers: listingOffersData?.listingOffers,
        listingId: listingOfferSeed.id,
      }),
    [listingOfferSeed.id, listingOffersData?.listingOffers]
  );

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
      offers={offers}
      offersLoading={listingOffersLoading}
      activeOfferClaims={activeOfferClaims}
      onRefreshOffers={() => refetchListingOffers({ listingId: listing.id })}
      onBack={() => router.back()}
      sourceContext={{
        sourceScreen: sourceScreen ?? 'listing_detail',
        sourceSurface: sourceSurface ?? 'listing_primary_cta',
        sourceSection,
        itemListId,
        itemListName,
      }}
      onBook={() =>
        router.push({
          pathname: '/booking/[id]',
          params: {
            id: listing.id,
            source_screen: sourceScreen ?? 'listing_detail',
            source_surface: sourceSurface ?? 'listing_primary_cta',
            source_section: sourceSection,
            item_list_id: itemListId,
            item_list_name: itemListName,
          },
        })
      }
    />
  );
}

type ListingDetailContentProps = {
  listing: ListingDetail;
  offers: ListingOffer[];
  offersLoading: boolean;
  activeOfferClaims: Record<string, ListingOfferClaimSnapshot>;
  onRefreshOffers: () => Promise<unknown>;
  onBack: () => void;
  onBook: () => void;
  sourceContext: {
    sourceScreen: string;
    sourceSurface?: string;
    sourceSection?: string;
    itemListId?: string;
    itemListName?: string;
  };
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
        <SkeletonBar pulse={pulse} className="mt-3 h-5 w-32 rounded-full" />

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

function ListingDetailContent({
  listing,
  offers,
  offersLoading,
  activeOfferClaims,
  onRefreshOffers,
  onBack,
  onBook,
  sourceContext,
}: ListingDetailContentProps) {
  const router = useRouter();
  const { track, trackOnce } = useAnalyticsTracker();
  const { toggleListingWishlist } = useListingWishlistToggle();
  const [activeImage, setActiveImage] = useState(0);
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [offerNow, setOfferNow] = useState(() => Date.now());
  const scrollY = useRef(new Animated.Value(0)).current;
  const attractionsSectionYRef = useRef(0);
  const reviewsSectionYRef = useRef(0);
  const isWishlisted = listing.isWishlisted === true;
  const wishlistListing = useMemo<ListingWishlistRecord>(
    () => ({
      id: listing.id,
      name: listing.name,
      apartmentType: listing.apartmentType,
      coverPhoto: listing.coverPhoto || listing.gallery[0] || '',
      description: listing.description,
      minimumPrice: listing.minimumPrice,
      rating: listing.rating,
      area: listing.area,
      maxNumberOfGuestsAllowed: listing.maxNumberOfGuestsAllowed,
      isWishlisted,
      wishlistedAt: listing.wishlistedAt ?? null,
      unwishlistedAt: listing.unwishlistedAt ?? null,
    }),
    [
      listing.apartmentType,
      listing.area,
      listing.coverPhoto,
      listing.description,
      listing.gallery,
      listing.id,
      listing.isWishlisted,
      listing.maxNumberOfGuestsAllowed,
      listing.minimumPrice,
      listing.name,
      listing.rating,
      listing.unwishlistedAt,
      listing.wishlistedAt,
      isWishlisted,
    ]
  );

  useEffect(() => {
    // Detail views are the clearest signal that a user moved from casual browsing into active evaluation.
    track(ANALYTICS_EVENTS.ViewItem, {
      currency: 'NGN',
      value: listing.minimumPrice,
      source_screen: sourceContext.sourceScreen,
      source_surface: sourceContext.sourceSurface,
      source_section: sourceContext.sourceSection,
      listing_id: listing.id,
      listing_name: listing.name,
      city: listing.area,
      apartment_type: listing.apartmentType,
      price: listing.minimumPrice,
      has_reviews: toFlag(listing.reviews.length > 0),
      has_attractions: toFlag((listing.attractions ?? []).length > 0),
      image_count: listing.gallery.length,
      offer_count: offers.length,
      items: [
        buildListingAnalyticsItem({
          id: listing.id,
          name: listing.name,
          apartmentType: listing.apartmentType,
          city: listing.area,
          price: listing.minimumPrice,
          itemListId: sourceContext.itemListId,
          itemListName: sourceContext.itemListName,
        }),
      ],
    });
  }, [
    listing.apartmentType,
    listing.area,
    listing.attractions,
    listing.gallery.length,
    listing.id,
    listing.minimumPrice,
    listing.name,
    listing.reviews.length,
    offers.length,
    sourceContext.itemListId,
    sourceContext.itemListName,
    sourceContext.sourceScreen,
    sourceContext.sourceSection,
    sourceContext.sourceSurface,
    track,
  ]);

  const handleOpenAttraction = (mapUrl: string) => {
    if (!mapUrl) return;
    Linking.openURL(mapUrl).catch(() => null);
  };

  const handleOpenGallery = () => {
    track(ANALYTICS_EVENTS.ListingGalleryBrowse, {
      listing_id: listing.id,
      source_surface: 'photo_modal',
      image_index: activeImage + 1,
      image_count: listing.gallery.length,
      browse_depth: 'started',
    });
    setPreviewIndex(activeImage);
    setGalleryVisible(true);
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

  const headerTranslate = scrollY.interpolate({
    inputRange: [-120, 0, IMAGE_HEIGHT],
    outputRange: [-36, 0, -IMAGE_HEIGHT * 0.6],
    extrapolate: 'clamp',
  });
  const headerScale = scrollY.interpolate({
    inputRange: [-120, 0, IMAGE_HEIGHT],
    outputRange: [1.18, 1, 1],
    extrapolate: 'clamp',
  });
  const handleMainScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY]
  );

  const attractions = useMemo(() => listing.attractions ?? [], [listing]);

  useEffect(() => {
    const shouldTick =
      offers.some((offer) => offer.urgencyMode === 'countdown') ||
      Object.keys(activeOfferClaims).length > 0;
    if (!shouldTick) return undefined;

    const interval = setInterval(() => {
      setOfferNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeOfferClaims, offers]);

  useEffect(() => {
    setActiveOfferIndex(0);
  }, [offers.length, listing.id]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const viewportCheckpoint = value + 220;

      if (attractionsSectionYRef.current > 0 && viewportCheckpoint >= attractionsSectionYRef.current) {
        trackOnce(`${listing.id}:attractions_visible`, ANALYTICS_EVENTS.ListingContentMilestone, {
          listing_id: listing.id,
          milestone: 'attractions_visible',
          city: listing.area,
        });
      }

      if (reviewsSectionYRef.current > 0 && viewportCheckpoint >= reviewsSectionYRef.current) {
        trackOnce(`${listing.id}:reviews_visible`, ANALYTICS_EVENTS.ListingContentMilestone, {
          listing_id: listing.id,
          milestone: 'reviews_visible',
          city: listing.area,
        });
      }
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [listing.area, listing.id, scrollY, trackOnce]);

  useFocusEffect(
    useCallback(() => {
      void onRefreshOffers();
    }, [onRefreshOffers])
  );

  const handleClaimOffer = (offer: ListingOffer) => {
    track(ANALYTICS_EVENTS.SelectPromotion, {
      promotion_id: offer.id,
      promotion_name: offer.title,
      source_screen: sourceContext.sourceScreen,
      source_surface: 'listing_offer_card',
      listing_id: listing.id,
      listing_name: listing.name,
      city: listing.area,
      offer_type: offer.badge,
      savings_label: offer.savingsLabel,
    });

    router.push({
      pathname: '/offer-booking/[listingId]',
      params: {
        listingId: listing.id,
        offerId: offer.id,
        listingName: listing.name,
        listingArea: listing.area,
        listingImage: listing.coverPhoto || listing.gallery[0] || '',
        minimumPrice: `${listing.minimumPrice}`,
        offer: JSON.stringify(offer),
        source_screen: sourceContext.sourceScreen,
        source_surface: sourceContext.sourceSurface ?? 'listing_offer_card',
        source_section: sourceContext.sourceSection,
        item_list_id: sourceContext.itemListId,
        item_list_name: sourceContext.itemListName,
      },
    });
  };

  const handleToggleWishlist = useCallback(() => {
    void toggleListingWishlist(wishlistListing);
  }, [toggleListingWishlist, wishlistListing]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: IMAGE_HEIGHT,
          overflow: 'hidden',
          transform: [{ translateY: headerTranslate }, { scale: headerScale }],
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
            if (index > 0) {
              const browseDepth =
                index >= listing.gallery.length - 1
                  ? 'complete'
                  : index >= 2
                    ? 'deep'
                    : 'started';

              trackOnce(
                `${listing.id}:hero_gallery:${browseDepth}`,
                ANALYTICS_EVENTS.ListingGalleryBrowse,
                {
                  listing_id: listing.id,
                  source_surface: 'hero_carousel',
                  image_index: index + 1,
                  image_count: listing.gallery.length,
                  browse_depth: browseDepth,
                }
              );
            }
          }}
          renderItem={({ item }) => (
            <View style={{ width, height: '100%' }}>
              <LoadingImageBackground source={{ uri: item }} className="flex-1" imageStyle={{ opacity: 0.95 }}>
                <View className="absolute inset-0 bg-black/30" />
              </LoadingImageBackground>
            </View>
          )}
        />
        <View
          className="flex-row items-center justify-between"
          style={{ position: 'absolute', top: 50, left: 15, right: 24 }}>
          <BackButton onPress={onBack} />
          <Pressable
            className="flex-row items-center gap-2 rounded-full border border-white/60 bg-white/90 px-3 py-2"
            onPress={handleOpenGallery}
            disabled={listing.gallery.length === 0}>
            <Feather name="image" size={16} color="#0f172a" />
            <Text className="text-xs font-semibold text-slate-900">View photos</Text>
          </Pressable>
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
        onScroll={handleMainScroll}
        scrollEventThrottle={16}>
        <View className="px-6">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                {listing.apartmentType}
              </Text>
              <Text className="mt-2 text-3xl font-bold text-slate-900">{listing.name}</Text>
              <Text className="mt-1 text-base text-slate-500">{listing.area}</Text>
              <View className="mt-3 flex-row items-center gap-1.5">
                <Feather name="star" size={15} color="#f59e0b" />
                <Text className="text-sm font-semibold text-slate-700">
                  {listing.rating > 0 ? listing.rating.toFixed(1) : 'New'}
                </Text>
                <Text className="text-sm text-slate-400">
                  {listing.rating > 0 ? 'guest rating' : 'listing'}
                </Text>
              </View>
              <View className="mt-4 self-start">
                <WishlistToggleButton
                  active={isWishlisted}
                  label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                  variant="footer"
                  onPress={handleToggleWishlist}
                />
              </View>
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

          <View className="mt-8">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
                  Offers for this stay
                </Text>
                <Text className="mt-2 text-sm leading-6 text-slate-500">
                  Claim an offer before booking so the best fit is right in front of you.
                </Text>
              </View>
              <View className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2">
                <Text className="text-xs font-semibold text-amber-700">
                  {offersLoading ? 'Loading…' : `${offers.length} offer${offers.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>

            <View className="mt-4 gap-4">
              {offers.length === 0 ? (
                <View className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-5">
                  <Text className="text-sm font-semibold text-slate-900">
                    No listing offers are available right now.
                  </Text>
                  <Text className="mt-1 text-sm leading-6 text-slate-500">
                    Offer windows appear here automatically when this listing has active campaigns.
                  </Text>
                </View>
              ) : (
                <>
                  <View className="-mx-6">
                    <FlatList
                      horizontal
                      data={offers}
                      keyExtractor={(offer) => offer.id}
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={OFFER_CARD_WIDTH + OFFER_CARD_GAP}
                      disableIntervalMomentum
                      contentContainerStyle={{ paddingHorizontal: 24, paddingRight: 36 }}
                      onMomentumScrollEnd={(event) => {
                        const cardSpan = OFFER_CARD_WIDTH + OFFER_CARD_GAP;
                        const index = Math.round(event.nativeEvent.contentOffset.x / cardSpan);
                        const boundedIndex = Math.max(0, Math.min(index, offers.length - 1));
                        setActiveOfferIndex(boundedIndex);
                      }}
                      renderItem={({ item: offer, index }) => {
                        const theme = getOfferThemeMeta(offer.theme);
                        const activeClaim = activeOfferClaims[offer.id];
                        const publicStatus = getListingOfferPublicStatus(offer, offerNow);
                        const publicWindowLabel = formatListingOfferPublicWindow(offer, offerNow);
                        const claimWindowLabel = activeClaim
                          ? formatListingOfferClaimWindow(activeClaim.holdExpiresAt, offerNow)
                          : null;
                        const claimDeadlineLabel = activeClaim
                          ? formatListingOfferClaimDeadline(activeClaim.holdExpiresAt)
                          : null;
                        const actionDisabled = !activeClaim && publicStatus !== 'live';
                        const actionLabel = activeClaim
                          ? 'View locked offer'
                          : publicStatus === 'live'
                            ? offer.ctaLabel
                            : 'Opens soon';
                        const statusEyebrow = activeClaim
                          ? 'Locked for you'
                          : publicStatus === 'live'
                            ? 'Active Window'
                            : 'Upcoming window';
                        const statusLabel = activeClaim ? claimWindowLabel ?? 'Locked' : publicWindowLabel;
                        const helperLabel = activeClaim
                          ? `${claimDeadlineLabel}. Finish your stay details before the hold runs out.`
                          : publicStatus === 'live'
                            ? offer.lockHint
                            : 'Offer opens soon. Stay tuned!';

                        return (
                          <View
                            style={{
                              width: OFFER_CARD_WIDTH,
                              marginRight: index === offers.length - 1 ? 0 : OFFER_CARD_GAP,
                            }}>
                            <View
                              className={`rounded-[28px] border p-5 shadow-sm shadow-slate-100 ${theme.cardClass}`}>
                              <View className="flex-row items-start justify-between gap-4">
                                <View className="flex-1">
                                  <View
                                    className={`self-start rounded-full px-3 py-1.5 ${theme.badgeClass}`}>
                                    <Text
                                      className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${theme.badgeTextClass}`}>
                                      {offer.badge}
                                    </Text>
                                  </View>
                                  <Text className="mt-4 text-xl font-bold text-slate-900">
                                    {offer.title}
                                  </Text>
                                  <HtmlViewer
                                    html={truncateOfferDescription(offer.subtitle)}
                                    className="mt-2"
                                    textClassName={`text-sm leading-6 ${theme.copyClass}`}
                                  />
                                </View>

                                <View
                                  className={`min-w-[92px] rounded-2xl border px-3 py-3 ${theme.savingsClass}`}>
                                  <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                    Savings
                                  </Text>
                                  <Text
                                    className={`mt-1 text-base font-semibold ${theme.savingsTextClass}`}>
                                    {offer.savingsLabel}
                                  </Text>
                                </View>
                              </View>

                              <View className="mt-4 flex-row flex-wrap gap-2">
                                {offer.highlights.map((highlight) => (
                                  <View
                                    key={`${offer.id}-${highlight}`}
                                    className={`rounded-full border px-3 py-1.5 ${theme.chipClass}`}>
                                    <Text className={`text-xs font-semibold ${theme.chipTextClass}`}>
                                      {highlight}
                                    </Text>
                                  </View>
                                ))}
                              </View>

                              <View className={`mt-5 rounded-2xl border px-4 py-4 ${theme.footerClass}`}>
                                <View className="flex-row items-center justify-between gap-4">
                                  <View className="flex-1">
                                    <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                      {statusEyebrow}
                                    </Text>
                                    <Text
                                      className={`mt-1 text-base font-semibold ${
                                        activeClaim
                                          ? 'text-emerald-700'
                                          : publicStatus === 'live'
                                            ? 'text-slate-900'
                                            : 'text-slate-700'
                                      }`}>
                                      {statusLabel}
                                    </Text>
                                    <Text className="mt-1 text-xs leading-5 text-slate-500">
                                      {helperLabel}
                                    </Text>
                                  </View>

                                  <Pressable
                                    className={`rounded-full px-4 py-3 ${
                                      actionDisabled ? 'bg-slate-200' : theme.actionClass
                                    }`}
                                    disabled={actionDisabled}
                                    onPress={() => handleClaimOffer(offer)}>
                                    <Text
                                      className={`text-sm font-semibold ${
                                        actionDisabled ? 'text-slate-500' : 'text-white'
                                      }`}>
                                      {actionLabel}
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      }}
                    />
                  </View>

                  <View className="mt-4 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      {offers.map((offer, index) => (
                        <View
                          key={`${offer.id}-dot`}
                          className={`h-1.5 rounded-full ${
                            index === activeOfferIndex ? 'w-8 bg-slate-900' : 'w-3 bg-slate-300'
                          }`}
                        />
                      ))}
                    </View>
                    <Text className="text-xs font-medium text-slate-400">
                      Swipe to see more offers
                    </Text>
                  </View>
                </>
              )}
            </View>
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

          <View
            className="mt-8"
            onLayout={(event) => {
              attractionsSectionYRef.current = event.nativeEvent.layout.y;
            }}>
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
                    onPress={() => {
                      track(ANALYTICS_EVENTS.AttractionSelect, {
                        source_screen: 'listing_detail',
                        listing_id: listing.id,
                        attraction_id: attraction.id,
                        attraction_name: attraction.name,
                        city: listing.area,
                      });
                      handleOpenAttraction(attraction.mapUrl);
                    }}
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

          <View
            className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100"
            onLayout={(event) => {
              reviewsSectionYRef.current = event.nativeEvent.layout.y;
            }}>
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
          onPress={() => {
            // Booking entry marks the hand-off from research to high-intent funnel behavior.
            track(ANALYTICS_EVENTS.BeginBooking, {
              booking_mode: 'standard',
              source_screen: sourceContext.sourceScreen,
              source_surface: sourceContext.sourceSurface,
              source_section: sourceContext.sourceSection,
              listing_id: listing.id,
              listing_name: listing.name,
              city: listing.area,
              apartment_type: listing.apartmentType,
              offer_selected: toFlag(false),
              has_reviews: toFlag(listing.reviews.length > 0),
              has_attractions: toFlag((listing.attractions ?? []).length > 0),
              value: listing.minimumPrice,
              currency: 'NGN',
            });
            onBook();
          }}>
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

      <Modal
        visible={galleryVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setGalleryVisible(false)}>
        <SafeAreaView className="flex-1 bg-black">
          <View className="flex-row items-center justify-between px-6 pt-4">
            <Pressable
              className="rounded-full border border-white/30 px-3 py-1.5"
              onPress={() => setGalleryVisible(false)}>
              <Text className="text-xs font-semibold text-white">Close</Text>
            </Pressable>
            <Text className="text-xs font-semibold text-white">
              {previewIndex + 1} / {listing.gallery.length}
            </Text>
            <View className="w-16" />
          </View>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={listing.gallery}
            keyExtractor={(uri, index) => `${uri}-${index}`}
            initialScrollIndex={
              listing.gallery.length > 0 ? previewIndex : undefined
            }
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setPreviewIndex(index);
            }}
            renderItem={({ item }) => (
              <View style={{ width, height: '100%' }}>
                <LoadingImageBackground source={{ uri: item }} className="flex-1" contentFit="contain" />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
