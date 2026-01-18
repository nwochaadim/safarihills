import { gql } from '@apollo/client';

export const RESET_PASSWORD = gql`
  mutation ResetPassword($email: String!) {
    resetPassword(input: { email: $email }) {
      success
      errors
    }
  }
`;
