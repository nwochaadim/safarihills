import { BackButton } from '@/components/BackButton';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('Adim');
  const [lastName, setLastName] = useState('Eze');

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    router.replace('/auth/intro');
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.back()} />
        <Text className="mt-2 text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
          Profile
        </Text>
        <Text className="mt-2 text-3xl font-bold text-slate-900">Personal details</Text>
        <Text className="mt-1 text-sm text-slate-500">
          Update your contact details or manage your account.
        </Text>

        <View className="mt-6 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm shadow-slate-50">
          <View className="pb-4">
            <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">
              First name
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-base font-semibold text-slate-900"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              autoCapitalize="words"
            />
          </View>

          <View className="border-t border-slate-100 py-4">
            <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Last name
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-base font-semibold text-slate-900"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              autoCapitalize="words"
            />
          </View>

          <View className="border-t border-slate-100 py-4">
            <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Phone number
            </Text>
            <Text className="mt-2 text-base font-semibold text-slate-900">
              +234 812 345 6789
            </Text>
          </View>

          <View className="border-t border-slate-100 pt-4">
            <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</Text>
            <Text className="mt-2 text-base font-semibold text-slate-900">
              adim@gmail.com
            </Text>
          </View>
        </View>

        <View className="mt-6 space-y-3">
          <Pressable className="flex-row items-center justify-center gap-2 rounded-full bg-blue-600 py-4 shadow-lg shadow-blue-200">
            <Feather name="save" size={18} color="#fff" />
            <Text className="text-center text-base font-semibold text-white">Update profile</Text>
          </Pressable>
          <Pressable
            className="mt-8 flex-row items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-3 shadow-sm shadow-slate-100"
            onPress={handleSignOut}>
            <Feather name="log-out" size={18} color="#0f172a" />
            <Text className="text-center text-base font-semibold text-slate-700">
              Sign out
            </Text>
          </Pressable>
          <Pressable className="mt-2 flex-row items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 py-3 shadow-sm shadow-rose-100">
            <Feather name="trash-2" size={18} color="#b91c1c" />
            <Text className="text-center text-base font-semibold text-rose-600">
              Delete account
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
