import { gql } from '@apollo/client';

export const DELETE_BOOKING = gql`
  mutation DeleteBooking($referenceNumber: String!) {
    deleteBooking(input: { referenceNumber: $referenceNumber }) {
      id
      errors
    }
  }
`;
