import { gql } from '@apollo/client';

export const WISHLISTED_LISTINGS = gql`
  query WishlistedListings {
    wishlistedListings {
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
  }
`;
