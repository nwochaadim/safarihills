import { Feather } from '@expo/vector-icons';
import { ComponentProps } from 'react';

export type FeatherIconName = ComponentProps<typeof Feather>['name'];
export type BookingOption = 'room' | 'entire';

export type FilterState = {
  minBudget: string;
  maxBudget: string;
  location: string;
  type: string;
  guests: string;
  amenities: string[];
  checkIn: Date | null;
  checkOut: Date | null;
};

export type ExploreFilterInput = {
  minBudget?: number;
  maxBudget?: number;
  location?: string;
  checkIn?: string;
  checkOut?: string;
  numberOfGuests?: number;
  amenities?: string[];
  apartmentType?: string;
  limit?: number;
  offset?: number;
};

export type ExploreLocation = {
  id: string;
  name: string;
  area: string;
};

export type ExploreListing = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  maxNumberOfGuestsAllowed: number;
  bookingOptions: BookingOption[];
  promoTags: string[];
};

export type ExploreSection = {
  id: string;
  slug: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  iconName: FeatherIconName;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  position: number;
  sectionType: string;
  matchingCount: number;
  location: ExploreLocation | null;
  listings: ExploreListing[];
};

export type RemoteExploreListing = {
  id?: string | null;
  name?: string | null;
  apartmentType?: string | null;
  description?: string | null;
  coverPhoto?: string | null;
  minimumPrice?: number | null;
  rating?: number | null;
  area?: string | null;
  maxNumberOfGuestsAllowed?: number | null;
  bookableOptions?: (string | null)[] | null;
};

export type RemoteExploreLocation = {
  id?: string | null;
  name?: string | null;
  area?: string | null;
};

export type RemoteExploreSection = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  eyebrow?: string | null;
  subtitle?: string | null;
  iconKey?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  borderColor?: string | null;
  position?: number | null;
  sectionType?: string | null;
  matchingCount?: number | null;
  location?: RemoteExploreLocation | null;
  listings?: RemoteExploreListing[] | null;
};

const FALLBACK_LISTING_IMAGE =
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80';
const PROMO_TAGS = [
  'Free Night',
  'Late Night Discount',
  '5% Off',
  'Easter Promo',
  'Weekend Escape',
  'Long Stay Perk',
  'Breakfast Bonus',
];

const SECTION_ICON_ALIASES: Record<string, FeatherIconName> = {
  award: 'award',
  best: 'award',
  best_deals: 'tag',
  'best-deals': 'tag',
  city: 'home',
  compass: 'compass',
  deal: 'tag',
  deals: 'tag',
  favorite: 'heart',
  favourites: 'heart',
  favorite_stays: 'heart',
  hot: 'zap',
  hot_picks: 'zap',
  'hot-picks': 'zap',
  location: 'map-pin',
  neighborhood: 'map-pin',
  place: 'map-pin',
  popular: 'star',
  tag: 'tag',
  top: 'award',
  top_picks: 'award',
  'top-picks': 'award',
  trending: 'trending-up',
  trending_now: 'trending-up',
  'trending-now': 'trending-up',
  zap: 'zap',
};

const normalizeArea = (area: string) => area.trim().toLowerCase();

const areaIncludes = (area: string, query: string) => normalizeArea(area).includes(query);

const sortByRatingThenPrice = (left: ExploreListing, right: ExploreListing) => {
  if (right.rating !== left.rating) return right.rating - left.rating;
  return left.minimumPrice - right.minimumPrice;
};

const sortByPriceThenRating = (left: ExploreListing, right: ExploreListing) => {
  if (left.minimumPrice !== right.minimumPrice) return left.minimumPrice - right.minimumPrice;
  return right.rating - left.rating;
};

const sortByGuestFlex = (left: ExploreListing, right: ExploreListing) => {
  if (right.maxNumberOfGuestsAllowed !== left.maxNumberOfGuestsAllowed) {
    return right.maxNumberOfGuestsAllowed - left.maxNumberOfGuestsAllowed;
  }
  return sortByRatingThenPrice(left, right);
};

const cleanString = (value: string | null | undefined) => value?.trim() ?? '';

export const createInitialFilters = (): FilterState => ({
  minBudget: '',
  maxBudget: '',
  location: '',
  type: '',
  guests: '',
  amenities: [],
  checkIn: null,
  checkOut: null,
});

export const formatCurrencyInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString();
};

export const parseCurrencyInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return null;
  return Number(digitsOnly);
};

const formatQueryDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildExploreFilterInput = (
  filters: FilterState,
  pagination: { limit?: number; offset?: number } = {}
): ExploreFilterInput => {
  const minBudget = parseCurrencyInput(filters.minBudget);
  const maxBudget = parseCurrencyInput(filters.maxBudget);
  const numberOfGuests = filters.guests
    ? filters.guests === '6+'
      ? 6
      : Number(filters.guests)
    : null;

  const input: ExploreFilterInput = {};

  if (minBudget !== null) input.minBudget = minBudget;
  if (maxBudget !== null) input.maxBudget = maxBudget;
  if (filters.location.trim()) input.location = filters.location.trim();
  if (filters.checkIn) input.checkIn = formatQueryDate(filters.checkIn);
  if (filters.checkOut) input.checkOut = formatQueryDate(filters.checkOut);
  if (numberOfGuests !== null) input.numberOfGuests = numberOfGuests;
  if (filters.amenities.length > 0) input.amenities = filters.amenities;
  if (filters.type) input.apartmentType = filters.type;
  if (typeof pagination.limit === 'number') input.limit = pagination.limit;
  if (typeof pagination.offset === 'number') input.offset = pagination.offset;

  return input;
};

export const serializeExploreFilterInput = (filters: ExploreFilterInput) => JSON.stringify(filters);

export const deserializeExploreFilterInput = (
  value: string | string[] | undefined
): ExploreFilterInput => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Partial<ExploreFilterInput>;
    const next: ExploreFilterInput = {};

    if (typeof parsed.minBudget === 'number') next.minBudget = parsed.minBudget;
    if (typeof parsed.maxBudget === 'number') next.maxBudget = parsed.maxBudget;
    if (typeof parsed.location === 'string') next.location = parsed.location;
    if (typeof parsed.checkIn === 'string') next.checkIn = parsed.checkIn;
    if (typeof parsed.checkOut === 'string') next.checkOut = parsed.checkOut;
    if (typeof parsed.numberOfGuests === 'number') next.numberOfGuests = parsed.numberOfGuests;
    if (Array.isArray(parsed.amenities)) {
      next.amenities = parsed.amenities.filter((item): item is string => typeof item === 'string');
    }
    if (typeof parsed.apartmentType === 'string') next.apartmentType = parsed.apartmentType;
    if (typeof parsed.limit === 'number') next.limit = parsed.limit;
    if (typeof parsed.offset === 'number') next.offset = parsed.offset;

    return next;
  } catch {
    return {};
  }
};

const mapBookableOptions = (options: (string | null)[] | null | undefined): BookingOption[] => {
  const mapped: BookingOption[] = [];
  if (options?.includes('single_room')) mapped.push('room');
  if (options?.includes('entire_apartment')) mapped.push('entire');
  return mapped.length ? mapped : ['entire'];
};

const derivePromoTags = (listing: ExploreListing, index: number) => {
  const seededTags = new Set<string>();

  if (areaIncludes(listing.area, 'lekki')) {
    seededTags.add('Free Night');
    seededTags.add('Easter Promo');
  }

  if (areaIncludes(listing.area, 'ikeja')) {
    seededTags.add('Late Night Discount');
  }

  if (areaIncludes(listing.area, 'victoria island')) {
    seededTags.add('5% Off');
    seededTags.add('Weekend Escape');
  }

  if (listing.minimumPrice <= 90000) {
    seededTags.add('Best Value');
  }

  if (listing.rating >= 4.8) {
    seededTags.add('Guest Favorite');
  }

  const preferred = Array.from(seededTags);
  const rotated = PROMO_TAGS.map((_, tagIndex) => PROMO_TAGS[(index + tagIndex) % PROMO_TAGS.length]);

  return Array.from(new Set([...preferred, ...rotated])).slice(0, 3);
};

export const getSectionIconName = (iconKey: string | null | undefined): FeatherIconName => {
  const raw = cleanString(iconKey);
  if (!raw) return 'compass';

  if (raw in Feather.glyphMap) return raw as FeatherIconName;

  const dashed = raw.replace(/_/g, '-').toLowerCase();
  if (dashed in Feather.glyphMap) return dashed as FeatherIconName;

  return SECTION_ICON_ALIASES[dashed] ?? SECTION_ICON_ALIASES[raw.toLowerCase()] ?? 'compass';
};

