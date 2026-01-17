import { gql } from '@apollo/client';

export const NEW_BOOKING_DETAILS = gql`
  query newBookingDetails($listingId: ID!) {
    newBookingDetails(listingId: $listingId) {
      listing {
        name
        area
      }
      entireApartment {
        ...listableDetails
      }
      roomCategories {
        ...listableDetails
      }
      bookableOptions
    }
  }

  fragment listableDetails on ListableBookingDetails {
    name
    nightlyRate
    cautionFee
    soldOutDays
    blockedDays
    priceAdjustments
    weeklyDiscount
    monthlyDiscount
    amenities
    restrictions
    maxNumberOfGuestsAllowed
    cautionFeeNotApplicableForCheckins
    propertyPhotos {
      mediumUrl
      largeUrl
    }
  }
`;
