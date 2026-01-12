import { gql } from '@apollo/client';

export const TOPUP_WALLET_BALANCE = gql`
  mutation TopupWalletBalance($amount: Float!) {
    createWalletTopup(input: { amount: $amount }) {
      amount
      reference
      state
      user {
        id
        name
        email
        phone
      }
    }
  }
`;
