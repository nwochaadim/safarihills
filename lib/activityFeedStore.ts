import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

import { apolloClient } from '@/lib/apolloClient';
import { AuthStatus } from '@/lib/authStatus';
import { ACTIVITY_FEED_ENTRIES } from '@/queries/activityFeedEntries';

const ACTIVITY_FEED_STORE_KEY = 'activityFeedStore';
const ACTIVITY_FEED_FETCH_INTERVAL_MS = 60 * 60 * 1000;
export const ACTIVITY_FEED_DISPLAY_INTERVAL_MS = 1 * 60 * 1000;
const MAX_SHOWN_HISTORY = 200;

type ActivityFeedListing = {
  id: string;
  name: string;
  fullAddress: string;
  coverAvatar: string;
};

type ActivityFeedBooking = {
  id: string;
  formattedCheckIn: string;
  formattedCheckOut: string;
  state: string;
  referenceNumber: string;
};

export type ActivityFeedEntry = {
  id: string;
  message: string;
  actorName: string;
  origin: string;
  eventType: string;
  listingId: string;
  listingNameSnapshot: string;
  areaSnapshot: string;
  happenedAt: string;
  active: boolean;
  activeNow: boolean;
  priority: number;
  listing: ActivityFeedListing | null;
  booking: ActivityFeedBooking | null;
};

type ActivityFeedShownRecord = {
  id: string;
  shownAt: string;
};

type ActivityFeedPersistedState = {
  entries: ActivityFeedEntry[];
  lastFetchedAt: string | null;
  currentEntryId: string | null;
  lastDisplayedAt: string | null;
  shownEntryIds: string[];
  shownHistory: ActivityFeedShownRecord[];
};

export type ActivityFeedState = ActivityFeedPersistedState & {
  hydrated: boolean;
  isFetching: boolean;
};

type ActivityFeedEntriesResponse = {
  activityFeedEntries?: unknown[] | null;
};

const emptyPersistedState = (): ActivityFeedPersistedState => ({
  entries: [],
  lastFetchedAt: null,
  currentEntryId: null,
  lastDisplayedAt: null,
  shownEntryIds: [],
  shownHistory: [],
});

let state: ActivityFeedState = {
  ...emptyPersistedState(),
  hydrated: false,
  isFetching: false,
};

let hydratePromise: Promise<ActivityFeedState> | null = null;
let fetchPromise: Promise<ActivityFeedState> | null = null;

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const cleanBoolean = (value: unknown) => Boolean(value);

const cleanNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeListing = (value: unknown): ActivityFeedListing | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  if (!id) return null;

  return {
    id,
    name: cleanString(candidate.name),
    fullAddress: cleanString(candidate.fullAddress),
    coverAvatar: cleanString(candidate.coverAvatar),
  };
};

const normalizeBooking = (value: unknown): ActivityFeedBooking | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  if (!id) return null;

  return {
    id,
    formattedCheckIn: cleanString(candidate.formattedCheckIn),
    formattedCheckOut: cleanString(candidate.formattedCheckOut),
    state: cleanString(candidate.state),
    referenceNumber: cleanString(candidate.referenceNumber),
  };
};

const normalizeActivityFeedEntry = (value: unknown): ActivityFeedEntry | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  if (!id) return null;

  return {
    id,
    message: cleanString(candidate.message),
    actorName: cleanString(candidate.actorName),
    origin: cleanString(candidate.origin),
    eventType: cleanString(candidate.eventType),
    listingId: cleanString(candidate.listingId),
    listingNameSnapshot: cleanString(candidate.listingNameSnapshot),
    areaSnapshot: cleanString(candidate.areaSnapshot),
    happenedAt: cleanString(candidate.happenedAt),
    active: cleanBoolean(candidate.active),
    activeNow: cleanBoolean(candidate.activeNow),
    priority: cleanNumber(candidate.priority),
    listing: normalizeListing(candidate.listing),
    booking: normalizeBooking(candidate.booking),
  };
};

