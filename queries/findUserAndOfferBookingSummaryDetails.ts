import { gql } from '@apollo/client';

export const FIND_USER_AND_OFFER_BOOKING_SUMMARY_DETAILS = gql`
  query FindUserAndOfferBookingSummaryDetails($bookingId: ID!) {
    user {
      id
      name
      email
      phone
      walletBalance
    }
    findBookingSummaryDetails(bookingId: $bookingId) {
      id
      timelineStatus
      state
      referenceNumber
      listing {
        name
        area
      }
      roomCategory {
        name
      }
      numberOfGuests
      bookingPurpose
      checkIn
      checkOut
      checkInTime
      checkOutTime
      numberOfNights
      subtotal
      cautionFee
      bookingTotal
      couponAppliedAmount
      timelineStatus
      offerCampaign {
        name
        bookableOption
      }
      bookingRewards {
        id
        name
        type
        description
      }
    }
  }
`;
