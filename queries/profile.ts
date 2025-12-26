import { gql } from '@apollo/client';

export const PROFILE_QUERY = gql`
  query Profile {
    user {
      name
      email
      initials
      tier
    }
  }
`;
