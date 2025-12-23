import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';

type LinkConfig = {
  label: string;
  href: string;
};
const accountLinks: LinkConfig[] = [
  { label: 'Personal details', href: '/profile/personal-details' },
  { label: 'Wallet', href: '/(tabs)/profile/wallet' },
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
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');
      SecureStore.getItemAsync('authToken')
        .then((token) => {
          if (isActive) setAuthStatus(token ? 'signed-in' : 'signed-out');
        })
        .catch(() => {
          if (isActive) setAuthStatus('signed-out');
        });
      return () => {
        isActive = false;
      };
    }, [])
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {authStatus === 'checking' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : authStatus === 'signed-out' ? (
        <View className="flex-1 items-center justify-center px-8">
          <BlankSlate
            title="Sign in to view profile"
            description="Manage your account details, rewards, and settings from one place."
            iconName="user"
            primaryAction={{ label: 'Sign in', onPress: () => router.push('/auth/login') }}
            secondaryAction={{ label: 'Create account', onPress: () => router.push('/auth/sign-up') }}
          />
        </View>
      ) : (
        <>
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
        </>
      )}
    </SafeAreaView>
  );
}
