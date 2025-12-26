import { gql } from '@apollo/client';

export const RESEND_GUEST_OTP = gql`
  mutation resendGuestOtp($input: ResendGuestOtpInput!) {
    resendGuestOtp(input: $input) {
      errors
      success
    }
  }
`;
