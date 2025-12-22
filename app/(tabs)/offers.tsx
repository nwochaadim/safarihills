import { SafeAreaView, Text, View } from 'react-native';

export default function OffersScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Safarihills
        </Text>
        <Text className="mt-3 text-3xl font-bold text-slate-900">Offers</Text>
        <Text className="mt-2 text-base font-semibold text-slate-500">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
