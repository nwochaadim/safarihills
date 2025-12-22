import { Stack, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 px-6 pt-8">
        <Pressable
          className="mb-6 w-12 items-center justify-center rounded-full border border-blue-100 bg-white/80 py-3"
          onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#1d4ed8" />
        </Pressable>

        <Text className="text-base font-semibold uppercase tracking-[0.4em] text-blue-500">
          Safarihills
        </Text>
        <Text className="mt-3 text-3xl font-bold text-slate-900">Reset password</Text>
        <Text className="mt-2 text-base text-slate-500">Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
