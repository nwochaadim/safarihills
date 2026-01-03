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

  fragment listableDetails on OfferListableBookingDetails {
    id
    name
    nightlyRate
    cautionFee
    blockedDays
    amenities
    restrictions
    offerPriceAdjustments
    maxNumberOfGuestsAllowed
    checkInTimeSlots
    propertyPhotos {
      mediumUrl
      largeUrl
    }
  }
`;
