import { gql } from '@apollo/client';

export const LOGIN_GUEST = gql`
  mutation LoginGuest($input: LoginGuestInput!) {
    loginGuest(input: $input) {
      errors
      nextStep
      token
    }
  }
`;
