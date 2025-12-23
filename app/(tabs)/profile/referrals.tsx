import { BackButton } from '@/components/BackButton';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
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

type ReferralPerson = {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt?: string | null;
};

type NormalizedReferral = {
  id: string;
  name: string;
  date: string;
};

const referralSteps = [
  { label: 'Invite a friend', detail: 'Share your code with friends who love to travel.' },
  { label: 'Friend books a stay', detail: 'They enjoy a welcome perk on their first booking.' },
  { label: 'Booking completes', detail: 'Rewards unlock after their stay is confirmed.' },
  { label: 'You earn credits', detail: 'Travel credits go straight to your wallet.' },
  { label: 'You earn points', detail: 'Points help you level up your rewards.' },
];

const FALLBACK_REFERRALS: ReferralPerson[] = [
  { id: '1', firstName: 'Chika', lastName: 'Okafor', createdAt: '2024-03-01T10:00:00+01:00' },
  { id: '2', firstName: 'Ifeanyi', lastName: 'Udo', createdAt: '2024-02-26T10:00:00+01:00' },
  { id: '3', firstName: 'Adaeze', lastName: 'Obi', createdAt: '2024-02-20T10:00:00+01:00' },
  { id: '4', firstName: 'Seyi', lastName: 'Adebayo', createdAt: '2024-02-10T10:00:00+01:00' },
  { id: '5', firstName: 'Tosin', lastName: 'Alabi', createdAt: '2024-02-02T10:00:00+01:00' },
  { id: '6', firstName: 'Binta', lastName: 'Garba', createdAt: '2024-01-25T10:00:00+01:00' },
  { id: '7', firstName: 'Tunde', lastName: 'Adeyemi', createdAt: '2024-01-18T10:00:00+01:00' },
  { id: '8', firstName: 'Ngozi', lastName: 'Nwosu', createdAt: '2024-01-10T10:00:00+01:00' },
  { id: '9', firstName: 'Kola', lastName: 'Akin', createdAt: '2024-01-03T10:00:00+01:00' },
  { id: '10', firstName: 'Zainab', lastName: 'Musa', createdAt: '2023-12-28T10:00:00+01:00' },
  { id: '11', firstName: 'Emeka', lastName: 'Obi', createdAt: '2023-12-20T10:00:00+01:00' },
  { id: '12', firstName: 'Latifa', lastName: 'Balogun', createdAt: '2023-12-12T10:00:00+01:00' },
  { id: '13', firstName: 'Ire', lastName: 'Adesina', createdAt: '2023-12-04T10:00:00+01:00' },
  { id: '14', firstName: 'Funmi', lastName: 'Oyewole', createdAt: '2023-11-28T10:00:00+01:00' },
  { id: '15', firstName: 'Gbenga', lastName: 'Bello', createdAt: '2023-11-20T10:00:00+01:00' },
];

const REFERRAL_CODE = 'SAF-2048';

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
  const [visibleReferrals, setVisibleReferrals] = useState(5);
  const modalMaxHeight = Math.min(640, Dimensions.get('window').height * 0.78);

  const normalizedReferrals = useMemo<NormalizedReferral[]>(() => {
    return FALLBACK_REFERRALS.map((ref, index) => {
      const first = ref?.firstName?.trim() ?? '';
      const last = ref?.lastName?.trim() ?? '';
      const name = (first || last ? `${first} ${last}`.trim() : null) ?? `Referral ${index + 1}`;
      const createdAt = ref?.createdAt ?? '';
      const date = createdAt ? formatReferralDate(createdAt) : 'Signed up • Date unavailable';
      return {
        id: ref?.id ?? `${index}`,
        name,
        date,
      };
    });
  }, []);

  const totalReferrals = normalizedReferrals.length;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(REFERRAL_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join me on Safarihills with my code ${REFERRAL_CODE} to earn a welcome perk on your first booking.`,
      });
    } catch {
      // no-op on cancel or failure
    }
  };

  useEffect(() => {
    setVisibleReferrals((prev) => Math.min(Math.max(5, prev), normalizedReferrals.length || 5));
  }, [normalizedReferrals.length]);

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
              <Text className="mt-2 text-4xl font-bold text-slate-900">{REFERRAL_CODE}</Text>
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
              onPress={() => setShowReferrals(true)}>
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
            style={{ maxHeight: modalMaxHeight }}>
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

            <View className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/70">
              <FlatList
                data={normalizedReferrals.slice(0, visibleReferrals)}
                keyExtractor={(item) => item.id}
                scrollEnabled
                showsVerticalScrollIndicator={false}
                onEndReachedThreshold={0.2}
                onEndReached={() =>
                  setVisibleReferrals((prev) =>
                    Math.min(prev + 5, normalizedReferrals.length)
                  )
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
