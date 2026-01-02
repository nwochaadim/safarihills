import { gql } from '@apollo/client';

export const FIND_BOOKING_SUMMARY_DETAILS = gql`
  query FindBookingSummaryDetails($bookingId: ID!) {
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
      numberOfNights
      subtotal
      cautionFee
      bookingTotal
      couponAppliedAmount
    }
  }
`;
