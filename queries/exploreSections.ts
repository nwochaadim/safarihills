import { gql } from '@apollo/client';

export const EXPLORE_SECTIONS = gql`
  query ExploreSections($filters: ExploreFilterInput, $limit: Int, $offset: Int) {
    exploreSections(filters: $filters, limit: $limit, offset: $offset) {
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
        apartmentType
        description
        coverPhoto
        minimumPrice
        rating
        area
        maxNumberOfGuestsAllowed
        bookableOptions
        promoTags
        isWishlisted
        wishlistedAt
        unwishlistedAt
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
        apartmentType
        description
        coverPhoto
        minimumPrice
        rating
        area
        maxNumberOfGuestsAllowed
        bookableOptions
        promoTags
        isWishlisted
        wishlistedAt
        unwishlistedAt
      }
    }
  }
`;
