import { gql } from '@apollo/client';

export const UPDATE_LEAD_CLASSIFICATION = gql`
  mutation UpdateLeadClassification(
    $leadStage: String!
    $leadScoreBucket: String!
    $leadFocusLocation: String
    $paymentAttemptState: String!
    $sessionBookingCountBucket: String!
  ) {
    updateLeadClassification(
      input: {
        leadStage: $leadStage
        leadScoreBucket: $leadScoreBucket
        leadFocusLocation: $leadFocusLocation
        paymentAttemptState: $paymentAttemptState
        sessionBookingCountBucket: $sessionBookingCountBucket
      }
    ) {
      updated
      previousLeadStage
      currentLeadStage
      leadStage
      leadScoreBucket
      leadFocusLocation
      paymentAttemptState
      sessionBookingCountBucket
      errors
    }
  }
`;
