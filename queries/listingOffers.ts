import { gql } from '@apollo/client';

export const LISTING_OFFERS = gql`
  query ListingOffers($listingId: ID!) {
    listingOffers(listingId: $listingId) {
      id
      name
      title
      description
      badgeText
      ctaLabel
      themeKey
      iconKey
      publicStatus
      publicStartsAt
      publicEndsAt
      claimHoldMinutes
      bookableOption
      isClaimedByCurrentUser
      rewards {
        id
        rewardType
        name
        description
        numberOfNightsToApply
        percentDiscount
      }
      rules {
        id
        ruleType
        minNights
        maxHours
        validDays
        validCheckInTime
        validCheckOutTime
      }
      activeClaim {
        id
        status
        claimedAt
        holdExpiresAt
      }
    }
  }
`;
