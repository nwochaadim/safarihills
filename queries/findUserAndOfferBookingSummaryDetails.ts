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
