import { gql } from '@apollo/client';

export const FIND_BOOKING_SUMMARY_AND_USER_DETAILS = gql`
  query FindBookingSummaryAndUserDetails($bookingId: ID!) {
    user {
      email
      name
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
      numberOfNights
      subtotal
      cautionFee
      bookingTotal
      couponAppliedAmount
    }
  }
`;
