import { gql } from '@apollo/client';

export const NEW_BOOKING_DETAILS_FOR_OFFER = gql`
  query NewBookingDetailsForOffer($offerId: ID!, $listingId: ID!) {
    offerNewBookingDetails(offerId: $offerId, listingId: $listingId) {
      listing {
        name
        area
      }
      offer {
        id
        name
        bookableOption
        offerCampaignRules {
          id
          ruleType
          minNights
          maxHours
          validDays
          validCheckInTime
          validCheckOutTime
        }
        offerCampaignRewards {
          id
          rewardType
          name
          description
          numberOfNightsToApply
          percentDiscount
        }
      }
      entireApartment {
        ...listableDetails
      }
      roomCategories {
        ...listableDetails
      }
    }
  }

  fragment listableDetails on ListableBookingDetails {
    id
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
    propertyPhotos {
      mediumUrl
      largeUrl
    }
  }
`;
