import { ApolloCache, Reference, gql } from '@apollo/client';

export type ListingWishlistRecord = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  maxNumberOfGuestsAllowed: number;
  isWishlisted: boolean;
  wishlistedAt: string | null;
  unwishlistedAt: string | null;
};

export type ListingWishlistPatch = {
  listingId: string;
  isWishlisted: boolean;
  wishlistedAt: string | null;
  unwishlistedAt: string | null;
};

const LISTING_WISHLIST_CARD_FRAGMENT = gql`
  fragment ListingWishlistCard on ListingTypeV2 {
    id
    name
    apartmentType
    description
    coverPhoto
    minimumPrice
    rating
    area
    maxNumberOfGuestsAllowed
    isWishlisted
    wishlistedAt
    unwishlistedAt
  }
`;

const LISTING_WISHLIST_STATUS_FRAGMENT = gql`
  fragment ListingWishlistStatus on ListingTypeV2 {
    id
    isWishlisted
    wishlistedAt
    unwishlistedAt
  }
`;

const cleanString = (value: string | null | undefined) => value?.trim() ?? '';

export const normalizeListingWishlistRecord = (
  listing: Partial<ListingWishlistRecord> & Pick<ListingWishlistRecord, 'id'>
): ListingWishlistRecord => ({
  id: cleanString(listing.id),
  name: cleanString(listing.name) || 'Apartment stay',
  apartmentType: cleanString(listing.apartmentType) || 'Apartment',
  coverPhoto: cleanString(listing.coverPhoto),
  description: cleanString(listing.description) || 'Details coming soon.',
  minimumPrice: typeof listing.minimumPrice === 'number' ? listing.minimumPrice : 0,
  rating: typeof listing.rating === 'number' ? listing.rating : 0,
  area: cleanString(listing.area) || 'Lagos',
  maxNumberOfGuestsAllowed:
    typeof listing.maxNumberOfGuestsAllowed === 'number' && listing.maxNumberOfGuestsAllowed > 0
      ? listing.maxNumberOfGuestsAllowed
      : 1,
  isWishlisted: listing.isWishlisted === true,
  wishlistedAt: cleanString(listing.wishlistedAt) || null,
  unwishlistedAt: cleanString(listing.unwishlistedAt) || null,
});

export const applyListingWishlistPatch = (
  cache: ApolloCache<unknown>,
  patch: ListingWishlistPatch,
  listing?: ListingWishlistRecord
) => {
  const cacheId = cache.identify({
    __typename: 'ListingTypeV2',
    id: patch.listingId,
  });

  if (cacheId) {
    if (listing) {
      cache.writeFragment({
        id: cacheId,
        fragment: LISTING_WISHLIST_CARD_FRAGMENT,
        data: {
          __typename: 'ListingTypeV2',
          ...listing,
          isWishlisted: patch.isWishlisted,
          wishlistedAt: patch.wishlistedAt,
          unwishlistedAt: patch.unwishlistedAt,
        },
      });
    } else {
      cache.writeFragment({
        id: cacheId,
        fragment: LISTING_WISHLIST_STATUS_FRAGMENT,
        data: {
          __typename: 'ListingTypeV2',
          id: patch.listingId,
          isWishlisted: patch.isWishlisted,
          wishlistedAt: patch.wishlistedAt,
          unwishlistedAt: patch.unwishlistedAt,
        },
      });
    }
  }

  cache.modify({
    fields: {
      wishlistedListings(
        existingRefs: Reference | readonly any[] = [],
        { readField }
      ) {
        const currentRefs = Array.isArray(existingRefs) ? existingRefs : [existingRefs];

        if (!patch.isWishlisted) {
          return currentRefs.filter((ref) => readField('id', ref) !== patch.listingId);
        }

        const alreadyPresent = currentRefs.some((ref) => readField('id', ref) === patch.listingId);
        if (alreadyPresent || !listing) {
          return currentRefs;
        }

        const nextRef = cache.writeFragment({
          fragment: LISTING_WISHLIST_CARD_FRAGMENT,
          data: {
            __typename: 'ListingTypeV2',
            ...listing,
            isWishlisted: true,
            wishlistedAt: patch.wishlistedAt,
            unwishlistedAt: patch.unwishlistedAt,
          },
        });

        return nextRef ? [nextRef, ...currentRefs] : currentRefs;
      },
    },
  });
};
