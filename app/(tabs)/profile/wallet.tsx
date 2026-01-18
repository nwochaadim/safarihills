import { BackButton } from '@/components/BackButton';
import { TOPUP_WALLET_BALANCE } from '@/mutations/topupWalletBalance';
import { WALLET_AND_TRANSACTIONS } from '@/queries/walletAndTransactions';
import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { BlankSlate } from '@/components/BlankSlate';
import { AuthStatus } from '@/lib/authStatus';

type NormalizedTransaction = {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  amount: number;
  date: string;
  pending: boolean;
};

type WalletTransaction = {
  id: string | null;
  transactionType: string | null;
  name: string | null;
  formattedAmount: string | null;
  date: string | null;
};

type WalletQueryResponse = {
  wallet: {
    balance: number | null;
    transactions: WalletTransaction[] | null;
  } | null;
};

type WalletQueryVariables = {
  limit?: number | null;
  offset?: number | null;
};

const FALLBACK_WALLET = {
  balance: 245000,
  transactions: [
    {
      id: 't1',
      title: 'Wallet top up',
      amount: 80000,
      type: 'credit' as const,
      pending: false,
      date: 'Mar 02, 2024 - 10:14 AM',
    },
    {
      id: 't2',
      title: 'Reservation hold',
      amount: 45000,
      type: 'debit' as const,
      pending: true,
      date: 'Feb 28, 2024 - 04:22 PM',
    },
    {
      id: 't3',
      title: 'Wallet top up',
      amount: 120000,
      type: 'credit' as const,
      pending: false,
      date: 'Feb 20, 2024 - 09:03 AM',
    },
    {
      id: 't4',
      title: 'Booking fee',
      amount: 30000,
      type: 'debit' as const,
      pending: true,
      date: 'Feb 12, 2024 - 01:45 PM',
    },
  ],
};

