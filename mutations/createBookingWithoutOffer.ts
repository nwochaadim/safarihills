import { gql } from '@apollo/client';

export const CREATE_BOOKING_WITHOUT_OFFER = gql`
  mutation CreateBookingWithoutOffer(
    $checkIn: String!
    $checkOut: String!
    $listingId: Int!
    $roomCategoryName: String
    $bookingPurpose: String!
    $referenceNumber: String!
    $bookingTotal: Int!
    $cautionFee: Int!
    $numberOfGuests: Int!
    $entireProperty: Boolean!
    $extending: Boolean
  ) {
    createBookingV3(
      input: {
        checkIn: $checkIn
        checkOut: $checkOut
        listingId: $listingId
        roomCategoryName: $roomCategoryName
        bookingPurpose: $bookingPurpose
        referenceNumber: $referenceNumber
        bookingTotal: $bookingTotal
        cautionFee: $cautionFee
        numberOfGuests: $numberOfGuests
        entireProperty: $entireProperty
        extending: $extending
      }
    ) {
      id
      referenceNumber
      errors
    }
  }
`;