export const mapExploreListing = (
  listing: RemoteExploreListing,
  index: number,
  fallbackArea = ''
): ExploreListing => {
  const bookingOptions = mapBookableOptions(listing.bookableOptions);
  const area = cleanString(listing.area) || cleanString(fallbackArea) || 'Lagos';
  const apartmentType =
    cleanString(listing.apartmentType) ||
    (bookingOptions.includes('room') && !bookingOptions.includes('entire')
      ? 'Single room'
      : 'Apartment');

  const mappedListing: ExploreListing = {
    id: cleanString(listing.id) || `explore-listing-${index + 1}`,
    name: cleanString(listing.name) || 'Apartment stay',
    apartmentType,
    coverPhoto: cleanString(listing.coverPhoto) || FALLBACK_LISTING_IMAGE,
    description: cleanString(listing.description) || 'Details coming soon.',
    minimumPrice: typeof listing.minimumPrice === 'number' ? listing.minimumPrice : 0,
    rating: typeof listing.rating === 'number' ? listing.rating : 0,
    area,
    maxNumberOfGuestsAllowed:
      typeof listing.maxNumberOfGuestsAllowed === 'number' && listing.maxNumberOfGuestsAllowed > 0
        ? listing.maxNumberOfGuestsAllowed
        : 1,
    bookingOptions,
    promoTags: [],
  };

  return {
    ...mappedListing,
    promoTags: derivePromoTags(mappedListing, index),
  };
};

export const mapExploreSection = (section: RemoteExploreSection): ExploreSection => {
  const locationArea = cleanString(section.location?.area) || cleanString(section.location?.name);
  const slug = cleanString(section.slug) || cleanString(section.id) || 'explore-section';
  const listings = (section.listings ?? []).map((listing, index) =>
    mapExploreListing(listing, index, locationArea)
  );

  return {
    id: cleanString(section.id) || slug,
    slug,
    title: cleanString(section.title) || 'Explore section',
    eyebrow: cleanString(section.eyebrow) || cleanString(section.sectionType) || 'Explore',
    subtitle: cleanString(section.subtitle) || 'Curated stays tailored to your filters.',
    iconName: getSectionIconName(section.iconKey),
    backgroundColor: cleanString(section.backgroundColor) || '#eff6ff',
    textColor: cleanString(section.textColor) || '#0f172a',
    borderColor: cleanString(section.borderColor) || '#bfdbfe',
    position: typeof section.position === 'number' ? section.position : Number.MAX_SAFE_INTEGER,
    sectionType: cleanString(section.sectionType) || 'section',
    matchingCount:
      typeof section.matchingCount === 'number' ? section.matchingCount : listings.length,
    location: section.location
      ? {
          id: cleanString(section.location.id) || slug,
          name: cleanString(section.location.name) || 'Lagos',
          area: cleanString(section.location.area) || cleanString(section.location.name) || 'Lagos',
        }
      : null,
    listings,
  };
};

export const sortExploreSections = (sections: ExploreSection[]) =>
  [...sections].sort((left, right) => {
    if (left.position !== right.position) return left.position - right.position;
    return left.title.localeCompare(right.title);
  });

export const flattenPreviewListings = (sections: ExploreSection[]) => {
  const listingMap = new Map<string, ExploreListing>();

  sections.forEach((section) => {
    section.listings.forEach((listing) => {
      if (!listingMap.has(listing.id)) {
        listingMap.set(listing.id, listing);
      }
    });
  });

  const listings = Array.from(listingMap.values());

  return listings.sort((left, right) => {
    if (areaIncludes(left.area, 'lekki') && !areaIncludes(right.area, 'lekki')) return -1;
    if (!areaIncludes(left.area, 'lekki') && areaIncludes(right.area, 'lekki')) return 1;

    if (areaIncludes(left.area, 'ikeja') && !areaIncludes(right.area, 'ikeja')) return -1;
    if (!areaIncludes(left.area, 'ikeja') && areaIncludes(right.area, 'ikeja')) return 1;

    if (areaIncludes(left.area, 'victoria island') && !areaIncludes(right.area, 'victoria island')) {
      return -1;
    }
    if (!areaIncludes(left.area, 'victoria island') && areaIncludes(right.area, 'victoria island')) {
      return 1;
    }

    if (areaIncludes(left.area, 'lekki') && areaIncludes(right.area, 'lekki')) {
      return sortByRatingThenPrice(left, right);
    }

    if (areaIncludes(left.area, 'ikeja') && areaIncludes(right.area, 'ikeja')) {
      return sortByGuestFlex(left, right);
    }

    if (areaIncludes(left.area, 'victoria island') && areaIncludes(right.area, 'victoria island')) {
      return sortByPriceThenRating(left, right);
    }

    return sortByRatingThenPrice(left, right);
  });
};
