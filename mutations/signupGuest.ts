import { gql } from '@apollo/client';

export const SIGNUP_GUEST = gql`
  mutation SignupGuest($signupGuest: SignupGuestInput!) {
    signupGuest(input: $signupGuest) {
      user {
        id
      }
      errors
      nextStep
    }
  }
`;