const compareEntries = (left: ActivityFeedEntry, right: ActivityFeedEntry) => {
  const leftTime = Date.parse(left.happenedAt);
  const rightTime = Date.parse(right.happenedAt);
  const normalizedLeft = Number.isNaN(leftTime) ? 0 : leftTime;
  const normalizedRight = Number.isNaN(rightTime) ? 0 : rightTime;

  if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
  if (left.priority !== right.priority) return left.priority - right.priority;
  return left.id.localeCompare(right.id);
};

const normalizeEntries = (value: unknown[] | null | undefined) =>
  (value ?? [])
    .map(normalizeActivityFeedEntry)
    .filter((entry): entry is ActivityFeedEntry => entry !== null)
    .sort(compareEntries);

const normalizeShownHistory = (value: unknown): ActivityFeedShownRecord[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<ActivityFeedShownRecord[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc;

    const candidate = item as Record<string, unknown>;
    const id = cleanString(candidate.id);
    const shownAt = cleanString(candidate.shownAt);
    if (!id || !shownAt) return acc;

    acc.push({ id, shownAt });
    return acc.slice(-MAX_SHOWN_HISTORY);
  }, []);
};

const normalizePersistedState = (value: string | null): ActivityFeedPersistedState => {
  if (!value) return emptyPersistedState();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return emptyPersistedState();

    const candidate = parsed as Record<string, unknown>;
    const entries = normalizeEntries(
      Array.isArray(candidate.entries) ? (candidate.entries as unknown[]) : []
    );
    const entryIds = new Set(entries.map((entry) => entry.id));
    const currentEntryId = cleanString(candidate.currentEntryId);
    const shownEntryIds = Array.isArray(candidate.shownEntryIds)
      ? candidate.shownEntryIds
          .map((item) => cleanString(item))
          .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index)
          .filter((item) => entryIds.has(item))
      : [];

    return {
      entries,
      lastFetchedAt: cleanString(candidate.lastFetchedAt) || null,
      currentEntryId: currentEntryId && entryIds.has(currentEntryId) ? currentEntryId : null,
      lastDisplayedAt: cleanString(candidate.lastDisplayedAt) || null,
      shownEntryIds,
      shownHistory: normalizeShownHistory(candidate.shownHistory),
    };
  } catch {
    return emptyPersistedState();
  }
};

const serializeState = (value: ActivityFeedPersistedState) => JSON.stringify(value);

const persistState = async (value: ActivityFeedPersistedState) => {
  try {
    await SecureStore.setItemAsync(ACTIVITY_FEED_STORE_KEY, serializeState(value));
  } catch {
    // Ignore persistence issues and keep the in-memory copy available.
  }
};

const persistableState = (value: ActivityFeedState): ActivityFeedPersistedState => ({
  entries: value.entries,
  lastFetchedAt: value.lastFetchedAt,
  currentEntryId: value.currentEntryId,
  lastDisplayedAt: value.lastDisplayedAt,
  shownEntryIds: value.shownEntryIds,
  shownHistory: value.shownHistory,
});

const setState = (
  updater: ActivityFeedState | ((current: ActivityFeedState) => ActivityFeedState),
  { persist = true }: { persist?: boolean } = {}
) => {
  const nextState = typeof updater === 'function' ? updater(state) : updater;
  state = nextState;
  emitChange();

  if (persist) {
    void persistState(persistableState(nextState));
  }

  return state;
};

const pendingEntriesFor = (value: ActivityFeedState) =>
  value.entries.filter((entry) => !value.shownEntryIds.includes(entry.id));

const replaceEntries = (entries: ActivityFeedEntry[], now = Date.now()) =>
  setState((current) => ({
    ...current,
    entries,
    lastFetchedAt: new Date(now).toISOString(),
    currentEntryId: null,
    lastDisplayedAt: null,
    shownEntryIds: [],
    shownHistory: current.shownHistory.slice(-MAX_SHOWN_HISTORY),
    hydrated: true,
    isFetching: false,
  }));

