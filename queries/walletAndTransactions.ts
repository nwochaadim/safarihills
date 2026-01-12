import { gql } from '@apollo/client';

export const WALLET_AND_TRANSACTIONS = gql`
  query WalletAndTransactions($limit: Int, $offset: Int) {
    wallet {
      balance
      transactions(limit: $limit, offset: $offset) {
        id
        transactionType
        name
        formattedAmount
        date
      }
    }
  }
`;
