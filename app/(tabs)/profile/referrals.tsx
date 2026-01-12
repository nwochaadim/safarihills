import { BackButton } from '@/components/BackButton';
import { LOAD_REFERRALS } from '@/queries/loadReferrals';
import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';

type ReferralInvitee = {
  name: string | null;
  signupDate: string | null;
};

type ReferralRecord = {
  id: string | null;
  invitee: ReferralInvitee | null;
};

type NormalizedReferral = {
  id: string;
  name: string;
  date: string;
};

type LoadReferralsResponse = {
  user: {
    referralCode: string | null;
    totalReferrals: number | null;
  } | null;
  referrals: ReferralRecord[] | null;
};

type LoadReferralsVariables = {
  limit?: number | null;
  offset?: number | null;
};

const referralSteps = [
  { label: 'Invite a friend', detail: 'Share your code with friends who love to travel.' },
  { label: 'Friend books a stay', detail: 'They enjoy a welcome perk on their first booking.' },
  { label: 'Booking completes', detail: 'Rewards unlock after their stay is confirmed.' },
  { label: 'You earn credits', detail: 'Travel credits go straight to your wallet.' },
  { label: 'You earn points', detail: 'Points help you level up your rewards.' },
];

const PAGE_SIZE = 10;
const FALLBACK_REFERRALS: ReferralRecord[] = [
  {
    id: '1',
    invitee: { name: 'Chika Okafor', signupDate: '2024-03-01T10:00:00+01:00' },
  },
  {
    id: '2',
    invitee: { name: 'Ifeanyi Udo', signupDate: '2024-02-26T10:00:00+01:00' },
  },
  {
    id: '3',
    invitee: { name: 'Adaeze Obi', signupDate: '2024-02-20T10:00:00+01:00' },
  },
  {
    id: '4',
    invitee: { name: 'Seyi Adebayo', signupDate: '2024-02-10T10:00:00+01:00' },
  },
  {
    id: '5',
    invitee: { name: 'Tosin Alabi', signupDate: '2024-02-02T10:00:00+01:00' },
  },
  {
    id: '6',
    invitee: { name: 'Binta Garba', signupDate: '2024-01-25T10:00:00+01:00' },
  },
  {
    id: '7',
    invitee: { name: 'Tunde Adeyemi', signupDate: '2024-01-18T10:00:00+01:00' },
  },
  {
    id: '8',
    invitee: { name: 'Ngozi Nwosu', signupDate: '2024-01-10T10:00:00+01:00' },
  },
  {
    id: '9',
    invitee: { name: 'Kola Akin', signupDate: '2024-01-03T10:00:00+01:00' },
  },
  {
    id: '10',
    invitee: { name: 'Zainab Musa', signupDate: '2023-12-28T10:00:00+01:00' },
  },
];

const FALLBACK_REFERRAL_CODE = 'SAF-2048';

const formatReferralDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Signed up • Date unavailable';
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Signed up • ${datePart}`;
};

export default function ReferralsScreen() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showReferrals, setShowReferrals] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteReferrals, setRemoteReferrals] = useState<ReferralRecord[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const modalMaxHeight = Math.min(640, Dimensions.get('window').height * 0.78);

  const { data, loading, fetchMore, refetch } = useQuery<
    LoadReferralsResponse,
    LoadReferralsVariables
  >(LOAD_REFERRALS, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    notifyOnNetworkStatusChange: true,
  });

  const referralCode = data?.user?.referralCode?.trim() || FALLBACK_REFERRAL_CODE;
  const totalReferralsCount = data?.user?.totalReferrals ?? null;
  const fetchedReferrals = data?.referrals;
  const hasRemoteData = Array.isArray(fetchedReferrals);

  useEffect(() => {
    if (!hasRemoteData) return;
    setRemoteReferrals(fetchedReferrals ?? []);
  }, [fetchedReferrals, hasRemoteData]);

  useEffect(() => {
    if (!hasRemoteData) return;
    if (typeof totalReferralsCount === 'number') {
      setHasMore(remoteReferrals.length < totalReferralsCount);
      return;
    }
    setHasMore(remoteReferrals.length >= PAGE_SIZE);
  }, [hasRemoteData, remoteReferrals.length, totalReferralsCount]);

  const normalizedReferrals = useMemo<NormalizedReferral[]>(() => {
    const showFallback = !hasRemoteData && !loading;
    const base = hasRemoteData ? remoteReferrals : showFallback ? FALLBACK_REFERRALS : [];
    return base.map((ref, index) => {
      const name = ref?.invitee?.name?.trim() || `Referral ${index + 1}`;
      const createdAt = ref?.invitee?.signupDate ?? '';
      const date = createdAt ? formatReferralDate(createdAt) : 'Signed up • Date unavailable';
      return {
        id: ref?.id ?? `${index}`,
        name,
        date,
      };
    });
  }, [hasRemoteData, loading, remoteReferrals]);

  const totalReferrals =
    typeof totalReferralsCount === 'number'
      ? totalReferralsCount
      : normalizedReferrals.length;

  const handleOpenReferrals = useCallback(() => {
    setShowReferrals(true);
    setLoadingMore(false);
    setHasMore(true);
    setRemoteReferrals((prev) => prev.slice(0, PAGE_SIZE));
    refetch({ limit: PAGE_SIZE, offset: 0 }).catch(() => null);
  }, [refetch]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Safarihills with my code ${referralCode} to earn a welcome perk on your first booking.`,
      });
    } catch {
      // no-op on cancel or failure
    }
  };

  const handleLoadMore = useCallback(() => {
    if (!hasRemoteData || loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchMore({
      variables: {
        limit: PAGE_SIZE,
        offset: remoteReferrals.length,
      },
    })
      .then((response) => {
        const next = response.data?.referrals ?? [];
        if (!next.length) {
          setHasMore(false);
          return;
        }
        setRemoteReferrals((prev) => {
          const seen = new Set(prev.map((ref) => ref.id ?? ''));
          const merged = [...prev];
          next.forEach((ref) => {
            const key = ref.id ?? '';
            if (key && seen.has(key)) return;
            merged.push(ref);
            if (key) seen.add(key);
          });
          return merged;
        });
        const totalCount =
          response.data?.user?.totalReferrals ?? totalReferralsCount;
        if (typeof totalCount === 'number') {
          const mergedLength = remoteReferrals.length + next.length;
          setHasMore(mergedLength < totalCount);
        } else if (next.length < PAGE_SIZE) {
          setHasMore(false);
        }
      })
      .catch(() => null)
      .finally(() => setLoadingMore(false));
  }, [
    fetchMore,
    hasMore,
    hasRemoteData,
    loading,
    loadingMore,
    remoteReferrals.length,
    totalReferralsCount,
  ]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Referrals
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Invite friends</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Share Safarihills with friends and earn more when they book their stays.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
          <View className="rounded-[26px] bg-white/95 p-5">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                Your referral code
              </Text>
              <Text className="mt-2 text-4xl font-bold text-slate-900">{referralCode}</Text>
              <Text className="mt-1 text-sm text-slate-500">
                Send this code to friends so they can use it at signup and you both earn rewards.
              </Text>
            </View>
            <View className="mt-4 flex-row items-center gap-2">
              <Pressable
                className="rounded-full border border-blue-100 bg-blue-50 p-3"
                onPress={handleCopy}>
                <Feather name="copy" size={18} color="#1d4ed8" />
              </Pressable>
              <Pressable
                className="rounded-full border border-blue-100 bg-blue-50 p-3"
                onPress={handleShare}>
                <Feather name="share-2" size={18} color="#1d4ed8" />
              </Pressable>
            </View>
            {copied ? (
              <Text className="mt-2 text-xs font-semibold text-green-600">
                Code copied to clipboard
              </Text>
            ) : null}

            <View className="mt-5 flex-row gap-3">
              <Pressable
                className="flex-1 items-center justify-center rounded-full bg-blue-600 py-4 shadow-sm shadow-blue-300"
                onPress={handleShare}>
                <Text className="text-base font-semibold text-white">Share your code</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">How it works</Text>
            <Pressable
              className="flex-row items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5"
              onPress={handleOpenReferrals}>
              <Feather name="users" size={16} color="#1d4ed8" />
              <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                View referrals
              </Text>
            </Pressable>
          </View>
          <Text className="mt-1 text-sm text-slate-500">
            Simple steps for you and the friends you invite.
          </Text>

          <View className="mt-4 gap-3">
            {referralSteps.map((step, index) => (
              <View
                key={step.label}
                className="flex-row items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                <View className="mt-1 rounded-full bg-blue-100 px-3 py-1">
                  <Text className="text-xs font-semibold text-blue-700">{index + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-slate-900">{step.label}</Text>
                  <Text className="text-sm text-slate-500">{step.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={showReferrals}
        onRequestClose={() => setShowReferrals(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-[32px] bg-white px-6 pb-10 pt-6"
            style={{ maxHeight: modalMaxHeight, flex: 1 }}>
            <View className="mb-6 h-1 w-14 self-center rounded-full bg-slate-200" />
            <View className="flex-row items-center justify-between">
              <Text className="text-2xl font-bold text-slate-900">Your referrals</Text>
              <Pressable onPress={() => setShowReferrals(false)}>
                <Feather name="x" size={22} color="#0f172a" />
              </Pressable>
            </View>
            <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                  Total referrals
                </Text>
                <Text className="text-lg font-semibold text-slate-900">
                  {totalReferrals} people
                </Text>
              </View>
              <View className="rounded-full bg-white px-3 py-1">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                  Active
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-slate-500">
              People who joined with your code and their signup dates.
            </Text>

            <View className="mt-4 flex-1 rounded-2xl border border-slate-100 bg-slate-50/70">
              <FlatList
                data={normalizedReferrals}
                keyExtractor={(item) => item.id}
                scrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 16 }}
                onEndReachedThreshold={0.2}
                onEndReached={handleLoadMore}
                ListEmptyComponent={
                  <View className="items-center px-4 py-6">
                    {loading ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <Text className="text-sm text-slate-500">No referrals yet.</Text>
                    )}
                  </View>
                }
                ListFooterComponent={
                  loadingMore ? (
                    <View className="py-4">
                      <ActivityIndicator size="small" color="#2563eb" />
                    </View>
                  ) : null
                }
                renderItem={({ item, index }) => (
                  <View
                    className={`flex-row items-center justify-between px-4 py-3 ${
                      index !== 0 ? 'border-t border-slate-100' : ''
                    }`}>
                    <View>
                      <Text className="text-base font-semibold text-slate-900">{item.name}</Text>
                      <Text className="text-sm text-slate-500">{item.date}</Text>
                    </View>
                    <Feather name="check-circle" size={18} color="#16a34a" />
                  </View>
                )}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
