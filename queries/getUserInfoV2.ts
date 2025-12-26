import { gql } from '@apollo/client';

export const GET_USER_INFO_V2 = gql`
  query GetUserInfoV2 {
    user {
      firstName
      lastName
      phone
      email
    }
  }
`;
