import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

const WISHLIST_STORE_KEY = 'wishlistStore';

export type WishlistListing = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  maxNumberOfGuestsAllowed: number;
  savedAt: string;
};

export type WishlistListingInput = Omit<WishlistListing, 'savedAt'>;

type WishlistPersistedState = {
  items: WishlistListing[];
};

type WishlistState = WishlistPersistedState & {
  hydrated: boolean;
};

const emptyPersistedState = (): WishlistPersistedState => ({
  items: [],
});

let state: WishlistState = {
  ...emptyPersistedState(),
  hydrated: false,
};

let hydratePromise: Promise<WishlistState> | null = null;

const listeners = new Set<() => void>();

const emitChange = () => {
  listeners.forEach((listener) => listener());
};

const cleanString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const cleanNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const normalizeWishlistListing = (value: unknown): WishlistListing | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Record<string, unknown>;
  const id = cleanString(candidate.id);
  if (!id) return null;

  const savedAt = cleanString(candidate.savedAt);

  return {
    id,
    name: cleanString(candidate.name) || 'Saved stay',
    apartmentType: cleanString(candidate.apartmentType) || 'Apartment',
    coverPhoto: cleanString(candidate.coverPhoto),
    description: cleanString(candidate.description) || 'Details coming soon.',
    minimumPrice: cleanNumber(candidate.minimumPrice),
    rating: cleanNumber(candidate.rating),
    area: cleanString(candidate.area) || 'Lagos',
    maxNumberOfGuestsAllowed: Math.max(1, cleanNumber(candidate.maxNumberOfGuestsAllowed)),
    savedAt: savedAt || new Date().toISOString(),
  };
};

const normalizePersistedState = (value: string | null): WishlistPersistedState => {
  if (!value) return emptyPersistedState();

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return emptyPersistedState();

    const candidate = parsed as Record<string, unknown>;
    const seen = new Set<string>();
    const items = Array.isArray(candidate.items)
      ? candidate.items.reduce<WishlistListing[]>((acc, item) => {
          const normalized = normalizeWishlistListing(item);
          if (!normalized || seen.has(normalized.id)) return acc;
          seen.add(normalized.id);
          acc.push(normalized);
          return acc;
        }, [])
      : [];

    return { items };
  } catch {
    return emptyPersistedState();
  }
};

const persistableState = (value: WishlistState): WishlistPersistedState => ({
  items: value.items,
});

const persistState = async (value: WishlistPersistedState) => {
  try {
    await SecureStore.setItemAsync(WISHLIST_STORE_KEY, JSON.stringify(value));
  } catch {
    // Keep the in-memory wishlist usable if persistence fails.
  }
};

const setState = (
  updater: WishlistState | ((current: WishlistState) => WishlistState),
  { persist = true }: { persist?: boolean } = {}
) => {
  state = typeof updater === 'function' ? updater(state) : updater;
  emitChange();

  if (persist) {
    void persistState(persistableState(state));
  }

  return state;
};

const sortItems = (items: WishlistListing[]) =>
  [...items].sort((left, right) => {
    const leftTime = Date.parse(left.savedAt);
    const rightTime = Date.parse(right.savedAt);
    const normalizedLeft = Number.isNaN(leftTime) ? 0 : leftTime;
    const normalizedRight = Number.isNaN(rightTime) ? 0 : rightTime;

    if (normalizedLeft !== normalizedRight) return normalizedRight - normalizedLeft;
    return left.name.localeCompare(right.name);
  });

const upsertWishlistItem = (
  items: WishlistListing[],
  input: WishlistListingInput,
  savedAt: string
): WishlistListing[] => {
  const normalizedItem: WishlistListing = {
    ...input,
    name: cleanString(input.name) || 'Saved stay',
    apartmentType: cleanString(input.apartmentType) || 'Apartment',
    coverPhoto: cleanString(input.coverPhoto),
    description: cleanString(input.description) || 'Details coming soon.',
    minimumPrice: cleanNumber(input.minimumPrice),
    rating: cleanNumber(input.rating),
    area: cleanString(input.area) || 'Lagos',
    maxNumberOfGuestsAllowed: Math.max(1, cleanNumber(input.maxNumberOfGuestsAllowed)),
    savedAt,
  };

  const next = items.filter((item) => item.id !== normalizedItem.id);
  next.push(normalizedItem);
  return sortItems(next);
};

const mergeWishlistItems = (persistedItems: WishlistListing[], currentItems: WishlistListing[]) => {
  let nextItems = sortItems(persistedItems);

  currentItems.forEach((item) => {
    nextItems = upsertWishlistItem(nextItems, item, item.savedAt);
  });

  return nextItems;
};

export const hydrateWishlistStore = async () => {
  if (state.hydrated) return state;
  if (hydratePromise) return hydratePromise;

  hydratePromise = (async () => {
    try {
      const stored = await SecureStore.getItemAsync(WISHLIST_STORE_KEY);
      const persistedState = normalizePersistedState(stored);
      return setState(
        (current) => ({
          items: mergeWishlistItems(persistedState.items, current.items),
          hydrated: true,
        }),
        { persist: false }
      );
    } catch {
      return setState(
        {
          ...emptyPersistedState(),
          hydrated: true,
        },
        { persist: false }
      );
    } finally {
      hydratePromise = null;
    }
  })();

  return hydratePromise;
};

export const subscribeWishlistStore = (listener: () => void) => {
  listeners.add(listener);

  if (!state.hydrated) {
    void hydrateWishlistStore();
  }

  return () => {
    listeners.delete(listener);
  };
};

export const getWishlistSnapshot = () => state;

export const addWishlistListing = (input: WishlistListingInput) => {
  const savedAt = new Date().toISOString();

  setState((current) => ({
    ...current,
    items: upsertWishlistItem(current.items, input, savedAt),
  }));

  return true;
};

export const syncWishlistListing = (input: WishlistListingInput) => {
  const existing = state.items.find((item) => item.id === input.id);
  if (!existing) return false;

  setState((current) => ({
    ...current,
    items: upsertWishlistItem(current.items, input, existing.savedAt),
  }));

  return true;
};

export const removeWishlistListing = (id: string) => {
  let removed = false;

  setState((current) => {
    const nextItems = current.items.filter((item) => item.id !== id);
    removed = nextItems.length !== current.items.length;
    return {
      ...current,
      items: nextItems,
    };
  });

  return removed;
};

export const toggleWishlistListing = (input: WishlistListingInput) => {
  const exists = state.items.some((item) => item.id === input.id);

  if (exists) {
    removeWishlistListing(input.id);
    return false;
  }

  addWishlistListing(input);
  return true;
};

export const useWishlist = () => {
  const snapshot = useSyncExternalStore(
    subscribeWishlistStore,
    getWishlistSnapshot,
    getWishlistSnapshot
  );

  return {
    ...snapshot,
    wishlistIds: new Set(snapshot.items.map((item) => item.id)),
  };
};
