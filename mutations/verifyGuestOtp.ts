import { gql } from '@apollo/client';

export const VERIFY_GUEST_OTP = gql`
  mutation verifyGuestOtp($otp: VerifyGuestOtpInput!) {
    verifyGuestOtp(input: $otp) {
      errors
      valid
      token
    }
  }
`;
