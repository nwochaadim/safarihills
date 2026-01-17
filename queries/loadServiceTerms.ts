import { gql } from '@apollo/client';

export const LOAD_SERVICE_TERMS = gql`
  query ServiceTerms {
    serviceTerms
  }
`;
