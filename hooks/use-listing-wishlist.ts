import { useMutation } from '@apollo/client';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import {
  applyListingWishlistPatch,
  ListingWishlistRecord,
  normalizeListingWishlistRecord,
} from '@/lib/listingWishlist';
import { recordWishlistLeadIntent } from '@/lib/analytics';
import { AuthStatus } from '@/lib/authStatus';
import { SET_LISTING_WISHLIST } from '@/mutations/setListingWishlist';

type SetListingWishlistPayload = {
  listingId?: string | null;
  isWishlisted?: boolean | null;
  wishlistedAt?: string | null;
  unwishlistedAt?: string | null;
  errors?: string[] | string | null;
};

type SetListingWishlistResponse = {
  setListingWishlist?: SetListingWishlistPayload | null;
};

type SetListingWishlistVariables = {
  listingId: string;
  wishlisted: boolean;
};

const normalizeErrors = (errors: string[] | string | null | undefined) => {
  if (Array.isArray(errors)) {
    return errors
      .map((error) => error?.trim())
      .filter((error): error is string => Boolean(error));
  }

  if (typeof errors === 'string' && errors.trim()) {
    return [errors.trim()];
  }

  return [];
};

export function useListingWishlistToggle() {
  const router = useRouter();
  const [setListingWishlist] = useMutation<
    SetListingWishlistResponse,
    SetListingWishlistVariables
  >(SET_LISTING_WISHLIST);

  const toggleListingWishlist = useCallback(
    async (listingInput: Partial<ListingWishlistRecord> & Pick<ListingWishlistRecord, 'id'>) => {
      const listing = normalizeListingWishlistRecord(listingInput);
      const signedIn = await AuthStatus.isSignedIn();

      if (!signedIn) {
        router.push('/auth/login');
        return false;
      }

      const nextWishlisted = !listing.isWishlisted;

      try {
        const { data } = await setListingWishlist({
          variables: {
            listingId: listing.id,
            wishlisted: nextWishlisted,
          },
          update: (cache, result) => {
            const payload = result.data?.setListingWishlist;
            if (!payload?.listingId || normalizeErrors(payload.errors).length > 0) return;

            applyListingWishlistPatch(
              cache,
              {
                listingId: payload.listingId,
                isWishlisted: payload.isWishlisted ?? nextWishlisted,
                wishlistedAt: payload.wishlistedAt ?? (nextWishlisted ? new Date().toISOString() : null),
                unwishlistedAt: payload.unwishlistedAt ?? (nextWishlisted ? null : new Date().toISOString()),
              },
              listing
            );
          },
        });

        const payload = data?.setListingWishlist;
        const errors = normalizeErrors(payload?.errors);

        if (!payload?.listingId || errors.length > 0) {
          Alert.alert('Wishlist unavailable', errors[0] ?? 'Please try again in a moment.');
          return false;
        }

        if (nextWishlisted) {
          void recordWishlistLeadIntent({
            listing_id: payload.listingId,
          });
        }

        return true;
      } catch {
        Alert.alert('Wishlist unavailable', 'Please try again in a moment.');
        return false;
      }
    },
    [router, setListingWishlist]
  );

  return {
    toggleListingWishlist,
  };
}
