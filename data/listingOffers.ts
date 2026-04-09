import type { BookingOption } from '@/data/listings';

export type ListingOfferTheme = 'sunrise' | 'emerald' | 'sky';
export type ListingOfferUrgencyMode = 'countdown' | 'days';
export type ListingOfferPublicStatus = 'live' | 'upcoming' | 'expired';

export type ListingOffer = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  savingsLabel: string;
  ctaLabel: string;
  terms: string;
  rewards?: ListingOfferReward[];
  highlights: string[];
  theme: ListingOfferTheme;
  urgencyMode: ListingOfferUrgencyMode;
  publicStartsAt: string;
  publicExpiresAt: string;
  claimHoldMinutes: number;
  lockHint: string;
};

export type ListingOfferReward = {
  id: string;
  rewardType: string | null;
  name: string | null;
  description: string | null;
  numberOfNightsToApply: number | null;
  percentDiscount: number | null;
};

export type ListingOfferClaimSnapshot = {
  id: string;
  offerId: string;
  listingId: string;
  status: string;
  claimedAt: string;
  holdExpiresAt: string;
};

export type RemoteListingOfferReward = {
  id?: string | null;
  rewardType?: string | null;
  name?: string | null;
  description?: string | null;
  numberOfNightsToApply?: number | null;
  percentDiscount?: number | null;
};

export type RemoteListingOfferRule = {
  id?: string | null;
  ruleType?: string | null;
  minNights?: number | null;
  maxHours?: number | null;
  validDays?: number[] | null;
  validCheckInTime?: string | null;
  validCheckOutTime?: string | null;
};

export type RemoteListingOfferClaim = {
  id?: string | null;
  status?: string | null;
  claimedAt?: string | null;
  holdExpiresAt?: string | null;
};

export type RemoteListingOffer = {
  id?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  badgeText?: string | null;
  ctaLabel?: string | null;
  themeKey?: string | null;
  iconKey?: string | null;
  publicStatus?: ListingOfferPublicStatus | null;
  publicStartsAt?: string | null;
  publicEndsAt?: string | null;
  claimHoldMinutes?: number | null;
  bookableOption?: string | null;
  isClaimedByCurrentUser?: boolean | null;
  rewards?: RemoteListingOfferReward[] | null;
  rules?: RemoteListingOfferRule[] | null;
  activeClaim?: RemoteListingOfferClaim | null;
};

export type ListingOffersResponse = {
  listingOffers: RemoteListingOffer[] | null;
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
  urgencyMode: ListingOfferUrgencyMode;
  duration: number;
  hint: string;
  claimHoldMinutes: number;
  lockHint: string;
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FLASH_WINDOW_STARTS = [11 * 60, 13 * 60 + 30, 16 * 60, 18 * 60 + 30];
const FALLBACK_CLAIM_HOLD_MINUTES = 15;

const COUNTDOWN_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'flash-five',
    badge: 'Flash deal',
    title: 'Book at 5% discount',
    subtitle: 'A short public offer window for guests ready to move quickly on this stay.',
    savingsLabel: 'Save 5%',
    ctaLabel: 'Review & claim',
    terms: 'Claim this offer to lock your rate for a short private hold while you book.',
    theme: 'sunrise',
    urgencyMode: 'countdown',
    duration: 150,
    hint: 'Best for quick plans',
    claimHoldMinutes: 15,
    lockHint: 'Claiming this offer locks your rate for 15 minutes.',
  },
  {
    slug: 'late-checkin',
    badge: 'Tonight only',
    title: 'Late arrival deal at 7% off',
    subtitle: 'A timed rate drop for guests booking close to check-in without rushing the full flow.',
    savingsLabel: 'Save 7%',
    ctaLabel: 'Review & claim',
    terms: 'Public offer windows are shared per listing. Claiming creates a short personal hold.',
    theme: 'sky',
    urgencyMode: 'countdown',
    duration: 180,
    hint: 'Ideal for same-day stays',
    claimHoldMinutes: 20,
    lockHint: 'Claiming this offer locks your rate for 20 minutes.',
  },
  {
    slug: 'weeknight-saver',
    badge: 'Fast moving',
    title: 'Book now and save 6%',
    subtitle: 'A stronger nudge for flexible guests while this listing-level flash window is open.',
    savingsLabel: 'Save 6%',
    ctaLabel: 'Review & claim',
    terms: 'This offer refreshes by listing schedule. Claiming gives you a short private hold.',
    theme: 'emerald',
    urgencyMode: 'countdown',
    duration: 165,
    hint: 'Great for flexible guests',
    claimHoldMinutes: 15,
    lockHint: 'Claiming this offer locks your rate for 15 minutes.',
  },
];

