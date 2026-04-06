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
  highlights: string[];
  theme: ListingOfferTheme;
  urgencyMode: ListingOfferUrgencyMode;
  publicStartsAt: string;
  publicExpiresAt: string;
  claimHoldMinutes: number;
  lockHint: string;
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
  area: string;
  minimumPrice: number;
  bookingOptions: BookingOption[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_CLAIM_HOLD_MINUTES = 15;

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

const resolveUrgencyMode = (
  publicStartsAt: string,
  publicExpiresAt: string
): ListingOfferUrgencyMode => {
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

  return [
    rewardLabel,
    stayLabel,
    `${listing.area} stay`,
    `From ${formatCurrency(listing.minimumPrice)}/night`,
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);
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
