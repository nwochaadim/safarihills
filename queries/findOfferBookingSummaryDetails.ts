import { gql } from '@apollo/client';

export const FIND_OFFER_BOOKING_SUMMARY_DETAILS = gql`
  query FindOfferBookingSummaryDetails($bookingId: ID!) {
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
