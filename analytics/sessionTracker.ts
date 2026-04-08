export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

type SessionTrackerState = {
  sessionId: string;
  startedAt: number;
  lastActivityAt: number;
  lastBackgroundedAt: number | null;
  viewedListingIds: Set<string>;
  viewedLocations: Set<string>;
  totalListingViews: number;
  listingViewCountByLocation: Map<string, number>;
  deepEngagementKeys: Set<string>;
  deepEngagementCountByLocation: Map<string, number>;
  bookingListingIds: Set<string>;
  bookingLocations: Set<string>;
  bookingCount: number;
  bookingCountByLocation: Map<string, number>;
  bookingListingsByLocation: Map<string, Set<string>>;
  bookingAttemptsByListing: Map<string, number>;
  paymentAttempted: boolean;
  paymentSucceeded: boolean;
  beganBooking: boolean;
  bookingDetailsFilled: boolean;
  reviewAndPayClicked: boolean;
  apartmentTypeSelectionCount: number;
  firstListingViewAt: number | null;
  firstBeginBookingAt: number | null;
  lastBeginBookingAt: number | null;
  lastPaymentAttemptAt: number | null;
};

export type LeadSessionSnapshot = {
  sessionId: string | null;
  startedAt: number | null;
  lastActivityAt: number | null;
  lastBackgroundedAt: number | null;
  viewedListingIds: string[];
  viewedListingCount: number;
  viewedLocations: string[];
  totalListingViews: number;
  listingViewCountByLocation: Record<string, number>;
  deepEngagementCount: number;
  reviewedListingDepth: number;
  bookingListingIds: string[];
  bookingCount: number;
  bookingLocations: string[];
  uniqueBookingLocationsCount: number;
  bookingCountByLocation: Record<string, number>;
  bookingListingsByLocation: Record<string, string[]>;
  bookingAttemptsByListing: Record<string, number>;
  paymentAttempted: boolean;
  paymentSucceeded: boolean;
  beganBooking: boolean;
  bookingDetailsFilled: boolean;
  reviewAndPayClicked: boolean;
  apartmentTypeSelectionCount: number;
  dominantLocation: string | null;
  locationFocusState: 'none' | 'single' | 'multi';
  sameLocationBookingCount: number;
  focusLocationViewCount: number;
  firstListingViewAt: number | null;
  firstBeginBookingAt: number | null;
  lastBeginBookingAt: number | null;
  lastPaymentAttemptAt: number | null;
  timeToFirstBookingMs: number | null;
};

type ListingContext = {
  sessionId: string;
  listingId?: string | null;
  location?: string | null;
  now?: number;
};

let sessionState: SessionTrackerState | null = null;

const normalizeString = (value?: string | null) => {
  const trimmed = value?.trim().toLowerCase() ?? '';
  if (!trimmed) {
    return undefined;
  }

  return trimmed.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36) || undefined;
};

const createInitialSessionState = (
  sessionId: string,
  now: number
): SessionTrackerState => ({
  sessionId,
  startedAt: now,
  lastActivityAt: now,
  lastBackgroundedAt: null,
  viewedListingIds: new Set<string>(),
  viewedLocations: new Set<string>(),
  totalListingViews: 0,
  listingViewCountByLocation: new Map<string, number>(),
  deepEngagementKeys: new Set<string>(),
  deepEngagementCountByLocation: new Map<string, number>(),
  bookingListingIds: new Set<string>(),
  bookingLocations: new Set<string>(),
  bookingCount: 0,
  bookingCountByLocation: new Map<string, number>(),
  bookingListingsByLocation: new Map<string, Set<string>>(),
  bookingAttemptsByListing: new Map<string, number>(),
  paymentAttempted: false,
  paymentSucceeded: false,
  beganBooking: false,
  bookingDetailsFilled: false,
  reviewAndPayClicked: false,
  apartmentTypeSelectionCount: 0,
  firstListingViewAt: null,
  firstBeginBookingAt: null,
  lastBeginBookingAt: null,
  lastPaymentAttemptAt: null,
});

