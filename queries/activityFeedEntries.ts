import { gql } from '@apollo/client';

export const ACTIVITY_FEED_ENTRIES = gql`
  query ActivityFeedEntries {
    activityFeedEntries {
      id
      message
      actorName
      origin
      eventType
      listingId
      listingNameSnapshot
      areaSnapshot
      happenedAt
      active
      activeNow
      priority
      listing {
        id
        name
        coverAvatar
      }
      booking {
        id
        formattedCheckIn
        formattedCheckOut
        state
        referenceNumber
      }
    }
  }
`;
