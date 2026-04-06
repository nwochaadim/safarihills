import { gql } from '@apollo/client';

export const AVAILABLE_LOCATIONS_QUERY = gql`
  query AvailableLocations {
    locations {
      id
      name
    }
  }
`;