export const subscribeToActivityFeedStore = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getActivityFeedState = () => state;

export const useActivityFeedStore = () =>
  useSyncExternalStore(subscribeToActivityFeedStore, getActivityFeedState, getActivityFeedState);

export const initializeActivityFeedStore = async () => {
  if (state.hydrated) return state;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const stored = await SecureStore.getItemAsync(ACTIVITY_FEED_STORE_KEY);
      const persisted = normalizePersistedState(stored);

      return setState(
        {
          ...persisted,
          hydrated: true,
          isFetching: false,
        },
        { persist: false }
      );
    } catch {
      return setState(
        {
          ...emptyPersistedState(),
          hydrated: true,
          isFetching: false,
        },
        { persist: false }
      );
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
};

export const refreshActivityFeedIfNeeded = async ({
  now = Date.now(),
  force = false,
}: {
  now?: number;
  force?: boolean;
} = {}) => {
  await initializeActivityFeedStore();

  if (fetchPromise) return fetchPromise;

  const signedIn = await AuthStatus.isSignedIn();
  if (!signedIn) return state;

  const lastFetchedAt = state.lastFetchedAt ? Date.parse(state.lastFetchedAt) : 0;
  const stale = !lastFetchedAt || now - lastFetchedAt >= ACTIVITY_FEED_FETCH_INTERVAL_MS;
  if (!force && !stale) return state;

  setState(
    (current) => ({
      ...current,
      hydrated: true,
      isFetching: true,
    }),
    { persist: false }
  );

  fetchPromise = (async () => {
    try {
      const response = await apolloClient.query<ActivityFeedEntriesResponse>({
        query: ACTIVITY_FEED_ENTRIES,
        fetchPolicy: 'no-cache',
      });
      const entries = normalizeEntries(response.data?.activityFeedEntries);
      return replaceEntries(entries, now);
    } catch {
      return setState(
        (current) => ({
          ...current,
          hydrated: true,
          isFetching: false,
        }),
        { persist: false }
      );
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

export const advanceActivityFeedDisplay = async (now = Date.now()) => {
  await initializeActivityFeedStore();

  const currentEntryId = state.currentEntryId;
  const lastDisplayedAt = state.lastDisplayedAt ? Date.parse(state.lastDisplayedAt) : 0;
  const hasCurrentEntry = Boolean(currentEntryId);
  const enoughTimeElapsed =
    !hasCurrentEntry || !lastDisplayedAt || now - lastDisplayedAt >= ACTIVITY_FEED_DISPLAY_INTERVAL_MS;

  if (!enoughTimeElapsed) return state;

  const pendingEntries = pendingEntriesFor(state);
  if (pendingEntries.length === 0) {
    if (!hasCurrentEntry) return state;

    return setState((current) => ({
      ...current,
      currentEntryId: null,
    }));
  }

  const nextEntry = pendingEntries[0];
  const shownAt = new Date(now).toISOString();

  return setState((current) => ({
    ...current,
    currentEntryId: nextEntry.id,
    lastDisplayedAt: shownAt,
    shownEntryIds: [...current.shownEntryIds, nextEntry.id],
    shownHistory: [...current.shownHistory, { id: nextEntry.id, shownAt }].slice(-MAX_SHOWN_HISTORY),
  }));
};

export const hydrateAndRefreshActivityFeed = async ({
  now = Date.now(),
  forceRefresh = false,
  forceIfEmpty = false,
}: {
  now?: number;
  forceRefresh?: boolean;
  forceIfEmpty?: boolean;
} = {}) => {
  await initializeActivityFeedStore();
  const signedIn = await AuthStatus.isSignedIn();
  if (!signedIn) return state;

  await refreshActivityFeedIfNeeded({
    now,
    force: forceRefresh || (forceIfEmpty && state.entries.length === 0),
  });
  return advanceActivityFeedDisplay(now);
};
