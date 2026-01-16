import { gql } from '@apollo/client';

export const V2_EXPLORE_LISTINGS = gql`
  query ProfileWithListings(
    $minBudget: Int
    $maxBudget: Int
    $checkIn: String
    $checkOut: String
    $numberOfGuests: Int
    $amenities: [String!]
    $apartmentType: String
    $limit: Int
    $offset: Int
  ) {
    profile: user {
      firstName
      initials
    }
    v2ExploreListings(
      minBudget: $minBudget
      maxBudget: $maxBudget
      checkIn: $checkIn
      checkOut: $checkOut
      numberOfGuests: $numberOfGuests
      amenities: $amenities
      apartmentType: $apartmentType
      limit: $limit
      offset: $offset
    ) {
      id
      name
      sortIndex
      apartmentType
      coverPhoto
      description
      minimumPrice
      apartmentType
      rating
      area
      maxNumberOfGuestsAllowed
      bookableOptions
    }
  }
`;
