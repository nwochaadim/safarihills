import { gql } from '@apollo/client';

export const CREATE_WALLET_PAYMENT_FOR_BOOKING = gql`
  mutation CreateWalletPaymentForBooking($reference: String!) {
    createWalletPayment(input: { reference: $reference }) {
      errors
    }
  }
`;