const ensureSessionState = (sessionId: string, now = Date.now()) => {
  if (!sessionState || sessionState.sessionId !== sessionId) {
    sessionState = createInitialSessionState(sessionId, now);
  }

  return sessionState;
};

const incrementCounter = (map: Map<string, number>, key?: string) => {
  if (!key) {
    return;
  }

  map.set(key, (map.get(key) ?? 0) + 1);
};

const touchSession = (sessionId: string, now = Date.now()) => {
  const state = ensureSessionState(sessionId, now);
  state.lastActivityAt = now;
  return state;
};

const addBookingListingToLocation = (
  bookingListingsByLocation: Map<string, Set<string>>,
  location: string | undefined,
  listingId: string | undefined
) => {
  if (!location || !listingId) {
    return;
  }

  const listingsForLocation = bookingListingsByLocation.get(location) ?? new Set<string>();
  listingsForLocation.add(listingId);
  bookingListingsByLocation.set(location, listingsForLocation);
};

const getDominantLocation = (counts: Map<string, number>) => {
  if (counts.size === 0) {
    return {
      dominantLocation: null,
      locationFocusState: 'none' as const,
    };
  }

  let maxCount = 0;
  let dominantLocation: string | null = null;
  let hasTie = false;

  counts.forEach((count, location) => {
    if (count > maxCount) {
      maxCount = count;
      dominantLocation = location;
      hasTie = false;
      return;
    }

    if (count === maxCount) {
      hasTie = true;
    }
  });

  if (hasTie) {
    return {
      dominantLocation: null,
      locationFocusState: 'multi' as const,
    };
  }

  return {
    dominantLocation,
    locationFocusState: 'single' as const,
  };
};

const mapToRecord = (map: Map<string, number>) =>
  Array.from(map.entries()).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});

const setMapToRecord = (map: Map<string, Set<string>>) =>
  Array.from(map.entries()).reduce<Record<string, string[]>>((acc, [key, value]) => {
    acc[key] = Array.from(value.values());
    return acc;
  }, {});

export const resetSessionTracker = (sessionId: string, now = Date.now()) => {
  sessionState = createInitialSessionState(sessionId, now);
  return getLeadSessionSnapshot();
};

export const clearSessionTracker = () => {
  sessionState = null;
};

export const isSessionTrackerExpired = (now = Date.now()) => {
  if (!sessionState) {
    return false;
  }

  return now - sessionState.lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS;
};

export const markSessionBackground = (sessionId: string, now = Date.now()) => {
  const state = touchSession(sessionId, now);
  state.lastBackgroundedAt = now;
  return getLeadSessionSnapshot();
};

export const markSessionForeground = (sessionId: string, now = Date.now()) => {
  const state = touchSession(sessionId, now);
  state.lastBackgroundedAt = null;
  return getLeadSessionSnapshot();
};

export const markSessionActivity = (sessionId: string, now = Date.now()) => {
  touchSession(sessionId, now);
  return getLeadSessionSnapshot();
};

export const recordListingView = ({ sessionId, listingId, location, now = Date.now() }: ListingContext) => {
  const state = touchSession(sessionId, now);
  const normalizedLocation = normalizeString(location);
  const normalizedListingId = normalizeString(listingId) ?? listingId?.trim();

  state.totalListingViews += 1;
  if (normalizedListingId) {
    state.viewedListingIds.add(normalizedListingId);
  }
  if (normalizedLocation) {
    state.viewedLocations.add(normalizedLocation);
    incrementCounter(state.listingViewCountByLocation, normalizedLocation);
  }
  if (!state.firstListingViewAt) {
    state.firstListingViewAt = now;
  }

  return getLeadSessionSnapshot();
};

