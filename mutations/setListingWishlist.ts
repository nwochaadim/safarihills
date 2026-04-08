import { gql } from '@apollo/client';

export const SET_LISTING_WISHLIST = gql`
  mutation SetListingWishlist($listingId: ID!, $wishlisted: Boolean!) {
    setListingWishlist(input: { listingId: $listingId, wishlisted: $wishlisted }) {
      listingId
      isWishlisted
      wishlistedAt
      unwishlistedAt
      errors
    }
  }
`;
