import { gql } from '@apollo/client';

export const UPDATE_PERSONAL_INFO = gql`
  mutation UpdatePersonalInfo($input: UpdatePersonalInfoV2Input!) {
    updatePersonalInfoV2(input: $input) {
      firstName
      lastName
      phone
      email
    }
  }
`;
