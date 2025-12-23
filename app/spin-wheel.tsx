import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type WheelTone = 'blue' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

type WheelSegment = {
  label: string;
  tone: WheelTone;
  isEmpty?: boolean;
};

const WHEEL_SEGMENTS: WheelSegment[] = [
  { label: 'N5,000', tone: 'blue' },
  { label: 'Free t-shirt', tone: 'rose' },
  { label: 'Try again', tone: 'slate', isEmpty: true },
  { label: 'Free notepad', tone: 'cyan' },
  { label: 'N2,000', tone: 'emerald' },
  { label: 'Try again', tone: 'slate', isEmpty: true },
  { label: 'Free pen', tone: 'amber' },
  { label: 'Free event ticket', tone: 'blue' },
  { label: 'Try again', tone: 'slate', isEmpty: true },
  { label: 'Try again', tone: 'slate', isEmpty: true },
];

const TONE_STYLES: Record<WheelTone, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-600', text: 'text-white' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white' },
  emerald: { bg: 'bg-emerald-500', text: 'text-white' },
  amber: { bg: 'bg-amber-400', text: 'text-slate-900' },
  rose: { bg: 'bg-rose-500', text: 'text-white' },
  slate: { bg: 'bg-slate-200', text: 'text-slate-600' },
};

const { width } = Dimensions.get('window');

export default function SpinWheelScreen() {
  const wheelSize = Math.min(width - 48, 360);
  const segmentAngle = 360 / WHEEL_SEGMENTS.length;
  const labelRadius = wheelSize / 2 - 36;
  const rotation = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const router = useRouter();

  const rewards = WHEEL_SEGMENTS.filter((segment) => !segment.isEmpty);

  const selectedSegment = selectedIndex !== null ? WHEEL_SEGMENTS[selectedIndex] : null;
  const isSpinDisabled = isSpinning || hasSpun;

  useEffect(() => {
    const id = rotation.addListener(({ value }) => {
      rotationValue.current = value;
    });
    return () => rotation.removeListener(id);
  }, [rotation]);

  const spinInterpolation = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const handleSpin = () => {
    if (isSpinDisabled) return;

    setIsSpinning(true);
    setSelectedIndex(null);

    const targetIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const spins = 5 + Math.floor(Math.random() * 3);
    const normalized = ((rotationValue.current % 360) + 360) % 360;
    const centerAngle = targetIndex * segmentAngle + segmentAngle / 2;
    const targetRotation = 360 * spins + (360 - centerAngle) - normalized;
    const finalRotation = rotationValue.current + targetRotation;

    Animated.timing(rotation, {
      toValue: finalRotation,
      duration: 4200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsSpinning(false);
      setSelectedIndex(targetIndex);
      setHasSpun(true);
      const segment = WHEEL_SEGMENTS[targetIndex];
      const title = segment.isEmpty ? 'Better luck next time' : 'Congratulations!';
      const message = segment.isEmpty
        ? "You didn't win anything this time."
        : `You won ${segment.label}.`;
      Alert.alert(
        title,
        message,
        [{ text: 'Okay', onPress: () => router.replace('/(tabs)/explore') }],
        { cancelable: false },
      );
    });
  };

  const resultTitle = selectedSegment
    ? selectedSegment.isEmpty
      ? 'No prize this time'
      : `You won ${selectedSegment.label}`
    : 'Spin to reveal your offer';

  const resultSubtitle = selectedSegment
    ? selectedSegment.isEmpty
      ? 'Another checkout unlocks a fresh spin.'
      : 'We will apply this reward to your booking.'
    : 'Tap spin and let the wheel decide your bonus.';

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="absolute -left-20 top-6 h-56 w-56 rounded-full bg-blue-100/70" />
      <View className="absolute -right-24 top-40 h-72 w-72 rounded-full bg-amber-100/60" />
      <View className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-cyan-100/60" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
              Checkout reward
            </Text>
            <Text className="mt-2 text-3xl font-bold text-slate-900">
              Spin to unlock your offer
            </Text>
            <Text className="mt-2 text-sm text-slate-500">
              The pointer decides your reward.
            </Text>
          </View>
          <View className="rounded-full bg-slate-900 px-3 py-2">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              1 spin
            </Text>
          </View>
        </View>

        <View className="mt-8 items-center">
          <View style={{ width: wheelSize, height: wheelSize }} className="items-center justify-center">
            <View className="absolute h-[115%] w-[115%] rounded-full bg-blue-200/50" />
            <Animated.View
              style={{ width: wheelSize, height: wheelSize, transform: [{ rotate: spinInterpolation }] }}
              className="rounded-full bg-white p-3 shadow-xl shadow-blue-200">
              <View className="flex-1 rounded-full border border-blue-100 bg-slate-50">
                {WHEEL_SEGMENTS.map((_, index) => (
                  <View
                    key={`divider-${index}`}
                    style={[
                      StyleSheet.absoluteFillObject,
                      {
                        transform: [{ rotate: `${index * segmentAngle}deg` }],
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                      },
                    ]}>
                    <View
                      style={{
                        width: 2,
                        height: wheelSize * 0.32,
                        backgroundColor: 'rgba(15, 23, 42, 0.08)',
                        marginTop: wheelSize * 0.06,
                      }}
                    />
                  </View>
                ))}

                {WHEEL_SEGMENTS.map((segment, index) => {
                  const tone = TONE_STYLES[segment.tone];
                  return (
                    <View
                      key={`label-${segment.label}-${index}`}
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: [{ rotate: `${index * segmentAngle}deg` }],
                        },
                      ]}>
                      <View
                        style={{
                          transform: [
                            { translateY: -labelRadius },
                            { rotate: `${-index * segmentAngle}deg` },
                          ],
                        }}>
                        <View className={`rounded-full px-3 py-1 shadow-sm ${tone.bg}`}>
                          <Text className={`text-[10px] font-semibold uppercase ${tone.text}`}>
                            {segment.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            <View className="absolute h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg shadow-slate-200">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                <Feather name="gift" size={20} color="#fff" />
              </View>
              <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Spin
              </Text>
            </View>

            <View className="absolute -top-4 items-center">
              <View style={styles.pointer} />
              <View className="mt-1 h-3 w-3 rounded-full bg-slate-900" />
            </View>
          </View>

          <Pressable
            className={`mt-8 w-full items-center justify-center rounded-full py-4 ${
              isSpinDisabled ? 'bg-blue-300' : 'bg-blue-600'
            }`}
            onPress={handleSpin}
            disabled={isSpinDisabled}>
            <Text className="text-base font-semibold text-white">
              {isSpinning ? 'Spinning...' : hasSpun ? 'Spin complete' : 'Spin the wheel'}
            </Text>
          </Pressable>

          <View className="mt-5 w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100">
            <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
              Your result
            </Text>
            <Text className="mt-3 text-xl font-bold text-slate-900">{resultTitle}</Text>
            <Text className="mt-2 text-sm text-slate-500">{resultSubtitle}</Text>
          </View>
        </View>

        <View className="mt-8">
          <View className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-500">
                Rewards in this wheel
              </Text>
              <View className="rounded-full bg-blue-50 px-3 py-1">
                <Text className="text-xs font-semibold text-blue-700">
                  {rewards.length} offers
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {rewards.map((reward) => (
                <View
                  key={`reward-${reward.label}`}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2">
                  <Text className="text-xs font-semibold text-blue-700">{reward.label}</Text>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <Text className="text-xs text-slate-500">
                Empty slots mean no prize for that spin.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 14,
    borderRightWidth: 14,
    borderBottomWidth: 24,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0f172a',
  },
});