const formatAmountInput = (value: string) => {
  const digitsOnly = value.replace(/[^\d]/g, '');
  if (!digitsOnly) return '';
  return Number(digitsOnly).toLocaleString();
};

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const parseFormattedAmount = (value: string | null | undefined) => {
  if (!value) return 0;
  const cleaned = value.replace(/[^\d.]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const LATEST_TRANSACTIONS_LIMIT = 5;
const PAYSTACK_PUBLIC_KEY = process.env.EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';
const PAYSTACK_FALLBACK_EMAIL = 'no-reply@safarihills.app';

type WalletTopupResponse = {
  createWalletTopup: {
    amount: number | null;
    reference: string | null;
    state: string | null;
    user: {
      id: string | null;
      name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  } | null;
};

type WalletTopupVariables = {
  amount: number;
};

export default function WalletScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [paystackVisible, setPaystackVisible] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<{
    email: string;
    reference: string;
    amount: number;
    phone: string;
    name: string;
  } | null>(null);
  const [topupError, setTopupError] = useState<string | null>(null);

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

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

  const latestVariables = useMemo<WalletQueryVariables>(
    () => ({ limit: LATEST_TRANSACTIONS_LIMIT, offset: 0 }),
    []
  );

  const { data, refetch } = useQuery<WalletQueryResponse, WalletQueryVariables>(
    WALLET_AND_TRANSACTIONS,
    {
      variables: latestVariables,
      skip: authStatus !== 'signed-in',
      notifyOnNetworkStatusChange: true,
    }
  );
  const [createWalletTopup, { loading: isCreatingTopup }] = useMutation<
    WalletTopupResponse,
    WalletTopupVariables
  >(TOPUP_WALLET_BALANCE);

  const walletData = data?.wallet ?? null;
  const balance = walletData?.balance ?? FALLBACK_WALLET.balance;

  const transactions = useMemo<NormalizedTransaction[]>(() => {
    if (!walletData?.transactions) return FALLBACK_WALLET.transactions;
    return walletData.transactions.map((txn, index) => {
      const type =
        txn?.transactionType?.toLowerCase() === 'debit' ? 'debit' : 'credit';
      const title = txn?.name ?? `Transaction ${index + 1}`;
      const amount = parseFormattedAmount(txn?.formattedAmount);
      const date = txn?.date ?? 'Date unavailable';
      return {
        id: txn?.id ?? `txn-${index + 1}`,
        type,
        title,
        amount,
        date,
        pending: false,
      };
    });
  }, [walletData?.transactions]);
  const hasTransactions = transactions.length > 0;

  const paystackReference = paystackConfig?.reference ?? '';
  const paystackAmount = paystackConfig?.amount ?? 0;
  const paystackHtml = useMemo(() => {
    if (!paystackConfig) return '';
    const configJson = JSON.stringify({
      key: PAYSTACK_PUBLIC_KEY,
      email: paystackConfig.email,
      amount: paystackAmount,
      currency: 'NGN',
      ref: paystackReference,
      metadata: {
        custom_fields: [
          { display_name: 'Name', variable_name: 'name', value: paystackConfig.name },
          { display_name: 'Phone', variable_name: 'phone', value: paystackConfig.phone },
        ],
      },
    });
    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <script src="https://js.paystack.co/v1/inline.js"></script>
          <style>
            html, body { margin: 0; padding: 0; background: #ffffff; }
          </style>
        </head>
        <body>
          <script>
            const config = ${configJson};
            config.callback = function(response) {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'success',
                reference: response.reference
              }));
            };
            config.onClose = function() {
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'close'
              }));
            };
            const handler = PaystackPop.setup(config);
            handler.openIframe();
          </script>
        </body>
      </html>
    `;
  }, [paystackAmount, paystackConfig, paystackReference]);

  const handleRefresh = () => {
    if (authStatus !== 'signed-in') return;
    setRefreshing(true);
    refetch({ limit: LATEST_TRANSACTIONS_LIMIT, offset: 0 })
      .catch(() => null)
      .finally(() => setRefreshing(false));
  };

  const handlePaystackMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'close') {
        setPaystackVisible(false);
      }
      if (payload?.type === 'success') {
        setPaystackVisible(false);
        refetch({ limit: LATEST_TRANSACTIONS_LIMIT, offset: 0 }).catch(() => null);
      }
    } catch {
      setPaystackVisible(false);
    }
  };

  const handleTopup = async () => {
    const normalized = amount.replace(/[^\d.]/g, '');
    const parsedAmount = Number.parseFloat(normalized);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setTopupError('Enter a valid amount to top up.');
      return;
    }
    if (!PAYSTACK_PUBLIC_KEY) {
      setTopupError('Paystack is unavailable right now.');
      return;
    }
    setTopupError(null);
    try {
      const { data: response } = await createWalletTopup({
        variables: { amount: parsedAmount },
      });
      const result = response?.createWalletTopup;
      const reference = result?.reference?.trim() ?? '';
      const email = result?.user?.email?.trim() || PAYSTACK_FALLBACK_EMAIL;
      const phone = result?.user?.phone?.trim() || '—';
      const name = result?.user?.name?.trim() || 'Guest';
      const topupAmount = result?.amount ?? 0;
      const amountInKobo = Math.max(Math.round(topupAmount * 100), 0);
      if (!reference || amountInKobo <= 0) {
        setTopupError('Unable to start top up right now.');
        return;
      }
      setPaystackConfig({
        email,
        reference,
        phone,
        name,
        amount: amountInKobo,
      });
      setTopUpModalVisible(false);
      setPaystackVisible(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to start top up right now.';
      setTopupError(message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      {authStatus === 'signed-out' ? (
        <View className="flex-1 px-6 pt-2">
          <BackButton onPress={handleBackToProfile} />
          <View className="flex-1 items-center justify-center px-2">
            <BlankSlate
              title="Sign in to view wallet"
              description="Top up your balance and track transactions in one place."
              iconName="credit-card"
              primaryAction={{ label: 'Sign in', onPress: () => router.push('/auth/login') }}
              secondaryAction={{ label: 'Create account', onPress: () => router.push('/auth/sign-up') }}
            />
          </View>
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
            <BackButton onPress={handleBackToProfile} />
            <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
              Wallet
            </Text>
            <Text className="mt-2 text-3xl font-bold text-slate-900">Wallet balance</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Track your balance and top up securely.
            </Text>

            <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
              <View className="rounded-[26px] bg-white/90 p-5">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-500">
                      Available balance
                    </Text>
                    <Text className="mt-2 text-4xl font-bold text-slate-900">
                      ₦{balance.toLocaleString()}
                    </Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm text-slate-500">
                  Top up your wallet instantly or review your transactions.
                </Text>

                <View className="mt-5 items-center">
                  <Pressable
                    className="w-full max-w-[260px] items-center justify-center rounded-full bg-blue-600 py-4 shadow-sm shadow-blue-300"
                    onPress={() => setTopUpModalVisible(true)}>
                    <Text className="text-base font-semibold text-white">Top up</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-slate-900">Latest transactions</Text>
                <Pressable onPress={() => router.push('/profile/transactions')}>
                  <Text className="text-sm font-semibold text-blue-700">View all transactions</Text>
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-slate-500">
                Recent top ups and spending activity.
              </Text>

              <View className="mt-4">
                {hasTransactions ? (
                  transactions.map((txn, index) => {
                    const isCredit = txn.type === 'credit';
                    const icon = isCredit ? 'arrow-down-left' : 'arrow-up-right';
                    const amountColor = isCredit ? 'text-green-600' : 'text-rose-600';
                    const pillBg = isCredit ? 'bg-green-50' : 'bg-rose-50';
                    const iconColor = isCredit ? '#16a34a' : '#e11d48';

                    return (
                      <View
                        key={txn.id}
                        className={`flex-row items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 ${
                          index === 0 ? '' : 'mt-3'
                        }`}>
                        <View className="flex-row items-center gap-3">
                          <View className={`rounded-full p-3 ${pillBg}`}>
                            <Feather name={icon} size={18} color={iconColor} />
                          </View>
                          <View>
                            <Text className="text-base font-semibold text-slate-900">
                              {txn.title}
                            </Text>
                            <Text className="text-sm text-slate-500">{txn.date}</Text>
                            {txn.pending ? (
                              <Text className="text-xs font-semibold text-amber-600">
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
                  })
                ) : (
                  <View className="items-center rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-6">
                    <Text className="text-sm font-semibold text-slate-600">
                      No transactions available.
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      Your wallet activity will show up here.
                    </Text>
                  </View>
                )}
              </View>
            </View>

          </ScrollView>

          <Modal
            animationType="slide"
            transparent
            visible={topUpModalVisible}
            onRequestClose={() => setTopUpModalVisible(false)}>
            <KeyboardAvoidingView
              className="flex-1 justify-end bg-black/40"
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
              <View className="rounded-t-[32px] bg-white px-6 pb-10 pt-6">
                <View className="mb-6 h-1 w-14 self-center rounded-full bg-slate-200" />
                <View className="flex-row items-start justify-between">
                  <View>
                    <Text className="text-2xl font-bold text-slate-900">Top up balance</Text>
                    <Text className="mt-1 text-sm text-slate-500">
                      Fund your Safarihills wallet from a connected account.
                    </Text>
                  </View>
                  <Pressable onPress={() => setTopUpModalVisible(false)}>
                    <Feather name="x" size={22} color="#0f172a" />
                  </Pressable>
                </View>

                <View className="mt-6">
                  <Text className="text-sm font-semibold text-slate-700">Amount</Text>
                  <View className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/70 px-4">
                    <TextInput
                      className="py-4 text-xl font-semibold text-slate-900"
                      placeholder="Enter amount"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                      value={amount}
                      onChangeText={(value) => setAmount(formatAmountInput(value))}
                    />
                  </View>
                </View>

                {topupError ? (
                  <View className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
                    <Text className="text-sm font-semibold text-rose-600">
                      {topupError}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  className={`mt-8 items-center justify-center rounded-full py-4 shadow-sm shadow-blue-200 ${
                    isCreatingTopup ? 'bg-slate-300' : 'bg-blue-600'
                  }`}
                  disabled={isCreatingTopup}
                  onPress={handleTopup}>
                  <Text className="text-base font-semibold text-white">Top up</Text>
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
      <Modal
        visible={paystackVisible}
        animationType="slide"
        onRequestClose={() => setPaystackVisible(false)}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-6 pb-4 pt-16">
            <Text className="text-base font-semibold text-slate-900">Pay with Paystack</Text>
            <Pressable
              className="rounded-full border border-slate-200 px-3 py-1.5"
              onPress={() => setPaystackVisible(false)}>
              <Text className="text-xs font-semibold text-slate-600">Close</Text>
            </Pressable>
          </View>
          <WebView
            key={`${paystackReference}-${paystackAmount}`}
            originWhitelist={['*']}
            source={{ html: paystackHtml }}
            onMessage={handlePaystackMessage}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
