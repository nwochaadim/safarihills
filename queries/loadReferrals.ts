import { gql } from '@apollo/client';

export const LOAD_REFERRALS = gql`
  query LoadReferrals($limit: Int, $offset: Int) {
    user {
      referralCode
      totalReferrals
    }
    referrals(limit: $limit, offset: $offset) {
      id
      invitee {
        name
        signupDate: createdAt
      }
    }
  }
`;
