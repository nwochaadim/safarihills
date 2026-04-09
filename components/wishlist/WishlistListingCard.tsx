import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { ListingWishlistRecord } from '@/lib/listingWishlist';
import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { WishlistToggleButton } from './WishlistToggleButton';

type WishlistListingCardProps = {
  item: ListingWishlistRecord;
  savedLabel: string;
  onPress: (listing: ListingWishlistRecord) => void;
  onToggleWishlist: (listing: ListingWishlistRecord) => void;
};

export function WishlistListingCard({
  item,
  savedLabel,
  onPress,
  onToggleWishlist,
}: WishlistListingCardProps) {
  return (
    <Pressable
      className="mb-6 overflow-hidden rounded-[32px] border border-rose-100 bg-white shadow-lg shadow-rose-100"
      onPress={() => onPress(item)}>
      <LoadingImageBackground
        source={{ uri: item.coverPhoto }}
        className="h-56 w-full overflow-hidden"
        imageStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
        <View className="absolute inset-0 bg-slate-950/25" />
        <View className="absolute right-4 top-4 z-10">
          <WishlistToggleButton
            active={item.isWishlisted}
            variant="card"
            onPress={() => onToggleWishlist(item)}
          />
        </View>
        <View className="flex-1 justify-between p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="rounded-full border border-white/40 bg-white/90 px-3 py-1">
              <Text className="text-xs font-semibold text-slate-800">{item.apartmentType}</Text>
            </View>
          </View>

          <View className="self-start rounded-full border border-white/35 bg-slate-900/60 px-3 py-1.5">
            <Text className="text-xs font-semibold text-white">{savedLabel}</Text>
          </View>
        </View>
      </LoadingImageBackground>

      <View className="px-5 py-5">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xl font-semibold text-slate-900" numberOfLines={2}>
              {item.name}
            </Text>
            <View className="mt-2 flex-row items-center gap-1.5">
              <Feather name="star" size={14} color="#f59e0b" />
              <Text className="text-sm font-semibold text-slate-700">
                {item.rating > 0 ? item.rating.toFixed(1) : 'New'}
              </Text>
              <Text className="text-sm text-slate-400">
                {item.rating > 0 ? 'guest rating' : 'listing'}
              </Text>
            </View>
            <View className="mt-2 flex-row items-center gap-2">
              <Feather name="map-pin" size={14} color="#94a3b8" />
              <Text className="text-sm text-slate-500">{item.area}</Text>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              From
            </Text>
            <Text className="mt-1 text-base font-semibold text-rose-600">
              ₦{item.minimumPrice.toLocaleString()}
            </Text>
            <Text className="text-[10px] font-medium text-slate-500">/ night</Text>
          </View>
        </View>

        <Text className="mt-4 text-sm leading-6 text-slate-500" numberOfLines={3}>
          {item.description}
        </Text>

        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Feather name="users" size={15} color="#64748b" />
            <Text className="text-sm font-medium text-slate-600">
              Up to {item.maxNumberOfGuestsAllowed} guests
            </Text>
          </View>
          <View className="rounded-full bg-rose-50 px-3 py-1.5">
            <Text className="text-xs font-semibold text-rose-600">Open stay</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
