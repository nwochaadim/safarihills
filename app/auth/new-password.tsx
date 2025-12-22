import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
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

export default function NewPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isFormValid = useMemo(() => {
    return tempPassword.trim().length > 0 && newPassword.trim().length >= 6;
  }, [tempPassword, newPassword]);

  const clearErrors = () => {
    if (error) setError(null);
    if (serverError) setServerError(null);
  };

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting) {
      if (!isFormValid) {
        setError('Enter the temporary password and a new password with 6+ characters.');
      }
      return;
    }

    clearErrors();
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setServerError('Email is missing. Please return and enter your email.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Password updated', 'You can now log in with your new password.');
      router.replace('/auth/login');
    }, 600);
  };

  const handleResend = () => {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      setServerError('Email is missing. Please return and enter your email.');
      return;
    }

    setIsResending(true);
    setTimeout(() => {
      setIsResending(false);
      Alert.alert('Password resent', 'We just sent the temporary password to your email again.');
    }, 500);
  };

  const inputWrapperClass = 'rounded-2xl border border-slate-200 bg-slate-50/50 px-4';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-6 pb-10 pt-8">
          {serverError ? (
            <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
              <Feather name="alert-octagon" size={20} color="#b91c1c" />
              <Text className="flex-1 text-sm font-medium text-red-600">{serverError}</Text>
            </View>
          ) : null}

          <Text className="mt-3 text-4xl font-bold text-slate-900">Set a new password</Text>
          <Text className="mt-2 text-base text-slate-500">
            Enter the password sent to{' '}
            <Text className="font-semibold text-slate-800">{email || 'your email'}</Text>{' '}
            and create a new one you will remember.
          </Text>

          <Pressable
            className="mt-6 flex-row items-center justify-center rounded-full border border-blue-100 bg-blue-50/60 py-3"
            onPress={handleResend}
            disabled={isResending}>
            <Feather name="refresh-cw" size={18} color="#1d4ed8" />
            <Text className="ml-2 text-sm font-semibold text-blue-700">
              {isResending ? 'Resending...' : 'Resend password'}
            </Text>
          </Pressable>

          <View className="mt-10 flex-col gap-6">
            <View>
              <Text className="text-sm font-medium text-slate-600">Password from email</Text>
              <View className={`mt-2 flex-row items-center ${inputWrapperClass} pr-2`}>
                <TextInput
                  className="flex-1 py-4 text-base text-slate-900"
                  placeholder="Temporary password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showTempPassword}
                  value={tempPassword}
                  onChangeText={(value) => {
                    setTempPassword(value);
                    clearErrors();
                  }}
                />
                <Pressable
                  onPress={() => setShowTempPassword((prev) => !prev)}
                  className="ml-2 p-2"
                  hitSlop={12}
                  accessibilityLabel="Toggle temporary password visibility">
                  <Feather name={showTempPassword ? 'eye-off' : 'eye'} size={20} color="#1e3a8a" />
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">New password</Text>
              <View className={`mt-2 flex-row items-center ${inputWrapperClass} pr-2`}>
                <TextInput
                  className="flex-1 py-4 text-base text-slate-900"
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={(value) => {
                    setNewPassword(value);
                    clearErrors();
                  }}
                />
                <Pressable
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  className="ml-2 p-2"
                  hitSlop={12}
                  accessibilityLabel="Toggle new password visibility">
                  <Feather name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#1e3a8a" />
                </Pressable>
              </View>
              <Text className="mt-2 text-xs text-slate-400">
                Make it memorable, but keep it secure.
              </Text>
            </View>
          </View>

          {error ? (
            <Text className="mt-5 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm font-medium text-red-600">
              {error}
            </Text>
          ) : null}

          <Pressable
            className={`mt-10 items-center justify-center rounded-full py-4 ${
              isFormValid ? 'bg-blue-600' : 'bg-blue-100'
            }`}
            disabled={!isFormValid || isSubmitting}
            onPress={handleSubmit}>
            <Text className={`text-base font-semibold ${isFormValid ? 'text-white' : 'text-blue-400'}`}>
              {isSubmitting ? 'Updating...' : 'Update password'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
