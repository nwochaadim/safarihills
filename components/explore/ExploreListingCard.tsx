import { LoadingImageBackground } from '@/components/LoadingImageBackground';
import { ExploreListing } from '@/lib/explore';
import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

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
};

export function ExploreListingCard({ item, onPress }: ExploreListingCardProps) {
  console.log('item', item);
  return (
    <Pressable
      className="mb-6 overflow-hidden rounded-[32px] bg-white shadow-lg shadow-slate-200"
      onPress={() => onPress(item)}>
      <LoadingImageBackground
        source={{ uri: item.coverPhoto }}
        className="h-56 w-full overflow-hidden"
        imageStyle={{ borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
        <View className="flex-1 flex-row items-start justify-between p-4">
          <Text className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-800">
            {item.apartmentType || 'Apartment'}
          </Text>
          <View className="flex-row items-center gap-1 rounded-full bg-slate-900/60 px-3 py-1">
            <Feather name="star" size={14} color="#fde047" />
            <Text className="text-xs font-semibold text-white">{item.rating.toFixed(1)}</Text>
          </View>
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
        <View className="mt-1 flex-row items-center gap-2">
          <Feather name="map-pin" size={14} color="#94a3b8" />
          <Text className="text-sm text-slate-500">{item.area}</Text>
        </View>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.promoTags.map((tag, index) => {
            const tone = PROMO_TAG_TONES[index % PROMO_TAG_TONES.length];
            return (
              <View
                key={`${item.id}-${tag}`}
                className={`flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 ${tone.containerClass}`}>
                <Feather name="tag" size={11} color={tone.iconColor} />
                <Text className={`text-[11px] font-semibold ${tone.textClass}`}>{tag}</Text>
              </View>
            );
          })}
        </View>
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
        </View>
      </View>
    </Pressable>
  );
}