const recordDeepListingEngagement = (
  engagementType: string,
  { sessionId, listingId, location, now = Date.now() }: ListingContext
) => {
  const state = touchSession(sessionId, now);
  const normalizedLocation = normalizeString(location);
  const normalizedListingId = normalizeString(listingId) ?? listingId?.trim() ?? 'unknown_listing';
  const engagementKey = `${normalizedListingId}:${engagementType}`;

  if (!state.deepEngagementKeys.has(engagementKey)) {
    state.deepEngagementKeys.add(engagementKey);
    incrementCounter(state.deepEngagementCountByLocation, normalizedLocation);
  }

  return getLeadSessionSnapshot();
};

export const recordListingImageScroll = (context: ListingContext) =>
  recordDeepListingEngagement('image_scroll', context);

export const recordListingPhotosOpen = (context: ListingContext) =>
  recordDeepListingEngagement('photos_open', context);

export const recordListingReviewsView = (context: ListingContext) =>
  recordDeepListingEngagement('reviews_view', context);

export const recordListingAttractionsView = (context: ListingContext) =>
  recordDeepListingEngagement('attractions_view', context);

export const recordListingOfferClick = (context: ListingContext) =>
  recordDeepListingEngagement('offer_click', context);

export const recordBeginBooking = ({
  sessionId,
  listingId,
  location,
  now = Date.now(),
}: ListingContext) => {
  const state = touchSession(sessionId, now);
  const normalizedLocation = normalizeString(location);
  const normalizedListingId = normalizeString(listingId) ?? listingId?.trim();

  state.beganBooking = true;
  state.bookingCount += 1;

  if (normalizedListingId) {
    state.bookingListingIds.add(normalizedListingId);
    incrementCounter(state.bookingAttemptsByListing, normalizedListingId);
  }

  if (normalizedLocation) {
    state.bookingLocations.add(normalizedLocation);
    incrementCounter(state.bookingCountByLocation, normalizedLocation);
  }

  addBookingListingToLocation(
    state.bookingListingsByLocation,
    normalizedLocation,
    normalizedListingId
  );

  if (!state.firstBeginBookingAt) {
    state.firstBeginBookingAt = now;
  }
  state.lastBeginBookingAt = now;

  return getLeadSessionSnapshot();
};

export const recordApartmentTypeSelect = ({
  sessionId,
  now = Date.now(),
}: Pick<ListingContext, 'sessionId' | 'now'>) => {
  const state = touchSession(sessionId, now);
  state.apartmentTypeSelectionCount += 1;
  return getLeadSessionSnapshot();
};

export const recordBookingDetailsFilled = ({
  sessionId,
  now = Date.now(),
}: Pick<ListingContext, 'sessionId' | 'now'>) => {
  const state = touchSession(sessionId, now);
  state.bookingDetailsFilled = true;
  return getLeadSessionSnapshot();
};

export const recordReviewAndPayClick = ({
  sessionId,
  now = Date.now(),
}: Pick<ListingContext, 'sessionId' | 'now'>) => {
  const state = touchSession(sessionId, now);
  state.reviewAndPayClicked = true;
  return getLeadSessionSnapshot();
};

export const recordPaymentAttempt = ({
  sessionId,
  now = Date.now(),
}: Pick<ListingContext, 'sessionId' | 'now'>) => {
  const state = touchSession(sessionId, now);
  state.paymentAttempted = true;
  state.lastPaymentAttemptAt = now;
  return getLeadSessionSnapshot();
};

export const recordPaymentSuccess = ({
  sessionId,
  now = Date.now(),
}: Pick<ListingContext, 'sessionId' | 'now'>) => {
  const state = touchSession(sessionId, now);
  state.paymentAttempted = true;
  state.paymentSucceeded = true;
  state.lastPaymentAttemptAt = now;
  return getLeadSessionSnapshot();
};

