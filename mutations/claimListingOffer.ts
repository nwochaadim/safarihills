import { gql } from '@apollo/client';

export const CLAIM_LISTING_OFFER = gql`
  mutation ClaimListingOffer($offerId: ID!, $listingId: ID!) {
    claimListingOffer(input: { offerId: $offerId, listingId: $listingId }) {
      success
      message
      errors
      offer {
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
      claim {
        id
        status
        claimedAt
        holdExpiresAt
      }
    }
  }
`;
