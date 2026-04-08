import {
  ANALYTICS_EVENTS,
  AnalyticsContextParams,
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsLeadScoreBucket,
  AnalyticsLeadStage,
  AnalyticsLeadStageChangeReason,
  AnalyticsPaymentAttemptState,
  AnalyticsSessionBookingCountBucket,
  AnalyticsUserProperties,
  toFlag,
} from '@/lib/analytics.schema';
import {
  clearSessionTracker,
  getLeadSessionSnapshot,
  isSessionTrackerExpired,
  markSessionActivity,
  markSessionBackground,
  markSessionForeground,
  recordApartmentTypeSelect,
  recordBeginBooking,
  recordListingWishlist,
  recordBookingDetailsFilled,
  recordListingAttractionsView,
  recordListingImageScroll,
  recordListingOfferClick,
  recordListingPhotosOpen,
  recordListingReviewsView,
  recordListingView,
  recordPaymentAttempt,
  recordPaymentSuccess,
  recordReviewAndPayClick,
  resetSessionTracker,
} from '@/analytics/sessionTracker';

type LeadClassifierBridge = {
  logEvent: <TEventName extends AnalyticsEventName>(
    eventName: TEventName,
    params: AnalyticsEventParams<TEventName>,
    context: AnalyticsContextParams
  ) => Promise<void>;
  setUserProperties: (properties: AnalyticsUserProperties) => Promise<void>;
  syncLeadClassification: (payload: {
    analyticsActorId: string;
    leadStage: AnalyticsLeadStage;
    leadScoreBucket: AnalyticsLeadScoreBucket;
    leadFocusLocation: string | null;
    paymentAttemptState: AnalyticsPaymentAttemptState;
    sessionBookingCountBucket: AnalyticsSessionBookingCountBucket;
  }) => Promise<void>;
};

type LeadClassifierState = {
  sessionId: string | null;
  analyticsActorId: string | null;
  currentStage: AnalyticsLeadStage | null;
  currentReason: AnalyticsLeadStageChangeReason | null;
  leadScore: number;
  leadScoreBucket: AnalyticsLeadScoreBucket;
  focusLocation: string | null;
  sessionBookingCountBucket: AnalyticsSessionBookingCountBucket;
  paymentAttemptState: AnalyticsPaymentAttemptState;
};

type LeadComputation = {
  stage: AnalyticsLeadStage | null;
  reason: AnalyticsLeadStageChangeReason;
  score: number;
  scoreBucket: AnalyticsLeadScoreBucket;
  focusLocation: string | null;
  sessionBookingCountBucket: AnalyticsSessionBookingCountBucket;
  paymentAttemptState: AnalyticsPaymentAttemptState;
};

export type LeadSessionPreparationResult = {
  sessionId: string;
  startedNewSession: boolean;
  resetReason: 'none' | 'context_rebind' | 'inactivity_timeout';
};

export type LeadStageRecomputeResult = LeadComputation & {
  previousStage: AnalyticsLeadStage | null;
  stageChanged: boolean;
};

const defaultBridge: LeadClassifierBridge = {
  logEvent: async () => {},
  setUserProperties: async () => {},
  syncLeadClassification: async () => {},
};

let bridge = defaultBridge;

let classifierState: LeadClassifierState = {
  sessionId: null,
  analyticsActorId: null,
  currentStage: null,
  currentReason: null,
  leadScore: 0,
  leadScoreBucket: 'low',
  focusLocation: null,
  sessionBookingCountBucket: '0',
  paymentAttemptState: 'none',
};

const isSignedInContext = (context: AnalyticsContextParams) =>
  context.actor_type === 'user' && context.auth_state === 'signed_in';

const getLeadScoreBucket = (score: number): AnalyticsLeadScoreBucket => {
  if (score >= 70) {
    return 'high';
  }

  if (score >= 35) {
    return 'medium';
  }

  return 'low';
};

const getSessionBookingCountBucket = (
  bookingCount: number
): AnalyticsSessionBookingCountBucket => {
  if (bookingCount <= 0) {
    return '0';
  }

  if (bookingCount === 1) {
    return '1';
  }

  if (bookingCount <= 3) {
    return '2_3';
  }

  return '4_plus';
};

const getPaymentAttemptState = (): AnalyticsPaymentAttemptState => {
  const snapshot = getLeadSessionSnapshot();

  if (snapshot.paymentSucceeded) {
    return 'completed';
  }

  if (snapshot.paymentAttempted) {
    return 'attempted';
  }

  return 'none';
};

