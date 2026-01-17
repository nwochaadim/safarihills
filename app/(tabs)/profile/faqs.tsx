import { BackButton } from '@/components/BackButton';
import { BlankSlate } from '@/components/BlankSlate';
import { LOAD_FAQS } from '@/queries/loadFaqs';
import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Text,
  View,
} from 'react-native';

type FaqRecord = {
  question: string | null;
  answer: string | null;
};

type LoadFaqsResponse = {
  faqs: FaqRecord[] | null;
};

type NormalizedFaq = {
  id: string;
  question: string;
  answer: string;
};

const normalizeFaqs = (items: FaqRecord[]) =>
  items.map((item, index) => {
    const question = item?.question?.trim() || `Question ${index + 1}`;
    const answer = item?.answer?.trim() || 'Answer coming soon.';
    return {
      id: `${question}-${index}`,
      question,
      answer,
    };
  });

export default function FaqsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery<LoadFaqsResponse>(LOAD_FAQS, {
    fetchPolicy: 'cache-and-network',
  });

  const faqs = data?.faqs ?? [];
  const normalizedFaqs = useMemo<NormalizedFaq[]>(() => normalizeFaqs(faqs), [faqs]);
  const showErrorOnly = Boolean(error) && !data;

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    refetch()
      .catch(() => null)
      .finally(() => setRefreshing(false));
  }, [refreshing, refetch]);

  const toggleFaq = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderHeader = useMemo(
    () => (
      <View className="px-6 pb-2">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Support
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">FAQs</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Helpful answers about credits, bookings, and stay policies.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
          <View className="rounded-[26px] bg-white/95 p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Help center
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-900">
                  Find quick answers
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Tap a question to reveal the full answer. Pull down to refresh if needed.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Feather name="help-circle" size={22} color="#1d4ed8" />
              </View>
            </View>
          </View>
        </View>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Top questions
          </Text>
          {loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
        </View>
      </View>
    ),
    [loading, router]
  );

  if (loading && !data) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-6 pt-6">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  if (showErrorOnly) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50">
        <View className="px-6 pt-6">
          <BackButton onPress={() => router.back()} />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <BlankSlate
            title="Unable to load FAQs"
            description="Check your connection and try again."
            iconName="alert-circle"
            primaryAction={{ label: 'Try again', onPress: () => refetch() }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <FlatList
        data={normalizedFaqs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          const isOpen = item.id === expandedId;
          return (
            <Pressable
              className={`mx-6 mb-4 rounded-2xl border p-4 shadow-sm shadow-slate-100 ${
                isOpen ? 'border-blue-200 bg-blue-50/70' : 'border-slate-100 bg-white'
              }`}
              onPress={() => toggleFaq(item.id)}>
              <View className="flex-row items-start justify-between gap-4">
                <Text className="flex-1 text-base font-semibold text-slate-900">
                  {item.question}
                </Text>
                <View
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    isOpen ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                  <Feather
                    name={isOpen ? 'minus' : 'plus'}
                    size={16}
                    color={isOpen ? '#1d4ed8' : '#64748b'}
                  />
                </View>
              </View>
              {isOpen ? (
                <Text className="mt-3 text-sm leading-6 text-slate-600">{item.answer}</Text>
              ) : null}
            </Pressable>
          );
        }}
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
                title="No FAQs yet"
                description="Check back soon for updates from the Safarihills team."
                iconName="help-circle"
              />
            </View>
          )
        }
        ListFooterComponent={<View className="pb-24" />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
