import { BackButton } from '@/components/BackButton';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ContactOption = {
  label: string;
  value: string;
  url: string;
  icon: keyof typeof Feather.glyphMap;
};

const phoneOptions: ContactOption[] = [
  {
    label: 'Primary support line',
    value: '+234 703 481 1782',
    url: 'tel:+2347034811782',
    icon: 'phone-call',
  },
  {
    label: 'Secondary support line',
    value: '+234 808 047 7129',
    url: 'tel:+2348080477129',
    icon: 'phone-call',
  },
];

const emailOption: ContactOption = {
  label: 'Email us',
  value: 'help@safarihills.app',
  url: 'mailto:help@safarihills.app',
  icon: 'mail',
};

const socialOptions: ContactOption[] = [
  {
    label: 'Instagram',
    value: '@safarihills.app',
    url: 'https://instagram.com/safarihills.app',
    icon: 'instagram',
  },
  {
    label: 'TikTok',
    value: '@safarihills.app',
    url: 'https://tiktok.com/@safarihills.app',
    icon: 'video',
  },
];

const ContactRow = ({ label, value, url, icon }: ContactOption) => {
  const handlePress = useCallback(() => {
    Linking.openURL(url).catch(() => null);
  }, [url]);

  return (
    <Pressable
      className="flex-row items-center justify-between px-4 py-4"
      onPress={handlePress}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
          <Feather name={icon} size={18} color="#1d4ed8" />
        </View>
        <View>
          <Text className="text-base font-semibold text-slate-900">{value}</Text>
          <Text className="text-sm text-slate-500">{label}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color="#94a3b8" />
    </Pressable>
  );
};

export default function HelpScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Support
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Get help</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Reach our team by phone, email, or social media.
        </Text>

        <View className="mt-6 rounded-3xl border border-blue-100 bg-blue-600 p-[1px] shadow-md shadow-blue-200">
          <View className="rounded-[26px] bg-white/95 p-5">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">
                  Support team
                </Text>
                <Text className="mt-2 text-2xl font-bold text-slate-900">
                  We are here for you
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Tap any option below to connect with the Safarihills team.
                </Text>
              </View>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <Feather name="headphones" size={22} color="#1d4ed8" />
              </View>
            </View>
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Speak with support
          </Text>
          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-50">
            {phoneOptions.map((option, index) => (
              <View
                key={option.value}
                className={index === 0 ? '' : 'border-t border-slate-100'}>
                <ContactRow {...option} />
              </View>
            ))}
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Email us
          </Text>
          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-50">
            <ContactRow {...emailOption} />
          </View>
        </View>

        <View className="mt-8">
          <Text className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
            Follow us
          </Text>
          <View className="mt-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-50">
            {socialOptions.map((option, index) => (
              <View
                key={option.label}
                className={index === 0 ? '' : 'border-t border-slate-100'}>
                <ContactRow {...option} />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
