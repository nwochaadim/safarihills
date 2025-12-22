import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', callingCode: '234' },
  { code: 'GH', name: 'Ghana', callingCode: '233' },
  { code: 'KE', name: 'Kenya', callingCode: '254' },
  { code: 'ZA', name: 'South Africa', callingCode: '27' },
];

type CountryOption = (typeof COUNTRIES)[number];

export default function SignUpScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [countryCode, setCountryCode] = useState('NG');
  const [callingCode, setCallingCode] = useState('234');
  const [countryName, setCountryName] = useState('Nigeria');
  const [pickerVisible, setPickerVisible] = useState(false);

  const isEmailValid = emailRegex.test(email.trim());
  const showEmailError = email.length > 0 && !isEmailValid;

  const isFormValid = useMemo(() => {
    return (
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      phoneNumber.trim().length > 0 &&
      email.trim().length > 0 &&
      password.trim().length > 0 &&
      isEmailValid
    );
  }, [firstName, lastName, phoneNumber, email, password, isEmailValid]);

  const resetErrors = () => {
    if (serverError) setServerError(null);
    if (errorMessages.length) setErrorMessages([]);
  };

  const handleSelectCountry = (country: CountryOption) => {
    setCountryCode(country.code);
    setCallingCode(country.callingCode);
    setCountryName(country.name);
    setPickerVisible(false);
  };

  const handleCreateAccount = () => {
    if (!isFormValid || isSubmitting) {
      if (!isFormValid) {
        setErrorMessages(['Please complete all required fields.']);
      }
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    setErrorMessages([]);

    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Account created', 'Your Safarihills account is ready.');
      router.replace('/auth/login');
    }, 500);
  };

  const inputWrapperClass = 'rounded-2xl border border-slate-200 bg-slate-50/50 px-4';

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View className="px-6 pt-8">
            <Pressable
              className="mb-4 w-12 items-center justify-center rounded-full border border-blue-100 bg-white/80 py-3"
              onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#1d4ed8" />
            </Pressable>

            {serverError ? (
              <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
                <Feather name="alert-triangle" size={20} color="#dc2626" />
                <Text className="flex-1 text-sm font-medium text-red-600">{serverError}</Text>
              </View>
            ) : null}

            {errorMessages.length ? (
              <View className="mb-4 flex-row items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4">
                <Feather name="alert-circle" size={20} color="#dc2626" />
                <View className="flex-1">
                  {errorMessages.map((message, index) => (
                    <Text key={`${message}-${index}`} className="text-sm font-medium text-red-600">
                      - {message}
                    </Text>
                  ))}
                </View>
              </View>
            ) : null}

            <Text className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-500">
              Safarihills
            </Text>
            <Text className="mt-3 text-4xl font-bold text-slate-900">Create an account</Text>
            <Text className="mt-2 text-base text-slate-500">
              Join Safarihills to unlock premium listings, rewards, and exclusive offers.
            </Text>
          </View>

          <View className="mt-10 flex-col gap-5 px-6 pb-4">
            <View>
              <Text className="text-sm font-medium text-slate-600">First name</Text>
              <TextInput
                className={`mt-2 ${inputWrapperClass} py-4 text-base text-slate-900`}
                placeholder="Adim"
                placeholderTextColor="#94a3b8"
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  resetErrors();
                }}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">Last name</Text>
              <TextInput
                className={`mt-2 ${inputWrapperClass} py-4 text-base text-slate-900`}
                placeholder="Eze"
                placeholderTextColor="#94a3b8"
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  resetErrors();
                }}
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">Phone number</Text>
              <View className="mt-2 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50/50">
                <Pressable
                  className="flex-row items-center gap-2 border-r border-slate-200 px-4 py-4"
                  onPress={() => setPickerVisible(true)}>
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100">
                    <Text className="text-xs font-semibold text-blue-700">{countryCode}</Text>
                  </View>
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">+{callingCode}</Text>
                    <Text className="text-[10px] text-slate-400">{countryName}</Text>
                  </View>
                  <Feather name="chevron-down" size={18} color="#475569" />
                </Pressable>
                <TextInput
                  className="flex-1 px-4 py-4 text-base text-slate-900"
                  placeholder="812 345 6789"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={(value) => {
                    setPhoneNumber(value.replace(/[^\d]/g, ''));
                    resetErrors();
                  }}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">Email</Text>
              <TextInput
                className={`mt-2 ${inputWrapperClass} py-4 text-base text-slate-900`}
                placeholder="you@example.com"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                inputMode="email"
                keyboardType="email-address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  resetErrors();
                }}
              />
              {showEmailError ? (
                <Text className="mt-2 text-sm font-medium text-red-500">
                  Enter a valid email address.
                </Text>
              ) : null}
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">Password</Text>
              <View className={`mt-2 flex-row items-center ${inputWrapperClass} pr-2`}>
                <TextInput
                  className="flex-1 py-4 text-base text-slate-900"
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    resetErrors();
                  }}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  className="ml-2 p-2"
                  hitSlop={12}
                  accessibilityLabel="Toggle password visibility">
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={20} color="#1e3a8a" />
                </Pressable>
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-slate-600">
                Referral code <Text className="text-xs text-slate-400">(optional)</Text>
              </Text>
              <TextInput
                className={`mt-2 ${inputWrapperClass} py-4 text-base text-slate-900`}
                placeholder="Enter referral code"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                value={referralCode}
                onChangeText={(value) => {
                  setReferralCode(value);
                  resetErrors();
                }}
              />
            </View>
          </View>

          <View className="px-6">
            <Pressable
              className={`mt-10 items-center justify-center rounded-full py-4 ${
                isFormValid ? 'bg-blue-600' : 'bg-blue-100'
              }`}
              disabled={!isFormValid || isSubmitting}
              onPress={handleCreateAccount}>
              <Text className={`text-base font-semibold ${isFormValid ? 'text-white' : 'text-blue-400'}`}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent
        animationType="slide"
        visible={pickerVisible}
        onRequestClose={() => setPickerVisible(false)}>
        <View className="flex-1 justify-end bg-black/30">
          <View className="rounded-t-3xl bg-white px-6 pb-8 pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Select country</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <Text className="text-sm font-semibold text-blue-600">Close</Text>
              </Pressable>
            </View>
            <View className="mt-4 flex-col gap-3">
              {COUNTRIES.map((country) => (
                <Pressable
                  key={country.code}
                  className="flex-row items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                  onPress={() => handleSelectCountry(country)}>
                  <View>
                    <Text className="text-sm font-semibold text-slate-900">{country.name}</Text>
                    <Text className="text-xs text-slate-500">+{country.callingCode}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-blue-600">{country.code}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
