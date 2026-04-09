import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { ExploreListing } from '@/lib/explore';
import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { WishlistToggleButton } from '@/components/wishlist/WishlistToggleButton';

const PROMO_TAG_TONES = [
  {
    containerClass: 'border-emerald-200 bg-emerald-50',
    textClass: 'text-emerald-700',
    iconColor: '#047857',
  },
  {
    containerClass: 'border-amber-200 bg-amber-50',
    textClass: 'text-amber-700',
    iconColor: '#b45309',
  },
  {
    containerClass: 'border-blue-200 bg-blue-50',
    textClass: 'text-blue-700',
    iconColor: '#1d4ed8',
  },
];

type ExploreListingCardProps = {
  item: ExploreListing;
  onPress: (item: ExploreListing) => void;
  onToggleWishlist: (item: ExploreListing) => void;
};

export function ExploreListingCard({
  item,
  onPress,
  onToggleWishlist,
}: ExploreListingCardProps) {
  const visiblePromoTags = item.promoTags.filter((tag) => tag.trim().length > 0).slice(0, 4);
  const hasMultiplePromoTags = visiblePromoTags.length > 1;
  const promoTagStyle = hasMultiplePromoTags ? { maxWidth: '47.5%' } : undefined;

  return (
    <Pressable
      className="mb-6 overflow-hidden rounded-[32px] bg-white shadow-lg shadow-slate-200"
      onPress={() => onPress(item)}>
      <LoadingImageBackground
        source={{ uri: item.coverPhoto }}
        className="h-56 w-full overflow-hidden"
        imageStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
        <View className="absolute right-4 top-4 z-10">
          <WishlistToggleButton
            active={item.isWishlisted}
            onPress={() => onToggleWishlist(item)}
          />
        </View>
        <View className="flex-1 flex-row items-start justify-between p-4">
          <Text className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800">
            {item.apartmentType || 'Apartment'}
          </Text>
        </View>
      </LoadingImageBackground>

      <View className="space-y-2 px-5 py-5">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 text-xl font-semibold text-slate-900" numberOfLines={2}>
            {item.name}
          </Text>
          <View className="items-end">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              From
            </Text>
            <Text className="text-base font-semibold text-blue-600">
              ₦{item.minimumPrice.toLocaleString()}
            </Text>
            <Text className="text-[10px] font-medium text-slate-500">/ night</Text>
          </View>
        </View>
        <View className="mt-1 flex-row items-center gap-1.5">
          <Feather name="star" size={14} color="#f59e0b" />
          <Text className="text-sm font-semibold text-slate-700">{item.rating.toFixed(1)} rated</Text>
        </View>
        <View className="mt-1 flex-row items-center gap-2">
          <Feather name="map-pin" size={14} color="#94a3b8" />
          <Text className="text-sm text-slate-500">{item.area}</Text>
        </View>
        {visiblePromoTags.length > 0 && (
          <View className="mt-3 min-h-[34px] flex-row flex-wrap gap-2">
            {visiblePromoTags.map((tag, index) => {
              const tone = PROMO_TAG_TONES[index % PROMO_TAG_TONES.length];
              return (
                <View
                  key={`${item.id}-${tag}`}
                  className={`min-w-0 self-start flex-row items-center gap-1 rounded-full border px-2.5 py-1.5 ${tone.containerClass}`}
                  style={promoTagStyle}>
                  <Feather name="tag" size={10} color={tone.iconColor} />
                  <Text
                    className={`min-w-0 shrink text-[10px] font-semibold leading-4 ${tone.textClass}`}
                    numberOfLines={1}
                    ellipsizeMode="tail">
                    {tag}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text className="text-sm text-slate-500" numberOfLines={2} ellipsizeMode="tail">
          {item.description}
        </Text>
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Feather name="users" size={16} color="#64748b" />
            <Text className="text-sm font-medium text-slate-600">
              Up to {item.maxNumberOfGuestsAllowed} guests
            </Text>
          </View>
          {item.isWishlisted ? (
            <View className="rounded-full bg-rose-50 px-3 py-1.5">
              <Text className="text-xs font-semibold text-rose-600">Wishlisted</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
