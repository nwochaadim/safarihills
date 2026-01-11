import { gql } from '@apollo/client';

export const CREATE_OFFER_BOOKING = gql`
  mutation CreateOfferBooking(
    $inputOfferId: ID!
    $inputListingId: ID!
    $inputRoomCategoryName: String
    $inputReferenceNumber: String!
    $inputBookingTotal: Int!
    $inputCautionFee: Int!
    $inputBookingPurpose: String!
    $inputNumberOfGuests: Int!
    $inputCheckIn: String
    $inputCheckOut: String
    $inputCheckInTime: String
    $inputCheckOutTime: String
  ) {
    createOfferBooking(
      input: {
        offerId: $inputOfferId
        listingId: $inputListingId
        roomCategoryName: $inputRoomCategoryName
        referenceNumber: $inputReferenceNumber
        bookingTotal: $inputBookingTotal
        cautionFee: $inputCautionFee
        bookingPurpose: $inputBookingPurpose
        numberOfGuests: $inputNumberOfGuests
        checkIn: $inputCheckIn
        checkOut: $inputCheckOut
        checkInTime: $inputCheckInTime
        checkOutTime: $inputCheckOutTime
      }
    ) {
      booking {
        id
        referenceNumber
        checkIn
        checkOut
      }
      errors
    }
  }
`;
