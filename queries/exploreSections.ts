import { gql } from '@apollo/client';

export const EXPLORE_SECTIONS = gql`
  query ExploreSections($filters: ExploreFilterInput) {
    exploreSections(filters: $filters) {
      id
      slug
      title
      eyebrow
      subtitle
      iconKey
      backgroundColor
      textColor
      borderColor
      position
      sectionType
      matchingCount
      location {
        id
        name
        area
      }
      listings {
        id
        name
        description
        coverPhoto
        minimumPrice
        rating
        area
        maxNumberOfGuestsAllowed
        bookableOptions
      }
    }
  }
`;

export const EXPLORE_SECTION = gql`
  query ExploreSection($slug: String!, $filters: ExploreFilterInput) {
    exploreSection(slug: $slug, filters: $filters) {
      id
      slug
      title
      eyebrow
      subtitle
      iconKey
      backgroundColor
      textColor
      borderColor
      position
      sectionType
      matchingCount
      location {
        id
        name
        area
      }
      listings {
        id
        name
        description
        coverPhoto
        minimumPrice
        rating
        area
        maxNumberOfGuestsAllowed
        bookableOptions
      }
    }
  }
`;
