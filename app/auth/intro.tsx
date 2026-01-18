import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  ListRenderItem,
  Pressable,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LoadingImageBackground } from '@/components/LoadingImageBackground';

type IntroSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
};

const SLIDES: IntroSlide[] = [
  {
    id: 'slide-earn',
    title: 'Unlock exclusive apartment deals tailored for you.',
    description:
      'Safarihills brings premium listings and limited offers that make every luxury stay more rewarding.',
    image:
      'https://storage.googleapis.com/safarihills-mobile-assets/cover-4.jpeg',
  },
  {
    id: 'slide-rewards',
    title: 'Earn rewards every time you book.',
    description:
      'Collect points, climb tiers, and redeem perks that keep the motivation flowing.',
    image:
      'https://storage.googleapis.com/safarihills-mobile-assets/cover-photo.jpeg',
  },
  {
    id: 'slide-support',
    title: 'Transparent pricing and instant support for every trip.',
    description:
      'See availability in real time, get updates from Safarihills experts, and book with confidence.',
    image:
      'https://storage.googleapis.com/safarihills-mobile-assets/cover-photo2.jpeg',
  },
];

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

export default function IntroScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const viewConfigRef = useRef({
    viewAreaCoveragePercentThreshold: 60,
  });

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  );

  const renderSlide: ListRenderItem<IntroSlide> = ({ item }) => (
    <View style={{ width }}>
      <View className="mt-6 w-full items-center">
        <LoadingImageBackground
          source={{ uri: item.image }}
          style={{ width: CARD_WIDTH, minHeight: width * 1.15 }}
          imageStyle={{ borderRadius: 32 }}
          className="overflow-hidden rounded-[32px] bg-blue-100">
          <View className="flex-1 justify-end bg-black/30 px-6 pb-20">
            <Text className="text-xl font-semibold leading-tight text-white">{item.title}</Text>
            <Text className="mt-3 text-base leading-relaxed text-white/80">{item.description}</Text>
          </View>
        </LoadingImageBackground>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="px-6 pt-4">
        <Text className="text-base font-semibold uppercase tracking-[0.3em] text-blue-500">
          Safarihills
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">
          Find your next luxury stay
        </Text>
      </View>

      <FlatList
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        decelerationRate="fast"
        snapToAlignment="start"
        viewabilityConfig={viewConfigRef.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
      />

      <View className="px-6 pb-10 pt-4">
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              className={`h-1.5 rounded-full ${
                activeIndex === index ? 'w-10 bg-blue-600' : 'w-3 bg-blue-200'
              }`}
            />
          ))}
        </View>

        <Pressable
          className="mb-3 items-center justify-center rounded-full bg-blue-600 py-4"
          onPress={() => router.push('/auth/login')}>
          <Text className="text-base font-semibold text-white">Log in</Text>
        </Pressable>
        <Pressable
          className="items-center justify-center rounded-full border border-blue-100 bg-blue-50 py-4"
          onPress={() => router.push('/auth/sign-up')}>
          <Text className="text-base font-semibold text-blue-700">Create account</Text>
        </Pressable>

        <View className="mt-6 flex-row items-center gap-3">
          <View className="h-px flex-1 bg-slate-200" />
          <Text className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-400">
            Or
          </Text>
          <View className="h-px flex-1 bg-slate-200" />
        </View>

        <Pressable
          className="mt-4 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-3"
          onPress={() => router.replace('/(tabs)/explore')}>
          <Text className="text-sm font-semibold text-slate-700">Continue as a guest</Text>
          <Feather name="arrow-right" size={16} color="#475569" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
