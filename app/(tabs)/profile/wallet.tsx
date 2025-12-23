import { BackButton } from '@/components/BackButton';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BlankSlate } from '@/components/BlankSlate';

type BankAccount = {
  id: string;
  bank: string;
  accountNumber: string;
  label: string;
};

type NormalizedTransaction = {
  id: string;
  type: 'credit' | 'debit';
  title: string;
  amount: number;
  date: string;
  pending: boolean;
};

const defaultAccounts: BankAccount[] = [
  { id: '1', bank: 'GTBank', accountNumber: '**** 4521', label: 'Primary' },
  { id: '2', bank: 'Zenith', accountNumber: '**** 8892', label: 'Savings' },
];

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

export default function WalletScreen() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<'checking' | 'signed-in' | 'signed-out'>(
    'checking'
  );
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [accounts, setAccounts] = useState<BankAccount[]>(defaultAccounts);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccounts[0]?.id);
  const [showAccountOptions, setShowAccountOptions] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const handleBackToProfile = () => {
    router.replace('/(tabs)/profile');
  };

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

  const balance = FALLBACK_WALLET.balance;

  const selectedAccount = useMemo(
    () => accounts.find((acct) => acct.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  const transactions = useMemo<NormalizedTransaction[]>(() => FALLBACK_WALLET.transactions, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleAddAccount = () => {
    if (!newBankName.trim() || !newAccountNumber.trim()) return;
    const last4 = newAccountNumber.slice(-4).padStart(4, '0');
    const newAccount: BankAccount = {
      id: Date.now().toString(),
      bank: newBankName.trim(),
      accountNumber: `**** ${last4}`,
      label: 'Added',
    };
    setAccounts((prev) => [...prev, newAccount]);
    setSelectedAccountId(newAccount.id);
    setNewBankName('');
    setNewAccountNumber('');
    setAddingAccount(false);
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts((prev) => {
      const nextAccounts = prev.filter((acct) => acct.id !== id);
      if (selectedAccountId === id) {
        setSelectedAccountId(nextAccounts[0]?.id ?? '');
      }
      return nextAccounts;
    });
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
              description="Top up your balance, track transactions, and manage funding accounts."
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
              Track your balance, top up securely, and manage funding accounts.
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
                {transactions.map((txn, index) => {
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
                          <Text className="text-base font-semibold text-slate-900">{txn.title}</Text>
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
                })}
              </View>
            </View>

            <View className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-slate-900">Funding accounts</Text>
                <Pressable
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5"
                  onPress={() => setAddingAccount((prev) => !prev)}>
                  <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
                    {addingAccount ? 'Close' : 'Add'}
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-1 text-sm text-slate-500">
                Keep your funding sources organized and up to date.
              </Text>

              {addingAccount ? (
                <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    New bank account
                  </Text>
                  <TextInput
                    className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                    placeholder="Bank name"
                    placeholderTextColor="#94a3b8"
                    value={newBankName}
                    onChangeText={setNewBankName}
                  />
                  <TextInput
                    className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
                    placeholder="Account number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    value={newAccountNumber}
                    onChangeText={setNewAccountNumber}
                  />
                  <Pressable
                    className="mt-4 items-center justify-center rounded-full bg-blue-600 py-3"
                    onPress={handleAddAccount}>
                    <Text className="text-base font-semibold text-white">Save account</Text>
                  </Pressable>
                </View>
              ) : null}

              <FlatList
                className="mt-4"
                scrollEnabled={false}
                data={accounts}
                keyExtractor={(item) => item.id}
                ItemSeparatorComponent={() => <View className="h-3" />}
                renderItem={({ item }) => (
                  <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <View>
                      <Text className="text-base font-semibold text-slate-900">{item.bank}</Text>
                      <Text className="text-sm text-slate-500">
                        {item.accountNumber} - {item.label}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        className={`rounded-full border px-3 py-1 ${
                          selectedAccountId === item.id
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-slate-200 bg-white'
                        }`}
                        onPress={() => setSelectedAccountId(item.id)}>
                        <Text
                          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
                            selectedAccountId === item.id ? 'text-blue-700' : 'text-slate-600'
                          }`}>
                          Default
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRemoveAccount(item.id)}
                        className="rounded-full border border-rose-100 bg-rose-50 p-2">
                        <Feather name="trash-2" size={18} color="#e11d48" />
                      </Pressable>
                    </View>
                  </View>
                )}
              />
            </View>
          </ScrollView>

          <Modal
            animationType="slide"
            transparent
            visible={topUpModalVisible}
            onRequestClose={() => setTopUpModalVisible(false)}>
            <View className="flex-1 justify-end bg-black/40">
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

                <View className="mt-6">
                  <Text className="text-sm font-semibold text-slate-700">Funding account</Text>
                  <Pressable
                    className="mt-2 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3"
                    onPress={() => setShowAccountOptions((prev) => !prev)}>
                    <View>
                      <Text className="text-base font-semibold text-slate-900">
                        {selectedAccount?.bank ?? 'Select bank'}
                      </Text>
                      <Text className="text-sm text-slate-500">
                        {selectedAccount?.accountNumber ?? 'Choose where to charge'}
                      </Text>
                    </View>
                    <Feather
                      name={showAccountOptions ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color="#0f172a"
                    />
                  </Pressable>
                  {showAccountOptions ? (
                    <View className="mt-2 rounded-2xl border border-slate-200 bg-white">
                      {accounts.map((acct, index) => (
                        <Pressable
                          key={acct.id}
                          className={`flex-row items-center justify-between px-4 py-3 ${
                            index !== 0 ? 'border-t border-slate-100' : ''
                          }`}
                          onPress={() => {
                            setSelectedAccountId(acct.id);
                            setShowAccountOptions(false);
                          }}>
                          <View>
                            <Text className="text-base font-semibold text-slate-900">
                              {acct.bank}
                            </Text>
                            <Text className="text-sm text-slate-500">
                              {acct.accountNumber} - {acct.label}
                            </Text>
                          </View>
                          {selectedAccountId === acct.id ? (
                            <Feather name="check" size={18} color="#1d4ed8" />
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>

                <Pressable className="mt-8 items-center justify-center rounded-full bg-blue-600 py-4 shadow-sm shadow-blue-200">
                  <Text className="text-base font-semibold text-white">Confirm top up</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}
    </SafeAreaView>
  );
}