const getFocusLocation = () => {
  const snapshot = getLeadSessionSnapshot();

  if (snapshot.dominantLocation) {
    return snapshot.dominantLocation;
  }

  if (snapshot.locationFocusState === 'multi') {
    return 'multi_location';
  }

  return null;
};

const computeLeadScore = () => {
  const snapshot = getLeadSessionSnapshot();
  let score = 0;

  if (snapshot.viewedListingCount >= 1) {
    score += 10;
  }

  if (snapshot.reviewedListingDepth >= 1) {
    score += 10;
  }

  if (snapshot.focusLocationViewCount >= 2) {
    score += 10;
  }

  if (snapshot.beganBooking) {
    score += 25;
  }

  if (snapshot.bookingDetailsFilled || snapshot.reviewAndPayClicked) {
    score += 15;
  }

  if (snapshot.paymentAttempted) {
    score += 25;
  }

  if (
    !snapshot.paymentAttempted &&
    snapshot.uniqueBookingLocationsCount === 1 &&
    snapshot.sameLocationBookingCount >= 2
  ) {
    score += 20;
  }

  return Math.min(score, 100);
};

const computeLeadStage = (context: AnalyticsContextParams): LeadComputation => {
  const snapshot = getLeadSessionSnapshot();
  const score = computeLeadScore();
  const scoreBucket = getLeadScoreBucket(score);
  const focusLocation = getFocusLocation();
  const paymentAttemptState = getPaymentAttemptState();
  const sessionBookingCountBucket = getSessionBookingCountBucket(snapshot.bookingCount);

  if (!isSignedInContext(context)) {
    return {
      stage: null,
      reason: 'guest_or_signed_out',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (snapshot.paymentSucceeded) {
    return {
      stage: 'hot',
      reason: 'payment_completed',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (snapshot.paymentAttempted) {
    return {
      stage: 'hot',
      reason: 'payment_attempt_without_success',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (
    snapshot.sameLocationBookingCount >= 2 &&
    snapshot.uniqueBookingLocationsCount === 1 &&
    snapshot.bookingCount >= 2
  ) {
    return {
      stage: 'hot',
      reason: 'same_location_repeat_booking_intent',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (snapshot.beganBooking || snapshot.bookingDetailsFilled || snapshot.reviewAndPayClicked) {
    return {
      stage: 'warm',
      reason:
        snapshot.uniqueBookingLocationsCount > 1
          ? 'multi_location_booking_browsing'
          : 'booking_started_without_payment',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (snapshot.viewedListingCount >= 1 && snapshot.wishlistedListingCount >= 1) {
    return {
      stage: 'warm',
      reason: 'listing_wishlisted',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  if (snapshot.viewedListingCount >= 1) {
    return {
      stage: 'cold',
      reason: 'listing_viewed_without_booking',
      score,
      scoreBucket,
      focusLocation,
      sessionBookingCountBucket,
      paymentAttemptState,
    };
  }

  return {
    stage: null,
    reason: 'insufficient_session_activity',
    score,
    scoreBucket,
    focusLocation,
    sessionBookingCountBucket,
    paymentAttemptState,
  };
};

const applyComputedState = (context: AnalyticsContextParams, computation: LeadComputation) => {
  classifierState = {
    sessionId: context.session_id,
    analyticsActorId: context.analytics_actor_id,
    currentStage: computation.stage,
    currentReason: computation.reason,
    leadScore: computation.score,
    leadScoreBucket: computation.scoreBucket,
    focusLocation: computation.focusLocation,
    sessionBookingCountBucket: computation.sessionBookingCountBucket,
    paymentAttemptState: computation.paymentAttemptState,
  };
};

const buildLeadUserProperties = (context: AnalyticsContextParams): AnalyticsUserProperties => {
  if (!isSignedInContext(context)) {
    return {
      lead_stage: null,
      lead_score_bucket: null,
      lead_focus_location: null,
      session_booking_count_bucket: null,
      payment_attempt_state: null,
    };
  }

  return {
    lead_stage: classifierState.currentStage,
    lead_score_bucket: classifierState.leadScoreBucket,
    lead_focus_location: classifierState.focusLocation,
    session_booking_count_bucket: classifierState.sessionBookingCountBucket,
    payment_attempt_state: classifierState.paymentAttemptState,
  };
};

export const configureLeadClassifier = (nextBridge: Partial<LeadClassifierBridge>) => {
  bridge = {
    ...bridge,
    ...nextBridge,
  };
};

export const getCurrentLeadStage = () => classifierState.currentStage;

export const getCurrentLeadState = () => ({
  ...classifierState,
  snapshot: getLeadSessionSnapshot(),
});

export const flushLeadPropertiesToFirebase = async (context: AnalyticsContextParams) => {
  await bridge.setUserProperties(buildLeadUserProperties(context));
};

export const recomputeLeadStage = async (
  context: AnalyticsContextParams
): Promise<LeadStageRecomputeResult> => {
  const previousStage = classifierState.currentStage;
  const computation = computeLeadStage(context);

  applyComputedState(context, computation);
  await flushLeadPropertiesToFirebase(context);

  const snapshot = getLeadSessionSnapshot();
  const stageChanged = previousStage !== computation.stage;

  if (stageChanged && computation.stage) {
    await bridge.logEvent(
      ANALYTICS_EVENTS.LeadStageChanged,
      {
        previous_stage: previousStage ?? 'unclassified',
        new_stage: computation.stage,
        reason: computation.reason,
        location_focus: computation.focusLocation ?? undefined,
        booking_count: snapshot.bookingCount,
        payment_attempted: toFlag(snapshot.paymentAttempted),
        payment_succeeded: toFlag(snapshot.paymentSucceeded),
        same_location_booking_count: snapshot.sameLocationBookingCount,
        unique_locations_count:
          snapshot.uniqueBookingLocationsCount || snapshot.viewedLocations.length,
        viewed_listing_count: snapshot.viewedListingCount,
        reviewed_listing_depth: snapshot.reviewedListingDepth,
        lead_score: computation.score,
        lead_score_bucket: computation.scoreBucket,
        session_booking_count_bucket: computation.sessionBookingCountBucket,
      },
      context
    );
  }

  if (stageChanged && computation.stage && isSignedInContext(context)) {
    void bridge.syncLeadClassification({
      analyticsActorId: context.analytics_actor_id,
      leadStage: computation.stage,
      leadScoreBucket: computation.scoreBucket,
      leadFocusLocation: computation.focusLocation,
      paymentAttemptState: computation.paymentAttemptState,
      sessionBookingCountBucket: computation.sessionBookingCountBucket,
    });
  }

  return {
    previousStage,
    stageChanged,
    ...computation,
  };
};

export const initializeLeadSession = async (
  context: AnalyticsContextParams,
  options: { resetSession?: boolean } = {}
) => {
  if (options.resetSession || classifierState.sessionId !== context.session_id) {
    resetSessionTracker(context.session_id);
    classifierState = {
      sessionId: context.session_id,
      analyticsActorId: context.analytics_actor_id,
      currentStage: null,
      currentReason: null,
      leadScore: 0,
      leadScoreBucket: 'low',
      focusLocation: null,
      sessionBookingCountBucket: '0',
      paymentAttemptState: 'none',
    };
  } else {
    markSessionActivity(context.session_id);
    classifierState = {
      ...classifierState,
      sessionId: context.session_id,
      analyticsActorId: context.analytics_actor_id,
    };
  }

  return recomputeLeadStage(context);
};

export const prepareLeadSession = async (
  context: AnalyticsContextParams,
  options: {
    cause: 'event' | 'foreground';
    buildSessionId: () => string;
  }
): Promise<LeadSessionPreparationResult> => {
  const snapshot = getLeadSessionSnapshot();
  const needsContextRebind = snapshot.sessionId !== context.session_id;

  if (needsContextRebind) {
    await initializeLeadSession(context, { resetSession: true });
    return {
      sessionId: context.session_id,
      startedNewSession: true,
      resetReason: 'context_rebind',
    };
  }

  if (isSessionTrackerExpired()) {
    const nextSessionId = options.buildSessionId();
    await initializeLeadSession(
      {
        ...context,
        session_id: nextSessionId,
      },
      { resetSession: true }
    );

    return {
      sessionId: nextSessionId,
      startedNewSession: true,
      resetReason: 'inactivity_timeout',
    };
  }

  if (options.cause === 'foreground') {
    markSessionForeground(context.session_id);
  }

  return {
    sessionId: context.session_id,
    startedNewSession: false,
    resetReason: 'none',
  };
};

export const handleAppBackground = (context: AnalyticsContextParams) => {
  markSessionBackground(context.session_id);
};

export const clearLeadClassifierState = async (context?: AnalyticsContextParams) => {
  clearSessionTracker();
  classifierState = {
    sessionId: null,
    analyticsActorId: null,
    currentStage: null,
    currentReason: null,
    leadScore: 0,
    leadScoreBucket: 'low',
    focusLocation: null,
    sessionBookingCountBucket: '0',
    paymentAttemptState: 'none',
  };

  if (context) {
    await flushLeadPropertiesToFirebase(context);
  } else {
    await bridge.setUserProperties({
      lead_stage: null,
      lead_score_bucket: null,
      lead_focus_location: null,
      session_booking_count_bucket: null,
      payment_attempt_state: null,
    });
  }
};

const readListingContext = (params: {
  listing_id?: string;
  city?: string;
}) => ({
  listingId: params.listing_id,
  location: params.city,
});

export const observeLeadEvent = async <TEventName extends AnalyticsEventName>(
  eventName: TEventName,
  params: AnalyticsEventParams<TEventName>,
  context: AnalyticsContextParams
) => {
  markSessionActivity(context.session_id);

  switch (eventName) {
    case ANALYTICS_EVENTS.ViewItem: {
      const listingParams = params as AnalyticsEventParams<'view_item'>;
      recordListingView({
        sessionId: context.session_id,
        ...readListingContext(listingParams),
      });
      break;
    }

    case ANALYTICS_EVENTS.ListingGalleryBrowse: {
      const galleryParams = params as AnalyticsEventParams<'listing_gallery_browse'>;
      if (galleryParams.source_surface === 'photo_modal') {
        recordListingPhotosOpen({
          sessionId: context.session_id,
          listingId: galleryParams.listing_id,
        });
      } else {
        recordListingImageScroll({
          sessionId: context.session_id,
          listingId: galleryParams.listing_id,
        });
      }
      break;
    }

    case ANALYTICS_EVENTS.ListingContentMilestone: {
      const milestoneParams = params as AnalyticsEventParams<'listing_content_milestone'>;
      if (milestoneParams.milestone === 'reviews_visible') {
        recordListingReviewsView({
          sessionId: context.session_id,
          listingId: milestoneParams.listing_id,
          location: milestoneParams.city,
        });
      } else {
        recordListingAttractionsView({
          sessionId: context.session_id,
          listingId: milestoneParams.listing_id,
          location: milestoneParams.city,
        });
      }
      break;
    }

    case ANALYTICS_EVENTS.ViewPromotion:
    case ANALYTICS_EVENTS.SelectPromotion: {
      const promotionParams = params as AnalyticsEventParams<'select_promotion'>;
      recordListingOfferClick({
        sessionId: context.session_id,
        ...readListingContext(promotionParams),
      });
      break;
    }

    case ANALYTICS_EVENTS.BeginBooking: {
      const bookingParams = params as AnalyticsEventParams<'begin_booking'>;
      recordBeginBooking({
        sessionId: context.session_id,
        ...readListingContext(bookingParams),
      });
      break;
    }

    case ANALYTICS_EVENTS.ApartmentTypeSelect: {
      recordApartmentTypeSelect({
        sessionId: context.session_id,
      });
      break;
    }

    case ANALYTICS_EVENTS.BookingDetailsCompleted: {
      recordBookingDetailsFilled({
        sessionId: context.session_id,
      });
      break;
    }

    case ANALYTICS_EVENTS.ReviewAndPayClick: {
      recordReviewAndPayClick({
        sessionId: context.session_id,
      });
      break;
    }

    case ANALYTICS_EVENTS.BookingPaymentAttempt: {
      recordPaymentAttempt({
        sessionId: context.session_id,
      });
      break;
    }

    case ANALYTICS_EVENTS.Purchase: {
      recordPaymentSuccess({
        sessionId: context.session_id,
      });
      break;
    }

    default:
      break;
  }

  return recomputeLeadStage(context);
};

export const observeWishlistLeadIntent = async (
  params: {
    listing_id: string;
  },
  context: AnalyticsContextParams
) => {
  markSessionActivity(context.session_id);
  recordListingWishlist({
    sessionId: context.session_id,
    listingId: params.listing_id,
  });

  return recomputeLeadStage(context);
};
