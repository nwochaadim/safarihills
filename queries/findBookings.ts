import { gql } from '@apollo/client';

export const FIND_BOOKINGS = gql`
  query FindBookings($status: String, $limit: Int, $offset: Int) {
    findBookings(status: $status, limit: $limit, offset: $offset) {
      id
      state
      timelineStatus
      amountPaid
      cautionFee
      referenceNumber
      checkIn
      checkOut
      numberOfOccupants
      user {
        name
      }
      listing {
        name
        area
        apartmentType
        propertyPhotos {
          avatarPhoto: tinyUrl
        }
      }
    }
  }
`;
