import { gql } from '@apollo/client';

export const LOG_USER_HEARTBEAT = gql`
  mutation LogUserHeartbeat {
    logUserHeartbeat(input: {}) {
      openedOn
      firstOpenedAt
      counts
      errors
    }
  }
`;
