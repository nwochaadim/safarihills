import { BackButton } from '@/components/BackButton';
import { WALLET_AND_TRANSACTIONS } from '@/queries/walletAndTransactions';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@apollo/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';

type RemoteTransaction = {
  id?: string | null;
  name?: string | null;
  formattedAmount?: string | null;
  transactionType?: string | null;
  state?: string | null;
  date?: string | null;
  createdAt?: string | null;
  amountCents?: number | null;
  reference?: string | null;
};

type NormalizedTransaction = {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  amount: number;
  date: string;
  reference: string;
  pending: boolean;
};

type WalletQueryResponse = {
  wallet: {
    balance: number | null;
    transactions: RemoteTransaction[] | null;
  } | null;
};

type WalletQueryVariables = {
  limit?: number | null;
  offset?: number | null;
};

const PAGE_SIZE = 10;

const FALLBACK_TRANSACTIONS: RemoteTransaction[] = [
  {
    id: 't1',
    name: 'Wallet top up',
    amountCents: 8000000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2024-03-02T10:14:00Z',
    reference: 'REF-1042',
  },
  {
    id: 't2',
    name: 'Reservation hold',
    amountCents: 4500000,
    transactionType: 'debit',
    state: 'pending',
    createdAt: '2024-02-28T16:22:00Z',
    reference: 'REF-1043',
  },
  {
    id: 't3',
    name: 'Wallet top up',
    amountCents: 12000000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2024-02-20T09:03:00Z',
    reference: 'REF-1044',
  },
  {
    id: 't4',
    name: 'Booking fee',
    amountCents: 3000000,
    transactionType: 'debit',
    state: 'pending',
    createdAt: '2024-02-12T13:45:00Z',
    reference: 'REF-1045',
  },
  {
    id: 't5',
    name: 'Payout transfer',
    amountCents: 25600000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2024-02-05T11:18:00Z',
    reference: 'REF-1046',
  },
  {
    id: 't6',
    name: 'Bank withdrawal',
    amountCents: 6000000,
    transactionType: 'debit',
    state: 'completed',
    createdAt: '2024-01-29T08:41:00Z',
    reference: 'REF-1047',
  },
  {
    id: 't7',
    name: 'Commission bonus',
    amountCents: 9800000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2024-01-21T15:29:00Z',
    reference: 'REF-1048',
  },
  {
    id: 't8',
    name: 'Service charge',
    amountCents: 1500000,
    transactionType: 'debit',
    state: 'completed',
    createdAt: '2024-01-18T12:12:00Z',
    reference: 'REF-1049',
  },
  {
    id: 't9',
    name: 'Referral reward',
    amountCents: 3500000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2024-01-12T17:30:00Z',
    reference: 'REF-1050',
  },
  {
    id: 't10',
    name: 'Bank withdrawal',
    amountCents: 4200000,
    transactionType: 'debit',
    state: 'completed',
    createdAt: '2024-01-09T10:05:00Z',
    reference: 'REF-1051',
  },
  {
    id: 't11',
    name: 'Wallet top up',
    amountCents: 5000000,
    transactionType: 'credit',
    state: 'completed',
    createdAt: '2023-12-29T09:45:00Z',
    reference: 'REF-1052',
  },
  {
    id: 't12',
    name: 'Reservation hold',
    amountCents: 2800000,
    transactionType: 'debit',
    state: 'pending',
    createdAt: '2023-12-20T14:20:00Z',
    reference: 'REF-1053',
  },
];