const DAY_BASED_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'weekend-window',
    badge: 'Weekend window',
    title: 'Stay 2 nights and save 8%',
    subtitle: 'A softer offer window that still rewards guests who are ready to commit this week.',
    savingsLabel: 'Save 8%',
    ctaLabel: 'Review & claim',
    terms: 'The public window stays open for a few days, and a short private hold starts after claim.',
    theme: 'emerald',
    urgencyMode: 'days',
    duration: 4,
    hint: 'Good for weekend plans',
    claimHoldMinutes: 20,
    lockHint: 'Claiming this offer locks your rate for 20 minutes.',
  },
  {
    slug: 'couple-pick',
    badge: 'Popular pick',
    title: 'Claim a 9% stay discount',
    subtitle: 'A calmer multi-day offer that still gives guests a reason to lock in the stay soon.',
    savingsLabel: 'Save 9%',
    ctaLabel: 'Review & claim',
    terms: 'If this window closes, other softer offers may still be available for the listing.',
    theme: 'sunrise',
    urgencyMode: 'days',
    duration: 6,
    hint: 'Popular around busy dates',
    claimHoldMinutes: 25,
    lockHint: 'Claiming this offer locks your rate for 25 minutes.',
  },
];

const BONUS_TEMPLATES: OfferTemplate[] = [
  {
    slug: 'short-break',
    badge: 'Quick escape',
    title: 'Short break special at 6% off',
    subtitle: 'A flexible offer window that keeps a lighter-value option available even if flash windows pass.',
    savingsLabel: 'Save 6%',
    ctaLabel: 'Review & claim',
    terms: 'Designed as a softer fallback so guests still have a good path into booking.',
    theme: 'sky',
    urgencyMode: 'days',
    duration: 4,
    hint: 'Easy value for shorter stays',
    claimHoldMinutes: 20,
    lockHint: 'Claiming this offer locks your rate for 20 minutes.',
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

const resolveTheme = (themeKey?: string | null, iconKey?: string | null): ListingOfferTheme => {
  const value = `${themeKey ?? ''} ${iconKey ?? ''}`.toLowerCase();
  if (
    value.includes('sky') ||
    value.includes('ocean') ||
    value.includes('blue') ||
    value.includes('moon') ||
    value.includes('night')
  ) {
    return 'sky';
  }
  if (
    value.includes('emerald') ||
    value.includes('green') ||
    value.includes('sage') ||
    value.includes('leaf') ||
    value.includes('forest')
  ) {
    return 'emerald';
  }
  return 'sunrise';
};

const resolveUrgencyMode = (publicStartsAt: string, publicExpiresAt: string): ListingOfferUrgencyMode => {
  const startsAt = new Date(publicStartsAt).getTime();
  const expiresAt = new Date(publicExpiresAt).getTime();
  const durationMs = expiresAt - startsAt;
  return durationMs > 0 && durationMs <= 12 * 60 * 60 * 1000 ? 'countdown' : 'days';
};

const resolveRewardSummary = (reward: RemoteListingOfferReward | null | undefined) => {
  if (!reward) return null;
  if (
    reward.rewardType?.includes('Discount') &&
    typeof reward.percentDiscount === 'number' &&
    Number.isFinite(reward.percentDiscount)
  ) {
    return `Save ${reward.percentDiscount}%`;
  }
  return reward.name?.trim() || reward.description?.trim() || null;
};

const resolveSavingsLabel = (offer: RemoteListingOffer) => {
  const rewardSummaries = (offer.rewards ?? [])
    .map((reward) => resolveRewardSummary(reward))
    .filter((reward): reward is string => Boolean(reward));

  if (rewardSummaries.length > 0) return rewardSummaries[0];
  if (offer.badgeText?.trim()) return offer.badgeText.trim();
  return 'Special offer';
};

const resolveTerms = (offer: RemoteListingOffer) => {
  const description = offer.description?.trim();
  if (description) return description;
  return 'Claim this offer to lock your rate for a short private hold while you book.';
};

const mapListingOfferRewards = (
  rewards: RemoteListingOfferReward[] | null | undefined
): ListingOfferReward[] =>
  (rewards ?? []).map((reward, index) => ({
    id: reward.id?.trim() || `reward-${index}`,
    rewardType: reward.rewardType?.trim() || null,
    name: reward.name?.trim() || null,
    description: reward.description?.trim() || null,
    numberOfNightsToApply:
      typeof reward.numberOfNightsToApply === 'number' &&
      Number.isFinite(reward.numberOfNightsToApply)
        ? reward.numberOfNightsToApply
        : null,
    percentDiscount:
      typeof reward.percentDiscount === 'number' && Number.isFinite(reward.percentDiscount)
        ? reward.percentDiscount
        : null,
  }));

const buildRemoteOfferHighlights = (
  listing: ListingOfferSeedInput,
  offer: RemoteListingOffer
) => {
  const stayLabel =
    offer.bookableOption === 'time_based'
      ? 'Short-stay eligible'
      : listing.bookingOptions.includes('room')
        ? 'Room or entire apartment'
        : 'Entire apartment';

  const rewardLabel = (offer.rewards ?? [])
    .map((reward) => resolveRewardSummary(reward))
    .filter((reward): reward is string => Boolean(reward))[0];

  return [rewardLabel, stayLabel, `${listing.area} stay`, `From ${formatCurrency(listing.minimumPrice)}/night`]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);
};

const startOfLocalDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date;
};

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

