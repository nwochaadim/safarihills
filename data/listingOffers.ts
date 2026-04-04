import type { BookingOption } from '@/data/listings';

export type ListingOfferTheme = 'sunrise' | 'emerald' | 'sky';
export type ListingOfferExpirationMode = 'countdown' | 'days';

export type ListingOffer = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  savingsLabel: string;
  ctaLabel: string;
  terms: string;
  highlights: string[];
  theme: ListingOfferTheme;
  expirationMode: ListingOfferExpirationMode;
  expiresAt: string;
};

type ListingOfferSeedInput = {
  id: string;
  name: string;
  area: string;
  minimumPrice: number;
  bookingOptions: BookingOption[];
};

type OfferTemplate = {
  slug: string;
  badge: string;
  title: string;
  subtitle: string;
  savingsLabel: string;
  ctaLabel: string;
  terms: string;
  theme: ListingOfferTheme;
  expirationMode: ListingOfferExpirationMode;
  duration: number;
  hint: string;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const COUNTDOWN_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'flash-five',
    badge: 'Flash deal',
    title: 'Book at 5% discount',
    subtitle: 'Claim this offer now to lock in a softer rate before it disappears.',
    savingsLabel: 'Save 5%',
    ctaLabel: 'Claim this offer now',
    terms: 'Available for new stays only and subject to availability.',
    theme: 'sunrise',
    expirationMode: 'countdown',
    duration: 20,
    hint: 'Best for quick plans',
  },
  {
    slug: 'late-checkin',
    badge: 'Tonight only',
    title: 'Late arrival deal at 7% off',
    subtitle: 'Perfect if you are booking close to check-in and want extra value tonight.',
    savingsLabel: 'Save 7%',
    ctaLabel: 'Claim this offer now',
    terms: 'Valid on eligible dates for fresh bookings only.',
    theme: 'sky',
    expirationMode: 'countdown',
    duration: 35,
    hint: 'Ideal for same-day stays',
  },
  {
    slug: 'weeknight-saver',
    badge: 'Fast moving',
    title: 'Book now and save 6%',
    subtitle: 'A quick little nudge for flexible guests ready to book this listing now.',
    savingsLabel: 'Save 6%',
    ctaLabel: 'Claim this offer now',
    terms: 'Cannot be stacked with other promotions.',
    theme: 'emerald',
    expirationMode: 'countdown',
    duration: 45,
    hint: 'Great for flexible guests',
  },
];

const DAY_BASED_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'weekend-window',
    badge: 'Weekend window',
    title: 'Stay 2 nights and save 8%',
    subtitle: 'A strong option if you want a little more time to plan without losing value.',
    savingsLabel: 'Save 8%',
    ctaLabel: 'Claim offer',
    terms: 'Applies to qualifying stay lengths during the offer window.',
    theme: 'emerald',
    expirationMode: 'days',
    duration: 4,
    hint: 'Good for weekend plans',
  },
  {
    slug: 'longer-stay',
    badge: 'Extended offer',
    title: 'Book a longer stay at 10% off',
    subtitle: 'Made for guests turning a quick stay into a slower, more comfortable reset.',
    savingsLabel: 'Save 10%',
    ctaLabel: 'Claim offer',
    terms: 'Discount applies to selected stay lengths while the offer is active.',
    theme: 'sky',
    expirationMode: 'days',
    duration: 6,
    hint: 'Works well for extended stays',
  },
  {
    slug: 'couple-pick',
    badge: 'Popular pick',
    title: 'Claim a 9% stay discount',
    subtitle: 'A polished little extra for guests ready to reserve this listing in the next few days.',
    savingsLabel: 'Save 9%',
    ctaLabel: 'Claim offer',
    terms: 'Offer window may close earlier if eligible slots fill up.',
    theme: 'sunrise',
    expirationMode: 'days',
    duration: 6,
    hint: 'Popular around busy dates',
  },
];