const parseFormattedAmount = (value: string | null | undefined) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatTransactionDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${datePart} • ${timePart}`;
};

export default function TransactionsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [remoteTransactions, setRemoteTransactions] = useState<RemoteTransaction[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data, fetchMore, refetch } = useQuery<WalletQueryResponse, WalletQueryVariables>(
    WALLET_AND_TRANSACTIONS,
    {
      variables: { limit: PAGE_SIZE, offset: 0 },
      notifyOnNetworkStatusChange: true,
    }
  );

  const fetchedTransactions = data?.wallet?.transactions;
  const hasRemoteData = Array.isArray(fetchedTransactions);

  const transactions = useMemo<NormalizedTransaction[]>(() => {
    const base = hasRemoteData ? remoteTransactions : FALLBACK_TRANSACTIONS;

    return base.map((txn, index) => {
      const type =
        txn?.transactionType?.toLowerCase() === 'debit' ? 'debit' : 'credit';
      const amountValue = txn?.formattedAmount
        ? parseFormattedAmount(txn.formattedAmount)
        : Math.max(0, txn?.amountCents ?? 0) / 100;
      const dateLabel = txn?.date
        ? txn.date
        : txn?.createdAt
          ? formatTransactionDate(txn.createdAt)
          : 'Date unavailable';
      const reference =
        txn?.reference ??
        (txn?.id ? `REF-${txn.id}` : `REF-${index + 1}`);
      const pending = txn?.state?.toLowerCase() === 'pending';

      return {
        id: txn?.id ?? `txn-${index + 1}`,
        type,
        title: txn?.name ?? `Transaction ${index + 1}`,
        amount: amountValue,
        date: dateLabel,
        reference,
        pending,
      };
    });
  }, [hasRemoteData, remoteTransactions]);

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setHasMore(true);
    refetch({ limit: PAGE_SIZE, offset: 0 })
      .then((response) => {
        const next = response.data?.wallet?.transactions ?? [];
        setRemoteTransactions(next);
        setHasMore(next.length >= PAGE_SIZE);
      })
      .catch(() => null)
      .finally(() => setRefreshing(false));
  }, [refreshing, refetch]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || refreshing || !hasMore) return;
    setLoadingMore(true);
    fetchMore({
      variables: {
        limit: PAGE_SIZE,
        offset: remoteTransactions.length,
      },
    })
      .then((response) => {
        const next = response.data?.wallet?.transactions ?? [];
        if (!next.length) {
          setHasMore(false);
          return;
        }
        setRemoteTransactions((prev) => {
          const seen = new Set(prev.map((txn) => txn.id ?? ''));
          const merged = [...prev];
          next.forEach((txn) => {
            const key = txn.id ?? '';
            if (key && seen.has(key)) return;
            merged.push(txn);
            if (key) seen.add(key);
          });
          return merged;
        });
        if (next.length < PAGE_SIZE) {
          setHasMore(false);
        }
      })
      .catch(() => null)
      .finally(() => setLoadingMore(false));
  }, [fetchMore, hasMore, loadingMore, refreshing, remoteTransactions.length]);

  useEffect(() => {
    if (!hasRemoteData) return;
    setRemoteTransactions(fetchedTransactions ?? []);
    setHasMore((fetchedTransactions ?? []).length >= PAGE_SIZE);
  }, [fetchedTransactions, hasRemoteData]);

  const loadMoreThrottleRef = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (loadingMore || refreshing || !hasMore) return;
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const distanceFromBottom =
        contentSize.height - (contentOffset.y + layoutMeasurement.height);
      if (distanceFromBottom < 200) {
        const now = Date.now();
        if (now - loadMoreThrottleRef.current < 800) return;
        loadMoreThrottleRef.current = now;
        handleLoadMore();
      }
    },
    [handleLoadMore, hasMore, loadingMore, refreshing]
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}>
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Wallet
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Transactions</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Review payouts, withdrawals, and other activity on your account.
        </Text>

        <View className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-100">
          {transactions.map((txn, index) => {
            const isCredit = txn.type === 'credit';
            const amountColor = isCredit ? 'text-green-600' : 'text-rose-600';

            return (
              <View
                key={txn.id}
                className={`flex-row items-center justify-between py-4 ${
                  index !== 0 ? 'border-t border-slate-100' : ''
                }`}>
                <View className="flex-row items-center gap-3">
                  <View
                    className={`rounded-full p-3 ${
                      isCredit ? 'bg-green-50' : 'bg-rose-50'
                    }`}>
                    <Feather
                      name={isCredit ? 'arrow-down-left' : 'arrow-up-right'}
                      size={18}
                      color={isCredit ? '#16a34a' : '#e11d48'}
                    />
                  </View>
                  <View>
                    <Text className="text-base font-semibold text-slate-900">
                      {txn.title}
                    </Text>
                    <Text className="text-sm text-slate-500">{txn.date}</Text>
                    {txn.pending ? (
                      <Text className="mt-1 text-xs font-semibold text-amber-600">
                        Processing...
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text className={`text-base font-semibold ${amountColor}`}>
                  {isCredit ? '+' : '-'}₦{txn.amount.toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
