import { gql } from '@apollo/client';

export const CONFIRM_PASSWORD = gql`
  mutation ConfirmPassword($email: String!, $password: String!, $newPassword: String!) {
    confirmPassword(input: { email: $email, password: $password, newPassword: $newPassword }) {
      success
      errors
    }
  }
`;
