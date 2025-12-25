import { gql } from '@apollo/client';

export const V2_EXPLORE_LISTINGS = gql`
  query V2ExploreListings(
    $minBudget: Int
    $maxBudget: Int
    $checkIn: String
    $checkOut: String
    $numberOfGuests: Int
    $amenities: [String!]
    $limit: Int
    $offset: Int
  ) {
    v2ExploreListings(
      minBudget: $minBudget
      maxBudget: $maxBudget
      checkIn: $checkIn
      checkOut: $checkOut
      numberOfGuests: $numberOfGuests
      amenities: $amenities
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
      pointsToWin
      maxNumberOfGuestsAllowed
      bookableOptions
      propertyPhotos {
        id
        tinyUrl
        smallUrl
        mediumUrl
        largeUrl
        xtraLargeUrl
      }
    }
  }
`;
