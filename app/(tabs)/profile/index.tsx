import { useQuery } from '@apollo/client';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { BlankSlate } from '@/components/BlankSlate';
import { AuthStatus } from '@/lib/authStatus';
import { PROFILE_QUERY } from '@/queries/profile';

type LinkConfig = {
  label: string;
  href: string;
};
const accountLinks: LinkConfig[] = [
  { label: 'Personal details', href: '/profile/personal-details' },
  { label: 'Wallet', href: '/(tabs)/profile/wallet' },
  { label: 'Rewards', href: '/profile/rewards' },
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

type ProfileQueryResponse = {
  user?: {
    name?: string | null;
    email?: string | null;
    initials?: string | null;
    tier?: string | null;
  } | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version || Constants.manifest?.version || '1.0.0';
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const { data, loading, error, refetch } = useQuery<ProfileQueryResponse>(PROFILE_QUERY, {
    skip: authStatus !== 'signed-in',
    fetchPolicy: 'cache-and-network',
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setAuthStatus('checking');
      AuthStatus.isSignedIn().then((signedIn) => {
        if (isActive) setAuthStatus(signedIn ? 'signed-in' : 'signed-out');
      });
      return () => {
        isActive = false;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (authStatus === 'signed-in') {
        refetch();
      }
    }, [authStatus, refetch])
  );

  const profile = data?.user;
  const profileName = profile?.name?.trim() ?? '';
  const derivedInitials = profileName
    ? profileName
        .split(/\s+/)
        .map((part) => part[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';
  const profileInitials = profile?.initials?.trim() || derivedInitials || 'SH';
  const profileEmail = profile?.email?.trim() ?? '';
  const profileTier = profile?.tier?.trim() ?? '';
  const profileMeta = [profileEmail, profileTier].filter(Boolean).join(' - ');
  const displayName = profileName || 'Your profile';
  const isProfileLoading = authStatus === 'signed-in' && loading && !profile;

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      {authStatus === 'checking' ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : isProfileLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      ) : authStatus === 'signed-in' && error && !profile ? (
        <View className="flex-1 items-center justify-center px-8">
          <BlankSlate
            title="Unable to load profile"
            description="Check your connection and try again."
            iconName="alert-circle"
            primaryAction={{ label: 'Try again', onPress: () => refetch() }}
          />
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
                  <Text className="text-xl font-bold text-blue-800">{profileInitials}</Text>
                </View>
                <Text className="mt-4 text-center text-3xl font-bold text-slate-900">
                  {displayName}
                </Text>
                {profileMeta ? (
                  <Text className="mt-1 text-center text-sm text-slate-500">{profileMeta}</Text>
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
        </>
      )}
    </SafeAreaView>
  );
}
