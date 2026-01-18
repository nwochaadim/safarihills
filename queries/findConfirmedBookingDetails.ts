import { gql } from '@apollo/client';

export const FIND_CONFIRMED_BOOKING_DETAILS = gql`
  query FindConfirmedBookingDetails($bookingId: ID!) {
    confirmedBookingDetails(bookingId: $bookingId) {
      id
      referenceNumber
      name
      address
      checkIn
      checkOut
      checkInTime
      checkOutTime
      googleMapLocation
      contact
    }
  }
`;
