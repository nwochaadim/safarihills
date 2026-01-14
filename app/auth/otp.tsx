import { useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import * as SecureStore from 'expo-secure-store';

import { RESEND_GUEST_OTP } from '@/mutations/resendGuestOtp';
import { VERIFY_GUEST_OTP } from '@/mutations/verifyGuestOtp';
import { maybePromptForPushNotifications } from '@/lib/pushNotifications';

const OTP_LENGTH = 4;
const RESEND_INTERVAL_SECONDS = 60;

type VerifyGuestOtpResponse = {
  verifyGuestOtp: {
    errors: unknown;
    valid: boolean | null;
    token: string | null;
  } | null;
};

type VerifyGuestOtpVariables = {
  otp: {
    email: string;
    otpCode: string;
  };
};

type ResendGuestOtpResponse = {
  resendGuestOtp: {
    errors: unknown;
    success: boolean | null;
  } | null;
};

type ResendGuestOtpVariables = {
  input: {
    email: string;
  };
};

const normalizeErrors = (errors: unknown): string[] => {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return errors.map((item) => String(item)).filter((item) => item.trim().length > 0);
  }
  if (typeof errors === 'string') {
    return errors.trim().length ? [errors] : [];
  }
  if (typeof errors === 'object') {
    const values = Object.values(errors as Record<string, unknown>);
    return values
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value))
      .filter((value) => value.trim().length > 0);
  }
  return [String(errors)];
};

export default function OtpScreen() {
  const router = useRouter();
  const { email: emailParam, error: errorParam } = useLocalSearchParams<{
    email?: string | string[];
    error?: string | string[];
  }>();
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;
  const [otpValues, setOtpValues] = useState(Array(OTP_LENGTH).fill(''));
  const [resendTimer, setResendTimer] = useState(RESEND_INTERVAL_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const inputsRef = useRef<Array<TextInput | null>>([]);

  const [verifyGuestOtp] = useMutation<VerifyGuestOtpResponse, VerifyGuestOtpVariables>(
    VERIFY_GUEST_OTP
  );
  const [resendGuestOtp] = useMutation<ResendGuestOtpResponse, ResendGuestOtpVariables>(
    RESEND_GUEST_OTP
  );

  useEffect(() => {
    if (!errorParam) return;
    const message = Array.isArray(errorParam) ? errorParam[0] : errorParam;
    if (message && message !== error) {
      setError(message);
    }
  }, [errorParam, error]);

  useEffect(() => {
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev === 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (value: string, index: number) => {
    if (/^\d*$/.test(value)) {
      const digits = value.slice(-1);
      const nextValues = [...otpValues];
      nextValues[index] = digits;
      setOtpValues(nextValues);
      if (error) setError(null);

      if (digits && index < OTP_LENGTH - 1) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otpValues[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const otpCode = otpValues.join('');
  const isOtpComplete = otpCode.length === OTP_LENGTH;

  const handleVerify = async () => {
    if (!isOtpComplete || isSubmitting) return;
    if (!email) {
      setError('Email missing. Please restart verification.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await verifyGuestOtp({
        variables: {
          otp: {
            email,
            otpCode: otpCode,
          },
        },
      });
      const response = data?.verifyGuestOtp;
      const errors = normalizeErrors(response?.errors);
      if (errors.length) {
        setError(errors.join(' '));
        return;
      }
      if (response?.valid) {
        if (response.token) {
          await SecureStore.setItemAsync('authToken', response.token);
          void maybePromptForPushNotifications();
        }
        Alert.alert('Verification complete', 'Your account is now verified.');
        router.replace('/(tabs)/explore');
        return;
      }
      setError('Invalid or expired code. Please try again.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to verify the code.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || isResending) return;
    if (!email) {
      setError('Email missing. Please restart verification.');
      return;
    }

    setIsResending(true);
    setError(null);
    try {
      const { data } = await resendGuestOtp({
        variables: {
          input: {
            email,
          },
        },
      });
      const response = data?.resendGuestOtp;
      const errors = normalizeErrors(response?.errors);
      if (errors.length) {
        setError(errors.join(' '));
        return;
      }
      if (response?.success) {
        setOtpValues(Array(OTP_LENGTH).fill(''));
        inputsRef.current[0]?.focus();
        setResendTimer(RESEND_INTERVAL_SECONDS);
        Alert.alert('New code sent', 'Please check your inbox for the new code.');
        return;
      }
      setError('Unable to resend code. Please try again.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to resend the code.';
      setError(message);
    } finally {
      setIsResending(false);
    }
  };

  const formattedResendTimer = `${Math.floor(resendTimer / 60)}:${String(
    resendTimer % 60
  ).padStart(2, '0')}`;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-6 pb-10 pt-8">
          <Text className="mt-3 text-4xl font-bold text-slate-900">Verify your email</Text>
          <Text className="mt-3 text-base text-slate-500">
            We sent a verification code to{' '}
            <Text className="font-semibold text-slate-800">{email || 'your email'}</Text>. Enter it
            below to activate your account.
          </Text>

          <View className="mt-10 flex-row items-center justify-between">
            {otpValues.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputsRef.current[index] = ref;
                }}
                className={`h-16 w-16 rounded-2xl border text-center text-2xl font-semibold ${
                  digit ? 'border-blue-500 bg-blue-50 text-slate-900' : 'border-slate-200 bg-white text-slate-900'
                }`}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                returnKeyType="next"
                autoFocus={index === 0}
              />
            ))}
          </View>

          {error ? (
            <View className="mt-6 flex-row items-start gap-2">
              <Feather name="alert-circle" size={18} color="#dc2626" />
              <Text className="flex-1 text-sm font-medium text-red-600">{error}</Text>
            </View>
          ) : null}

          <View className="mt-6 flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm text-slate-500">
              Code expires in 5 minutes. Did not get it? Check spam or resend.
            </Text>
            <Pressable onPress={handleResend} disabled={resendTimer > 0 || isResending}>
              <Text
                className={`text-sm font-semibold ${
                  resendTimer > 0 || isResending ? 'text-slate-400' : 'text-blue-600'
                }`}>
                {resendTimer > 0
                  ? `Resend in ${formattedResendTimer}`
                  : isResending
                  ? 'Resending...'
                  : 'Resend code'}
              </Text>
            </Pressable>
          </View>

          <Pressable
            className={`mt-10 items-center justify-center rounded-full py-4 ${
              isOtpComplete ? 'bg-blue-600' : 'bg-blue-100'
            }`}
            disabled={!isOtpComplete || isSubmitting}
            onPress={handleVerify}>
            <Text className={`text-base font-semibold ${isOtpComplete ? 'text-white' : 'text-blue-400'}`}>
              {isSubmitting ? 'Verifying...' : 'Verify account'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
