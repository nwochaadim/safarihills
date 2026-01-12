import { gql } from '@apollo/client';

export const VALIDATE_BOOKING = gql`
  mutation ValidateBooking($reference: String!) {
    validateBooking(input: { reference: $reference }) {
      errors
    }
  }
`;