const BONUS_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'suite-upgrade',
    badge: 'Member-style perk',
    title: 'Claim a priority booking perk',
    subtitle: 'Keep this stay in your shortlist with a softer price and a smoother checkout moment.',
    savingsLabel: 'Bonus perk',
    ctaLabel: 'Claim offer',
    terms: 'Perks vary by availability and booking details.',
    theme: 'emerald',
    expirationMode: 'days',
    duration: 4,
    hint: 'Nice extra for decisive guests',
  },
  {
    slug: 'short-break',
    badge: 'Quick escape',
    title: 'Short break special at 6% off',
    subtitle: 'A tidy little offer for guests booking a simpler, lighter stay.',
    savingsLabel: 'Save 6%',
    ctaLabel: 'Claim offer',
    terms: 'Offer is shown per listing and may vary by check-in date.',
    theme: 'sky',
    expirationMode: 'days',
    duration: 4,
    hint: 'Easy value for shorter stays',
  },
];

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const pickTemplate = (templates: OfferTemplate[], seed: number) =>
  templates[seed % templates.length];

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const buildOfferHighlights = (
  listing: ListingOfferSeedInput,
  template: OfferTemplate
): string[] => {
  const stayLabel = listing.bookingOptions.includes('room')
    ? 'Room or entire apartment'
    : 'Entire apartment';

  return [
    template.hint,
    `${stayLabel} eligible`,
    `${listing.area} stay`,
    `From ${formatCurrency(listing.minimumPrice)}/night`,
  ].slice(0, 3);
};

const buildOfferFromTemplate = (
  listing: ListingOfferSeedInput,
  template: OfferTemplate,
  seed: number,
  baseTimestamp: number
): ListingOffer => {
  const durationMs =
    template.expirationMode === 'countdown'
      ? template.duration * MINUTE_MS
      : template.duration * DAY_MS;

  return {
    id: `${listing.id}-${template.slug}-${seed}`,
    badge: template.badge,
    title: template.title,
    subtitle: template.subtitle,
    savingsLabel: template.savingsLabel,
    ctaLabel: template.ctaLabel,
    terms: template.terms,
    theme: template.theme,
    expirationMode: template.expirationMode,
    expiresAt: new Date(baseTimestamp + durationMs).toISOString(),
    highlights: buildOfferHighlights(listing, template),
  };
};

export const buildMockOffersForListing = (
  listing: ListingOfferSeedInput,
  baseTimestamp = Date.now()
) => {
  const daySeed = Math.floor(baseTimestamp / DAY_MS);
  const seed = hashString(`${listing.id}-${daySeed}-${listing.name}`);
  const offers = [
    buildOfferFromTemplate(
      listing,
      pickTemplate(COUNTDOWN_TEMPLATES, seed),
      seed,
      baseTimestamp
    ),
    buildOfferFromTemplate(
      listing,
      pickTemplate(DAY_BASED_TEMPLATES, seed + 5),
      seed + 5,
      baseTimestamp
    ),
  ];

  if (seed % 2 === 0) {
    offers.push(
      buildOfferFromTemplate(
        listing,
        pickTemplate(BONUS_TEMPLATES, seed + 11),
        seed + 11,
        baseTimestamp
      )
    );
  }

  return offers;
};

export const isListingOfferExpired = (offer: ListingOffer, now = Date.now()) =>
  new Date(offer.expiresAt).getTime() <= now;

export const formatListingOfferExpiry = (offer: ListingOffer, now = Date.now()) => {
  const remainingMs = new Date(offer.expiresAt).getTime() - now;

  if (remainingMs <= 0) {
    return 'Offer expired';
  }

  if (offer.expirationMode === 'days') {
    const days = Math.max(1, Math.ceil(remainingMs / DAY_MS));
    return `Expires in ${days} day${days === 1 ? '' : 's'}`;
  }

  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `Expires in ${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `Expires in ${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `Expires in ${seconds}s`;
};

const isListingOffer = (value: unknown): value is ListingOffer => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.subtitle === 'string' &&
    typeof candidate.savingsLabel === 'string' &&
    typeof candidate.ctaLabel === 'string' &&
    typeof candidate.terms === 'string' &&
    typeof candidate.theme === 'string' &&
    typeof candidate.expirationMode === 'string' &&
    typeof candidate.expiresAt === 'string' &&
    Array.isArray(candidate.highlights)
  );
};

export const parseListingOfferParam = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return isListingOffer(parsed) ? parsed : null;
  } catch {
    return null;
  }
};
