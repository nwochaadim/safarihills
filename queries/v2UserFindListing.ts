import { gql } from '@apollo/client';

export const V2_USER_FIND_LISTING = gql`
  query V2UserFindListing($id: ID!) {
    v2UserFindListing(id: $id) {
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
      amenities
      bookableOptions
      reviews {
        id
        userName
        rating
        comments
        createdAt
      }
      propertyPhotos {
        id
        tinyUrl
        smallUrl
        mediumUrl
        largeUrl
        xtraLargeUrl
      }
      bookedDays
    }
  }
`;
