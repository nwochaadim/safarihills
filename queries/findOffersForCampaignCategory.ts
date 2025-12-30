import { gql } from '@apollo/client';

export const FIND_OFFERS_FOR_CAMPAIGN_CATEGORY = gql`
  query FindOffersForCampaignCategory($categoryId: ID!) {
    category: findOfferCategory(id: $categoryId) {
      id
      name
      description
      rewards
      image
      numberOfOffers
    }

    offers: findOfferCampaigns(categoryId: $categoryId) {
      id
      name
      description
      coverPhoto
      imagesUrl: images
      visibleOn
      visibleStartTime
      visibleEndTime
      maxTimesDaily
      bookableOption

      offerCampaignRewards {
        id
        rewardType
        name
        description
        numberOfNightsToApply
        percentDiscount
        expiresAfter
      }

      offerCampaignListings {
        id
        listing {
          name
          rating
          coverPhoto
          description
          area
        }
        price
      }
    }
  }
`;