const buildFlashWindow = (seed: number, durationMinutes: number, referenceTimestamp: number) => {
  const dayStart = startOfLocalDay(referenceTimestamp);
  const startMinutes = FLASH_WINDOW_STARTS[seed % FLASH_WINDOW_STARTS.length] + ((seed >> 3) % 4) * 15;

  let publicStartsAt = new Date(dayStart.getTime() + startMinutes * MINUTE_MS);
  let publicExpiresAt = new Date(publicStartsAt.getTime() + durationMinutes * MINUTE_MS);

  if (referenceTimestamp > publicExpiresAt.getTime()) {
    publicStartsAt = new Date(publicStartsAt.getTime() + DAY_MS);
    publicExpiresAt = new Date(publicExpiresAt.getTime() + DAY_MS);
  }

  return {
    publicStartsAt: publicStartsAt.toISOString(),
    publicExpiresAt: publicExpiresAt.toISOString(),
  };
};

const buildMultiDayWindow = (seed: number, durationDays: number, referenceTimestamp: number) => {
  const dayStart = startOfLocalDay(referenceTimestamp);
  const startOffsetDays = seed % 2;
  const publicStartsAt = new Date(dayStart.getTime() - startOffsetDays * DAY_MS);
  const publicExpiresAt = new Date(publicStartsAt.getTime() + durationDays * DAY_MS);

  return {
    publicStartsAt: publicStartsAt.toISOString(),
    publicExpiresAt: publicExpiresAt.toISOString(),
  };
};

const buildOfferFromTemplate = (
  listing: ListingOfferSeedInput,
  template: OfferTemplate,
  seed: number,
  referenceTimestamp: number
): ListingOffer => {
  const publicWindow =
    template.urgencyMode === 'countdown'
      ? buildFlashWindow(seed, template.duration, referenceTimestamp)
      : buildMultiDayWindow(seed, template.duration, referenceTimestamp);

  return {
    id: `${listing.id}-${template.slug}`,
    badge: template.badge,
    title: template.title,
    subtitle: template.subtitle,
    savingsLabel: template.savingsLabel,
    ctaLabel: template.ctaLabel,
    terms: template.terms,
    theme: template.theme,
    urgencyMode: template.urgencyMode,
    publicStartsAt: publicWindow.publicStartsAt,
    publicExpiresAt: publicWindow.publicExpiresAt,
    claimHoldMinutes: template.claimHoldMinutes,
    lockHint: template.lockHint,
    highlights: buildOfferHighlights(listing, template),
  };
};

export const buildMockOffersForListing = (
  listing: ListingOfferSeedInput,
  referenceTimestamp = Date.now()
) => {
  const daySeed = Math.floor(referenceTimestamp / DAY_MS);
  const seed = hashString(`${listing.id}-${listing.name}-${daySeed}`);

  return [
    buildOfferFromTemplate(
      listing,
      pickTemplate(COUNTDOWN_TEMPLATES, seed),
      seed,
      referenceTimestamp
    ),
    buildOfferFromTemplate(
      listing,
      pickTemplate(DAY_BASED_TEMPLATES, seed + 5),
      seed + 5,
      referenceTimestamp
    ),
    buildOfferFromTemplate(
      listing,
      pickTemplate(BONUS_TEMPLATES, seed + 11),
      seed + 11,
      referenceTimestamp
    ),
  ];
};

export const mapRemoteListingOfferClaim = ({
  claim,
  listingId,
  offerId,
}: {
  claim: RemoteListingOfferClaim | null | undefined;
  listingId: string;
  offerId: string;
}): ListingOfferClaimSnapshot | null => {
  if (!claim?.id || !claim.claimedAt || !claim.holdExpiresAt) return null;

  return {
    id: claim.id,
    offerId,
    listingId,
    status: claim.status ?? 'active',
    claimedAt: claim.claimedAt,
    holdExpiresAt: claim.holdExpiresAt,
  };
};

