import { gql } from '@apollo/client';

export const LOAD_REWARDS = gql`
  query LoadRewards($limit: Int, $offset: Int) {
    bookingRewards(limit: $limit, offset: $offset) {
      name
      type
      description
      state
      expiresAt
      awardedAt: createdAt
    }
  }
`;
