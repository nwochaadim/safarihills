import { gql } from '@apollo/client';

export const FIND_OFFER_CATEGORIES = gql`
  query FindOfferCategories($limit: Int, $offset: Int) {
    findOfferCategories(limit: $limit, offset: $offset) {
      id
      name
      description
      rewards
      coverPhoto: image
      numberOfOffers
    }
  }
`;
