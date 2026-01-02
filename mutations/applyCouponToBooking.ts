import { gql } from '@apollo/client';

export const APPLY_COUPON_TO_BOOKING = gql`
  mutation ApplyCouponToBooking($bookingId: ID!, $couponCode: String!) {
    applyCouponToBooking(input: { bookingId: $bookingId, couponCode: $couponCode }) {
      errors
      appliedAmount
      successMessage
    }
  }
`;
