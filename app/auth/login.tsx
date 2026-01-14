import { useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import { LOGIN_GUEST } from '@/mutations/loginGuest';
import { maybePromptForPushNotifications } from '@/lib/pushNotifications';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const { error: errorParam } = useLocalSearchParams<{ error?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginGuest] = useMutation(LOGIN_GUEST);

  useEffect(() => {
    if (!errorParam) return;
    const message = Array.isArray(errorParam) ? errorParam[0] : errorParam;
    if (message && message !== error) {
      setError(message);
    }
  }, [errorParam, error]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Enter your email and password to continue.');
      return;
    }

    if (!emailRegex.test(trimmedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data } = await loginGuest({
        variables: {
          input: {
            email: trimmedEmail,
            password: trimmedPassword,
          },
        },
      });
      const response = data?.loginGuest;
      const nextStep = response?.nextStep ?? null;
      const errors = response?.errors;
      const errorMessage =
        Array.isArray(errors) ? errors.join(' ') : errors ? String(errors) : null;

      if (nextStep === 'otp') {
        router.replace({
          pathname: '/auth/otp',
          params: {
            email: trimmedEmail,
            error: errorMessage ?? undefined,
          },
        });
        return;
      }

      if (nextStep === 'password_reset') {
        router.replace('/auth/new-password');
        return;
      }

      if (response?.token) {
        await SecureStore.setItemAsync('authToken', response.token);
        void maybePromptForPushNotifications();
        router.replace('/(tabs)/explore');
        return;
      }

      if (errorMessage) {
        setError(errorMessage);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to sign in right now.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-6 pb-10 pt-8">
          <Pressable
            className="mb-4 w-12 items-center justify-center rounded-full border border-blue-100 bg-white/80 py-3"
            onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#1d4ed8" />
          </Pressable>

          <Text className="text-base font-semibold uppercase tracking-[0.4em] text-blue-500">
            Safarihills
          </Text>
          <Text className="mt-3 text-4xl font-bold text-slate-900">Log in to continue</Text>
          <Text className="mt-2 text-base text-slate-500">
            Unlock new offers, track rewards, and keep your bookings effortless.
          </Text>

          <View className="mt-10 flex-col gap-6">
            <View>
              <Text className="text-sm font-medium text-slate-600">Email</Text>
              <TextInput
                className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-4 text-base text-slate-900"
                autoCapitalize="none"
                inputMode="email"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setError(null);
                }}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">Password</Text>
              <View className="mt-2 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50/50 px-4">
                <TextInput
                  className="flex-1 py-4 text-base text-slate-900"
                  secureTextEntry={!showPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setError(null);
                  }}
                />
                <Pressable
                  hitSlop={12}
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="ml-2 p-1"
                  accessibilityLabel="Toggle password visibility">
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#1e3a8a" />
                </Pressable>
              </View>
            </View>
          </View>

          <View className="mt-4 flex-row justify-end">
            <Pressable onPress={() => router.push('/auth/forgot-password')}>
              <Text className="text-sm font-semibold text-blue-600">Forgot password?</Text>
            </Pressable>
          </View>

          {error ? (
            <Text className="mt-4 text-center text-sm font-medium text-red-500">{error}</Text>
          ) : null}

          <Pressable
            className={`mt-10 items-center justify-center rounded-full py-4 ${
              isSubmitting ? 'bg-blue-300' : 'bg-blue-600'
            }`}
            onPress={handleLogin}
            disabled={isSubmitting}>
            <Text
              className={`text-base font-semibold ${
                isSubmitting ? 'text-white/80' : 'text-white'
              }`}>
              {isSubmitting ? 'Signing in...' : 'Log in'}
            </Text>
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-sm text-slate-500">New here?</Text>
            <Pressable className="ml-2" onPress={() => router.push('/auth/sign-up')}>
              <Text className="text-sm font-semibold text-blue-600">Create account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
