import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEmailValid = useMemo(() => emailRegex.test(email.trim()), [email]);

  const handleReset = () => {
    if (!isEmailValid) {
      setError('Enter a valid email address before continuing.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Reset email sent', 'We just sent a temporary password to your inbox.');
      router.push({
        pathname: '/auth/new-password',
        params: { email: email.trim() },
      });
    }, 500);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-6 pb-10 pt-8">
          <Text className="mt-3 text-4xl font-bold text-slate-900">Forgot password</Text>
          <Text className="mt-2 text-base text-slate-500">
            Enter the email linked to your Safarihills account so we can send you a new password.
          </Text>

          <View className="mt-10">
            <Text className="text-sm font-medium text-slate-600">Email</Text>
            <TextInput
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-4 text-base text-slate-900"
              autoCapitalize="none"
              inputMode="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError(null);
              }}
            />
            {email.length > 0 && !isEmailValid ? (
              <Text className="mt-2 text-sm font-medium text-red-500">
                Enter a valid email address.
              </Text>
            ) : null}
          </View>

          {error ? (
            <Text className="mt-4 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm font-medium text-red-600">
              {error}
            </Text>
          ) : null}

          <Pressable
            className={`mt-10 items-center justify-center rounded-full py-4 ${
              isEmailValid ? 'bg-blue-600' : 'bg-blue-100'
            }`}
            disabled={!isEmailValid || isSubmitting}
            onPress={handleReset}>
            <Text className={`text-base font-semibold ${isEmailValid ? 'text-white' : 'text-blue-400'}`}>
              {isSubmitting ? 'Sending...' : 'Reset password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
