import { gql } from '@apollo/client';

export const PROFILE_QUERY = gql`
  query Profile {
    user {
      id
      name
      email
      initials
      tier
    }
  }
`;
