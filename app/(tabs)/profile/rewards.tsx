import { BackButton } from '@/components/BackButton';
import { BlankSlate } from '@/components/BlankSlate';
import { LOAD_REWARDS } from '@/queries/loadRewards';
import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

type RewardRecord = {
  name: string | null;
  type: string | null;
  description: string | null;
  state: string | null;
  expiresAt: string | null;
  awardedAt: string | null;
};

type LoadRewardsResponse = {
  bookingRewards: RewardRecord[] | null;
};

type LoadRewardsVariables = {
  limit?: number | null;
  offset?: number | null;
};

type RewardBadge = {
  label: string;
  badgeClass: string;
  textClass: string;
  iconBgClass: string;
  iconColor: string;
};

type RewardExpiry = {
  label: string;
  labelClass: string;
  caption: string;
  captionClass: string;
  isExpired: boolean;
};

type NormalizedReward = {
  key: string;
  name: string;
  description: string;
  type: string;
  awardedLabel: string;
  stateBadge: RewardBadge;
  expiry: RewardExpiry;
};

const PAGE_SIZE = 10;

const formatDate = (value: string | null | undefined) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getRewardKey = (reward: RewardRecord, index: number) => {
  const name = reward?.name?.trim() || 'reward';
  const awardedAt = reward?.awardedAt ?? 'unknown';
  const expiresAt = reward?.expiresAt ?? 'none';
  const state = reward?.state ?? 'unknown';
  return `${name}-${awardedAt}-${expiresAt}-${state}-${index}`;
};

const getStateBadge = (state: string | null | undefined): RewardBadge => {
  const normalized = state?.trim().toLowerCase();
  if (normalized === 'redeemed') {
    return {
      label: 'Redeemed',
      badgeClass: 'bg-indigo-50',
      textClass: 'text-indigo-700',
      iconBgClass: 'bg-indigo-100',
      iconColor: '#4338ca',
    };
  }
  if (normalized === 'utilized') {
    return {
      label: 'Utilized',
      badgeClass: 'bg-sky-50',
      textClass: 'text-sky-700',
      iconBgClass: 'bg-sky-100',
      iconColor: '#0369a1',
    };
  }
  if (normalized === 'pending') {
    return {
      label: 'Pending',
      badgeClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      iconBgClass: 'bg-blue-100',
      iconColor: '#1d4ed8',
    };
  }
  return {
    label: 'Unknown',
    badgeClass: 'bg-slate-100',
    textClass: 'text-slate-600',
    iconBgClass: 'bg-slate-200',
    iconColor: '#475569',
  };
};

const getExpiryMeta = (expiresAt: string | null | undefined): RewardExpiry => {
  if (!expiresAt) {
    return {
      label: 'No expiry',
      labelClass: 'text-slate-400',
      caption: 'Expires',
      captionClass: 'text-slate-400',
      isExpired: false,
    };
  }
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return {
      label: 'Date unavailable',
      labelClass: 'text-slate-400',
      caption: 'Expires',
      captionClass: 'text-slate-400',
      isExpired: false,
    };
  }
  const dateLabel = formatDate(expiresAt);
  const isExpired = date.getTime() < Date.now();
  if (isExpired) {
    return {
      label: dateLabel,
      labelClass: 'text-blue-600',
      caption: 'Expired',
      captionClass: 'text-blue-500',
      isExpired: true,
    };
  }
  return {
    label: dateLabel,
    labelClass: 'text-slate-600',
    caption: 'Expires',
    captionClass: 'text-slate-400',
    isExpired: false,
  };
};

