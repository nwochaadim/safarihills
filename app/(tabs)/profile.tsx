import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

type LinkConfig = {
  label: string;
  href: string;
};
const accountLinks: LinkConfig[] = [
  { label: 'Personal details', href: '/profile/personal-details' },
  { label: 'Wallet', href: '/profile/wallet' },
  { label: 'Referrals', href: '/profile/referrals' },
];

const supportLinks: LinkConfig[] = [
  { label: 'FAQs', href: '/profile/faqs' },
  { label: 'Get help', href: '/profile/help' },
];

const legalLinks: LinkConfig[] = [
  { label: 'Terms of use', href: '/profile/terms' },
  { label: 'Privacy policy', href: '/profile/privacy' },
];

const renderLink = (router: ReturnType<typeof useRouter>) => (item: LinkConfig) => (
  <Pressable
    key={item.label}
    className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white px-4 py-4 shadow-sm shadow-slate-50"
    onPress={() => router.push(item.href)}>
    <Text className="text-base font-semibold text-slate-900">{item.label}</Text>
    <Text className="text-xl text-slate-400">›</Text>
  </Pressable>
);

export default function ProfileScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
  const stats = {
    points: 260,
    bookings: 34,
    badges: {
      Silver: 5,
      Ruby: 3,
      Gold: 2,
      Diamond: 1,
    },
  };
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        <View className="pt-2">
          <View className="mt-3 items-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Text className="text-xl font-bold text-blue-800">AE</Text>
            </View>
            <Text className="mt-4 text-center text-3xl font-bold text-slate-900">
              Adim Eze
            </Text>
            <Text className="mt-1 text-center text-sm text-slate-500">
              adim@gmail.com - Elite Navigator
            </Text>
          </View>
          <View className="mt-6">
            {tooltip ? (
              <View className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 text-sm text-blue-700">{tooltip}</Text>
                  <Pressable onPress={() => setTooltip(null)}>
                    <Feather name="x" size={16} color="#1d4ed8" />
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <View className="mt-8 flex-col gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Account
          </Text>
          {accountLinks.map(renderLink(router))}
        </View>

        <View className="mt-8 flex-col gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Support
          </Text>
          {supportLinks.map(renderLink(router))}
        </View>

        <View className="mt-8 flex-col gap-3">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Legal
          </Text>
          {legalLinks.map(renderLink(router))}
        </View>
      </ScrollView>

      <View className="items-center pb-6">
        <Text className="text-xs text-slate-400">Version {version}</Text>
      </View>
    </SafeAreaView>
  );
}