export const getLeadSessionSnapshot = (): LeadSessionSnapshot => {
  if (!sessionState) {
    return {
      sessionId: null,
      startedAt: null,
      lastActivityAt: null,
      lastBackgroundedAt: null,
      viewedListingIds: [],
      viewedListingCount: 0,
      viewedLocations: [],
      totalListingViews: 0,
      listingViewCountByLocation: {},
      deepEngagementCount: 0,
      reviewedListingDepth: 0,
      bookingListingIds: [],
      bookingCount: 0,
      bookingLocations: [],
      uniqueBookingLocationsCount: 0,
      bookingCountByLocation: {},
      bookingListingsByLocation: {},
      bookingAttemptsByListing: {},
      paymentAttempted: false,
      paymentSucceeded: false,
      beganBooking: false,
      bookingDetailsFilled: false,
      reviewAndPayClicked: false,
      apartmentTypeSelectionCount: 0,
      dominantLocation: null,
      locationFocusState: 'none',
      sameLocationBookingCount: 0,
      focusLocationViewCount: 0,
      firstListingViewAt: null,
      firstBeginBookingAt: null,
      lastBeginBookingAt: null,
      lastPaymentAttemptAt: null,
      timeToFirstBookingMs: null,
    };
  }

  const bookingDominance = getDominantLocation(sessionState.bookingCountByLocation);
  const listingDominance = getDominantLocation(sessionState.listingViewCountByLocation);
  const dominantLocation = bookingDominance.dominantLocation ?? listingDominance.dominantLocation;
  const locationFocusState =
    bookingDominance.locationFocusState !== 'none'
      ? bookingDominance.locationFocusState
      : listingDominance.locationFocusState;
  const sameLocationBookingCount = sessionState.bookingListingsByLocation.size
    ? Math.max(
        ...Array.from(sessionState.bookingListingsByLocation.values()).map((value) => value.size)
      )
    : 0;
  const focusLocationViewCount = sessionState.listingViewCountByLocation.size
    ? Math.max(...Array.from(sessionState.listingViewCountByLocation.values()))
    : 0;

  return {
    sessionId: sessionState.sessionId,
    startedAt: sessionState.startedAt,
    lastActivityAt: sessionState.lastActivityAt,
    lastBackgroundedAt: sessionState.lastBackgroundedAt,
    viewedListingIds: Array.from(sessionState.viewedListingIds.values()),
    viewedListingCount: sessionState.viewedListingIds.size,
    viewedLocations: Array.from(sessionState.viewedLocations.values()),
    totalListingViews: sessionState.totalListingViews,
    listingViewCountByLocation: mapToRecord(sessionState.listingViewCountByLocation),
    deepEngagementCount: sessionState.deepEngagementKeys.size,
    reviewedListingDepth: sessionState.deepEngagementKeys.size,
    bookingListingIds: Array.from(sessionState.bookingListingIds.values()),
    bookingCount: sessionState.bookingCount,
    bookingLocations: Array.from(sessionState.bookingLocations.values()),
    uniqueBookingLocationsCount: sessionState.bookingLocations.size,
    bookingCountByLocation: mapToRecord(sessionState.bookingCountByLocation),
    bookingListingsByLocation: setMapToRecord(sessionState.bookingListingsByLocation),
    bookingAttemptsByListing: mapToRecord(sessionState.bookingAttemptsByListing),
    paymentAttempted: sessionState.paymentAttempted,
    paymentSucceeded: sessionState.paymentSucceeded,
    beganBooking: sessionState.beganBooking,
    bookingDetailsFilled: sessionState.bookingDetailsFilled,
    reviewAndPayClicked: sessionState.reviewAndPayClicked,
    apartmentTypeSelectionCount: sessionState.apartmentTypeSelectionCount,
    dominantLocation,
    locationFocusState,
    sameLocationBookingCount,
    focusLocationViewCount,
    firstListingViewAt: sessionState.firstListingViewAt,
    firstBeginBookingAt: sessionState.firstBeginBookingAt,
    lastBeginBookingAt: sessionState.lastBeginBookingAt,
    lastPaymentAttemptAt: sessionState.lastPaymentAttemptAt,
    timeToFirstBookingMs:
      sessionState.firstListingViewAt && sessionState.firstBeginBookingAt
        ? Math.max(sessionState.firstBeginBookingAt - sessionState.firstListingViewAt, 0)
        : null,
  };
};