export const mapRemoteListingOffer = (
  offer: RemoteListingOffer,
  listing: ListingOfferSeedInput
): ListingOffer | null => {
  const id = offer.id?.trim();
  const publicStartsAt = offer.publicStartsAt?.trim();
  const publicExpiresAt = offer.publicEndsAt?.trim();

  if (!id || !publicStartsAt || !publicExpiresAt) return null;

  const claimHoldMinutes =
    typeof offer.claimHoldMinutes === 'number' && offer.claimHoldMinutes > 0
      ? offer.claimHoldMinutes
      : FALLBACK_CLAIM_HOLD_MINUTES;
  const title = offer.title?.trim() || offer.name?.trim() || 'Listing offer';
  const subtitle = offer.description?.trim() || 'A limited offer is available for this stay.';

  return {
    id,
    badge: offer.badgeText?.trim() || 'Listing offer',
    title,
    subtitle,
    savingsLabel: resolveSavingsLabel(offer),
    ctaLabel: offer.ctaLabel?.trim() || 'Review & claim',
    terms: resolveTerms(offer),
    rewards: mapListingOfferRewards(offer.rewards),
    highlights: buildRemoteOfferHighlights(listing, offer),
    theme: resolveTheme(offer.themeKey, offer.iconKey),
    urgencyMode: resolveUrgencyMode(publicStartsAt, publicExpiresAt),
    publicStartsAt,
    publicExpiresAt,
    claimHoldMinutes,
    lockHint: `Claiming this offer locks your rate for ${claimHoldMinutes} minutes.`,
  };
};

export const mapRemoteListingOffers = (
  offers: RemoteListingOffer[] | null | undefined,
  listing: ListingOfferSeedInput
) =>
  (offers ?? [])
    .map((offer) => mapRemoteListingOffer(offer, listing))
    .filter((offer): offer is ListingOffer => Boolean(offer));

export const buildActiveListingOfferClaimsById = ({
  offers,
  listingId,
}: {
  offers: RemoteListingOffer[] | null | undefined;
  listingId: string;
}) =>
  (offers ?? []).reduce<Record<string, ListingOfferClaimSnapshot>>((acc, offer) => {
    const offerId = offer.id?.trim();
    if (!offerId) return acc;
    const claim = mapRemoteListingOfferClaim({
      claim: offer.activeClaim,
      listingId,
      offerId,
    });
    if (claim) {
      acc[offerId] = claim;
    }
    return acc;
  }, {});

export const getListingOfferPublicStatus = (
  offer: ListingOffer,
  now = Date.now()
): ListingOfferPublicStatus => {
  const publicStartsAt = new Date(offer.publicStartsAt).getTime();
  const publicExpiresAt = new Date(offer.publicExpiresAt).getTime();

  if (now < publicStartsAt) return 'upcoming';
  if (now >= publicExpiresAt) return 'expired';
  return 'live';
};

const formatShortDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const formatShortTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatTimeRemaining = (remainingMs: number) => {
  const totalSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
};

export const formatListingOfferPublicWindow = (offer: ListingOffer, now = Date.now()) => {
  const publicStartsAt = new Date(offer.publicStartsAt).getTime();
  const publicExpiresAt = new Date(offer.publicExpiresAt).getTime();
  const status = getListingOfferPublicStatus(offer, now);

  if (status === 'upcoming') {
    const startsToday =
      new Date(publicStartsAt).toDateString() === new Date(now).toDateString();
    return startsToday
      ? `Opens today at ${formatShortTime(publicStartsAt)}`
      : `Opens ${formatShortDateTime(publicStartsAt)}`;
  }

  if (status === 'expired') {
    return 'Public window closed';
  }

  if (offer.urgencyMode === 'days') {
    const days = Math.max(1, Math.ceil((publicExpiresAt - now) / DAY_MS));
    return `Ends in ${days} day${days === 1 ? '' : 's'}`;
  }

  return `Ends in ${formatTimeRemaining(publicExpiresAt - now)}`;
};

export const formatListingOfferClaimWindow = (holdExpiresAt: string, now = Date.now()) => {
  const remainingMs = new Date(holdExpiresAt).getTime() - now;

  if (remainingMs <= 0) {
    return 'Your lock has expired';
  }

  return `Locked for ${formatTimeRemaining(remainingMs)}`;
};

export const formatListingOfferClaimDeadline = (holdExpiresAt: string) =>
  `Locked until ${formatShortTime(new Date(holdExpiresAt).getTime())}`;

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
    (candidate.rewards === undefined || Array.isArray(candidate.rewards)) &&
    typeof candidate.theme === 'string' &&
    typeof candidate.urgencyMode === 'string' &&
    typeof candidate.publicStartsAt === 'string' &&
    typeof candidate.publicExpiresAt === 'string' &&
    typeof candidate.claimHoldMinutes === 'number' &&
    typeof candidate.lockHint === 'string' &&
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
