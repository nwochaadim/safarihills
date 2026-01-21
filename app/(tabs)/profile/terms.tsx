import { BackButton } from '@/components/BackButton';
import { BlankSlate } from '@/components/BlankSlate';
import { LOAD_SERVICE_TERMS } from '@/queries/loadServiceTerms';
import { useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ServiceTerm = {
  style?: string | null;
  text?: string | null;
};

type ServiceTermsResponse = {
  serviceTerms?: ServiceTerm[] | null;
};

type NormalizedTerm = {
  id: string;
  style: 'heading' | 'text' | 'bullet' | 'bulletDouble';
  text: string;
};

const normalizeTermText = (style: NormalizedTerm['style'], text: string) => {
  if (style === 'bullet' || style === 'bulletDouble') {
    return text.replace(/^\s*\u2022\s*/, '').trim();
  }
  return text.trim();
};

export default function TermsScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const { data, loading, error, refetch } = useQuery<ServiceTermsResponse>(LOAD_SERVICE_TERMS, {
    fetchPolicy: 'cache-and-network',
  });

  const rawTerms = data?.serviceTerms;
  const normalizedTerms = useMemo<NormalizedTerm[]>(() => {
    if (!Array.isArray(rawTerms)) return [];
    return rawTerms
      .map((term, index) => {
        const rawStyle = term?.style?.toLowerCase() ?? 'text';
        const style: NormalizedTerm['style'] =
          rawStyle === 'heading' ||
          rawStyle === 'text' ||
          rawStyle === 'bullet' ||
          rawStyle === 'bulletdouble'
            ? rawStyle === 'bulletdouble'
              ? 'bulletDouble'
              : rawStyle
            : 'text';
        const text = typeof term?.text === 'string' ? term.text : '';
        const cleaned = normalizeTermText(style, text);
        return {
          id: `${style}-${index}-${cleaned.slice(0, 12)}`,
          style,
          text: cleaned,
        };
      })
      .filter((term) => term.text.length > 0);
  }, [rawTerms]);

  const showErrorOnly = Boolean(error) && !data;

  const handleRefresh = useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    refetch()
      .catch(() => null)
      .finally(() => setRefreshing(false));
  }, [refreshing, refetch]);

  const renderHeader = useMemo(
    () => (
      <View className="px-6 pb-2">
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Legal
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Terms of use</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Please review the rules and responsibilities for using Safarihills.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
          <View className="rounded-[26px] bg-white/95 p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Safarihills policy
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-900">
                  Know the essentials
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  These terms outline bookings, refunds, and platform responsibilities.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Feather name="file-text" size={22} color="#1d4ed8" />
              </View>
            </View>
          </View>
        </View>
      </View>
    ),
    [router]
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
            title="Unable to load terms"
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
        data={normalizedTerms}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => {
          if (item.style === 'heading') {
            return (
              <View className="mx-6 mt-6 flex-row items-start gap-3">
                <View className="mt-1 h-6 w-1 rounded-full bg-blue-500/80" />
                <Text className="flex-1 text-lg font-semibold text-slate-900">
                  {item.text}
                </Text>
              </View>
            );
          }
          if (item.style === 'bullet' || item.style === 'bulletDouble') {
            const isNested = item.style === 'bulletDouble';
            return (
              <View
                className={`mx-6 mt-2 flex-row items-start gap-3 ${
                  isNested ? 'pl-6' : ''
                }`}>
                <View
                  className={`mt-2 h-2 w-2 rounded-full ${
                    isNested ? 'border border-blue-300' : 'bg-blue-500'
                  }`}
                />
                <Text className="flex-1 text-sm leading-6 text-slate-600">
                  {item.text}
                </Text>
              </View>
            );
          }
          return (
            <Text className="mx-6 mt-2 text-sm leading-6 text-slate-600">
              {item.text}
            </Text>
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
                title="Terms are unavailable"
                description="Check back soon for updated service terms."
                iconName="file-text"
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
