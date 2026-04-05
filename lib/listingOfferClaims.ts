import * as SecureStore from 'expo-secure-store';

const LISTING_OFFER_CLAIMS_KEY = 'listingOfferClaims';

export type ListingOfferClaim = {
  offerId: string;
  listingId: string;
  claimedAt: string;
  holdExpiresAt: string;
};

type ListingOfferClaimMap = Record<string, ListingOfferClaim>;

const parseStoredClaims = (value: string | null): ListingOfferClaimMap => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<ListingOfferClaimMap>(
      (acc, [key, claim]) => {
        if (!claim || typeof claim !== 'object') return acc;
        const candidate = claim as Record<string, unknown>;
        if (
          typeof candidate.offerId === 'string' &&
          typeof candidate.listingId === 'string' &&
          typeof candidate.claimedAt === 'string' &&
          typeof candidate.holdExpiresAt === 'string'
        ) {
          acc[key] = {
            offerId: candidate.offerId,
            listingId: candidate.listingId,
            claimedAt: candidate.claimedAt,
            holdExpiresAt: candidate.holdExpiresAt,
          };
        }
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
};

const persistClaims = async (claims: ListingOfferClaimMap) => {
  try {
    await SecureStore.setItemAsync(LISTING_OFFER_CLAIMS_KEY, JSON.stringify(claims));
  } catch {
    // Ignore local persistence issues and fall back to in-memory behavior.
  }
};

const pruneExpiredClaims = (claims: ListingOfferClaimMap, now = Date.now()) =>
  Object.values(claims).reduce<ListingOfferClaimMap>((acc, claim) => {
    if (new Date(claim.holdExpiresAt).getTime() > now) {
      acc[claim.offerId] = claim;
    }
    return acc;
  }, {});

const loadClaims = async (now = Date.now()) => {
  try {
    const stored = await SecureStore.getItemAsync(LISTING_OFFER_CLAIMS_KEY);
    const parsed = parseStoredClaims(stored);
    const pruned = pruneExpiredClaims(parsed, now);

    if (Object.keys(pruned).length !== Object.keys(parsed).length) {
      await persistClaims(pruned);
    }

    return pruned;
  } catch {
    return {};
  }
};

export const getActiveListingOfferClaims = async (now = Date.now()) => loadClaims(now);

export const getActiveListingOfferClaim = async (offerId: string, now = Date.now()) => {
  const claims = await loadClaims(now);
  return claims[offerId] ?? null;
};

export const createListingOfferClaim = async ({
  offerId,
  listingId,
  holdMinutes,
  now = Date.now(),
}: {
  offerId: string;
  listingId: string;
  holdMinutes: number;
  now?: number;
}) => {
  const claims = await loadClaims(now);
  const existing = claims[offerId];
  if (existing) return existing;

  const nextClaim: ListingOfferClaim = {
    offerId,
    listingId,
    claimedAt: new Date(now).toISOString(),
    holdExpiresAt: new Date(now + holdMinutes * 60 * 1000).toISOString(),
  };

  const nextClaims = {
    ...claims,
    [offerId]: nextClaim,
  };

  await persistClaims(nextClaims);
  return nextClaim;
};
