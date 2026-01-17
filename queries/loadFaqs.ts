import { gql } from '@apollo/client';

export const LOAD_FAQS = gql`
  query LoadFaqs {
    faqs
  }
`;
