import {
  AnalyticsLeadScoreBucket,
  AnalyticsLeadStage,
  AnalyticsPaymentAttemptState,
  AnalyticsSessionBookingCountBucket,
} from '@/lib/analytics.schema';
import { UPDATE_LEAD_CLASSIFICATION } from '@/mutations/updateLeadClassification';

type LeadClassificationSyncPayload = {
  analyticsActorId: string;
  leadStage: AnalyticsLeadStage;
  leadScoreBucket: AnalyticsLeadScoreBucket;
  leadFocusLocation: string | null;
  paymentAttemptState: AnalyticsPaymentAttemptState;
  sessionBookingCountBucket: AnalyticsSessionBookingCountBucket;
};

type LeadClassificationMutationResponse = {
  updateLeadClassification: {
    updated: boolean | null;
    previousLeadStage?: string | null;
    currentLeadStage?: string | null;
    leadStage?: string | null;
    leadScoreBucket?: string | null;
    leadFocusLocation?: string | null;
    paymentAttemptState?: string | null;
    sessionBookingCountBucket?: string | null;
    errors?: Array<string | null> | string | null;
  } | null;
};

type LeadClassificationMutationVariables = {
  leadStage: AnalyticsLeadStage;
  leadScoreBucket: AnalyticsLeadScoreBucket;
  leadFocusLocation: string | null;
  paymentAttemptState: AnalyticsPaymentAttemptState;
  sessionBookingCountBucket: AnalyticsSessionBookingCountBucket;
};

type LeadClassificationSyncState = {
  lastSentLeadStage: AnalyticsLeadStage | null;
  lastAttemptedLeadStage: AnalyticsLeadStage | null;
  inFlightLeadStage: AnalyticsLeadStage | null;
};

const syncStateByUser = new Map<string, LeadClassificationSyncState>();

const normalizeLeadFocusLocation = (value: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const getSyncState = (userKey: string): LeadClassificationSyncState => {
  const existing = syncStateByUser.get(userKey);
  if (existing) {
    return existing;
  }

  const initialState: LeadClassificationSyncState = {
    lastSentLeadStage: null,
    lastAttemptedLeadStage: null,
    inFlightLeadStage: null,
  };
  syncStateByUser.set(userKey, initialState);
  return initialState;
};

const updateSyncState = (userKey: string, nextState: LeadClassificationSyncState) => {
  syncStateByUser.set(userKey, nextState);
};

export const resetLeadClassificationSyncState = (analyticsActorId?: string | null) => {
  const userKey = analyticsActorId?.trim();
  if (!userKey) {
    return;
  }

  syncStateByUser.delete(userKey);
};

export const syncLeadClassification = async ({
  analyticsActorId,
  leadStage,
  leadScoreBucket,
  leadFocusLocation,
  paymentAttemptState,
  sessionBookingCountBucket,
}: LeadClassificationSyncPayload) => {
  const userKey = analyticsActorId.trim();
  if (!userKey) {
    return;
  }

  const syncState = getSyncState(userKey);
  if (
    syncState.lastSentLeadStage === leadStage ||
    syncState.lastAttemptedLeadStage === leadStage ||
    syncState.inFlightLeadStage === leadStage
  ) {
    return;
  }

  const normalizedLeadFocusLocation = normalizeLeadFocusLocation(leadFocusLocation);

  updateSyncState(userKey, {
    ...syncState,
    lastAttemptedLeadStage: leadStage,
    inFlightLeadStage: leadStage,
  });

  try {
    const { apolloClient } = await import('@/lib/apolloClient');
    const { data } = await apolloClient.mutate<
      LeadClassificationMutationResponse,
      LeadClassificationMutationVariables
    >({
      mutation: UPDATE_LEAD_CLASSIFICATION,
      variables: {
        leadStage,
        leadScoreBucket,
        leadFocusLocation: normalizedLeadFocusLocation,
        paymentAttemptState,
        sessionBookingCountBucket,
      },
      fetchPolicy: 'no-cache',
    });

    const response = data?.updateLeadClassification;
    const errors = response?.errors;
    const hasErrors = Array.isArray(errors)
      ? errors.some((error) => Boolean(error?.trim()))
      : typeof errors === 'string'
        ? Boolean(errors.trim())
        : false;

    if (hasErrors) {
      console.warn('Lead classification sync returned GraphQL payload errors.', errors);
      return;
    }

    const persistedLeadStage = response?.currentLeadStage ?? response?.leadStage ?? null;
    if (response?.updated || persistedLeadStage === leadStage) {
      updateSyncState(userKey, {
        lastSentLeadStage: leadStage,
        lastAttemptedLeadStage: leadStage,
        inFlightLeadStage: null,
      });
      return;
    }
  } catch (error) {
    console.warn('Failed to sync lead classification to the backend.', error);
  } finally {
    const latestState = getSyncState(userKey);
    if (latestState.inFlightLeadStage === leadStage) {
      updateSyncState(userKey, {
        ...latestState,
        inFlightLeadStage: null,
      });
    }
  }
};
