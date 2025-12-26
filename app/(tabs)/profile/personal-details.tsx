import { BackButton } from '@/components/BackButton';
import { useMutation, useQuery } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { UPDATE_PERSONAL_INFO } from '@/mutations/updatePersonalInfo';
import { GET_USER_INFO_V2 } from '@/queries/getUserInfoV2';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [hasHydrated, setHasHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, refetch } = useQuery(GET_USER_INFO_V2);
  const [updatePersonalInfo, { loading: isUpdating }] = useMutation(UPDATE_PERSONAL_INFO);

  useFocusEffect(
    useCallback(() => {
      setHasHydrated(false);
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (hasHydrated) return;
    const user = data?.user;
    if (!user) return;
    setFirstName(user.firstName ?? '');
    setLastName(user.lastName ?? '');
    setPhone(user.phone ?? '');
    setEmail(user.email ?? '');
    setHasHydrated(true);
  }, [data, hasHydrated]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setHasHydrated(false);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    await SecureStore.deleteItemAsync('authToken');
    router.replace('/auth/login');
  };

  const handleUpdateProfile = async () => {
    if (isUpdating) return;
    try {
      const { data: response } = await updatePersonalInfo({
        variables: {
          input: {
            firstName: firstName.trim(),
            lastName: lastName.trim()
          },
        },
      });
      const updated = response?.updatePersonalInfoV2;
      if (updated) {
        setFirstName(updated.firstName ?? firstName);
        setLastName(updated.lastName ?? lastName);
        setPhone(updated.phone ?? phone);
        setEmail(updated.email ?? email);
        Alert.alert('Profile updated', 'Your personal details were saved.');
      }
    } catch {
      // Keep the current values if the update fails.
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }>
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
              {phone}
            </Text>
          </View>

          <View className="border-t border-slate-100 pt-4">
            <Text className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</Text>
            <Text className="mt-2 text-base font-semibold text-slate-900">
              {email}
            </Text>
          </View>
        </View>

        <View className="mt-6 space-y-3">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-full bg-blue-600 py-4 shadow-lg shadow-blue-200"
            onPress={handleUpdateProfile}
            disabled={isUpdating}>
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