export default function RewardsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { data, loading, fetchMore, refetch } = useQuery<
    LoadRewardsResponse,
    LoadRewardsVariables
  >(LOAD_REWARDS, {
    variables: { limit: PAGE_SIZE, offset: 0 },
    notifyOnNetworkStatusChange: true,
  });

  const rewards = data?.bookingRewards ?? [];

  const statusCounts = useMemo(() => {
    return rewards.reduce(
      (acc, reward) => {
        const state = reward?.state?.trim().toLowerCase();
        if (state === 'redeemed') acc.redeemed += 1;
        else if (state === 'utilized') acc.utilized += 1;
        else acc.pending += 1;
        return acc;
      },
      { pending: 0, redeemed: 0, utilized: 0 }
    );
  }, [rewards]);

  const normalizedRewards = useMemo<NormalizedReward[]>(() => {
    return rewards.map((reward, index) => {
      const name = reward?.name?.trim() || `Reward ${index + 1}`;
      const description = reward?.description?.trim() || 'Reward details pending.';
      const type = reward?.type?.trim() || 'Reward';
      return {
        key: getRewardKey(reward, index),
        name,
        description,
        type,
        awardedLabel: formatDate(reward?.awardedAt),
        stateBadge: getStateBadge(reward?.state),
        expiry: getExpiryMeta(reward?.expiresAt),
      };
    });
  }, [rewards]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setHasMore(true);
    refetch({ limit: PAGE_SIZE, offset: 0 })
      .then((response) => {
        const next = response.data?.bookingRewards ?? [];
        if (next.length < PAGE_SIZE) {
          setHasMore(false);
        }
      })
      .catch(() => null)
      .finally(() => setRefreshing(false));
  }, [refetch, refreshing]);

  const handleLoadMore = useCallback(() => {
    if (loading || loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    fetchMore({
      variables: { limit: PAGE_SIZE, offset: rewards.length },
      updateQuery: (previous, { fetchMoreResult }) => {
        if (!fetchMoreResult?.bookingRewards) return previous;
        const prevRewards = previous?.bookingRewards ?? [];
        const nextRewards = fetchMoreResult.bookingRewards ?? [];
        if (!nextRewards.length) return previous;
        return {
          ...previous,
          bookingRewards: [...prevRewards, ...nextRewards],
        };
      },
    })
      .then((response) => {
        const next = response.data?.bookingRewards ?? [];
        if (!next.length || next.length < PAGE_SIZE) {
          setHasMore(false);
        }
      })
      .catch(() => null)
      .finally(() => setLoadingMore(false));
  }, [fetchMore, hasMore, loading, loadingMore, refreshing, rewards.length]);

  const renderHeader = useMemo(
    () => (
      <View className="px-6 pb-2">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Rewards
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Your rewards</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Celebrate every milestone with perks you can unlock on your next stay.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
          <View className="rounded-[26px] bg-white/95 p-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Rewards earned
                </Text>
                <Text className="mt-2 text-4xl font-bold text-slate-900">
                  {rewards.length}
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Feather name="award" size={22} color="#1d4ed8" />
              </View>
            </View>
            <Text className="mt-2 text-sm text-slate-500">
              Earn perks like free nights, spa treatments, and curated experiences.
            </Text>
          </View>
        </View>

        <View className="mt-5 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-blue-50 px-3 py-1">
            <Text className="text-xs font-semibold text-blue-700">
              Pending {statusCounts.pending}
            </Text>
          </View>
          <View className="rounded-full bg-indigo-50 px-3 py-1">
            <Text className="text-xs font-semibold text-indigo-700">
              Redeemed {statusCounts.redeemed}
            </Text>
          </View>
          <View className="rounded-full bg-sky-50 px-3 py-1">
            <Text className="text-xs font-semibold text-sky-700">
              Utilized {statusCounts.utilized}
            </Text>
          </View>
        </View>

        <View className="mt-6">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-slate-900">Rewards history</Text>
            {loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
          </View>
          <Text className="mt-1 text-sm text-slate-500">
            Track when each reward was earned and when it expires.
          </Text>
        </View>
      </View>
    ),
    [loading, rewards.length, router, statusCounts]
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        data={normalizedRewards}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <View className="mx-6 mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
            <View className="flex-row items-center justify-between">
              <View className="rounded-full bg-slate-100 px-3 py-1">
                <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                  {item.type}
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1 ${item.stateBadge.badgeClass}`}>
                <Text
                  className={`text-xs font-semibold uppercase tracking-[0.2em] ${item.stateBadge.textClass}`}>
                  {item.stateBadge.label}
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-start gap-3">
              <View
                className={`mt-1 h-10 w-10 items-center justify-center rounded-full ${item.stateBadge.iconBgClass}`}>
                <Feather name="gift" size={18} color={item.stateBadge.iconColor} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-semibold text-slate-900">{item.name}</Text>
                <Text className="mt-1 text-sm text-slate-500">{item.description}</Text>
              </View>
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2">
              <View>
                <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Awarded
                </Text>
                <Text className="text-sm font-semibold text-slate-700">
                  {item.awardedLabel}
                </Text>
              </View>
              <View className="items-end">
                <Text
                  className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${item.expiry.captionClass}`}>
                  {item.expiry.caption}
                </Text>
                <Text className={`text-sm font-semibold ${item.expiry.labelClass}`}>
                  {item.expiry.label}
                </Text>
              </View>
            </View>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <View className="px-6 pt-8">
              <View className="rounded-3xl border border-blue-100 bg-white px-6 py-10 shadow-sm shadow-blue-100">
                <ActivityIndicator color="#2563eb" />
              </View>
            </View>
          ) : (
            <View className="px-6 pt-8">
              <BlankSlate
                title="No rewards yet"
                description="Your earned rewards will appear here once you complete qualifying stays."
                iconName="gift"
              />
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-4">
              <ActivityIndicator color="#2563eb" />
            </View>
          ) : null
        }
        onEndReachedThreshold={0.2}
        onEndReached={handleLoadMore}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
