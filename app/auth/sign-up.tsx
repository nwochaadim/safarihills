import { useMutation } from '@apollo/client';
import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIGNUP_GUEST } from '@/mutations/signupGuest';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COUNTRIES = [
  // Pinned countries
  { code: 'NG', name: 'Nigeria', callingCode: '234' },
  { code: 'GH', name: 'Ghana', callingCode: '233' },
  { code: 'GB', name: 'United Kingdom', callingCode: '44' },
  { code: 'US', name: 'United States', callingCode: '1' },

  // Alphabetically sorted list (A–Z)
  { code: 'AF', name: 'Afghanistan', callingCode: '93' },
  { code: 'AL', name: 'Albania', callingCode: '355' },
  { code: 'DZ', name: 'Algeria', callingCode: '213' },
  { code: 'AD', name: 'Andorra', callingCode: '376' },
  { code: 'AO', name: 'Angola', callingCode: '244' },
  { code: 'AG', name: 'Antigua and Barbuda', callingCode: '1-268' },
  { code: 'AR', name: 'Argentina', callingCode: '54' },
  { code: 'AM', name: 'Armenia', callingCode: '374' },
  { code: 'AU', name: 'Australia', callingCode: '61' },
  { code: 'AT', name: 'Austria', callingCode: '43' },
  { code: 'AZ', name: 'Azerbaijan', callingCode: '994' },

  { code: 'BS', name: 'Bahamas', callingCode: '1-242' },
  { code: 'BH', name: 'Bahrain', callingCode: '973' },
  { code: 'BD', name: 'Bangladesh', callingCode: '880' },
  { code: 'BB', name: 'Barbados', callingCode: '1-246' },
  { code: 'BY', name: 'Belarus', callingCode: '375' },
  { code: 'BE', name: 'Belgium', callingCode: '32' },
  { code: 'BZ', name: 'Belize', callingCode: '501' },
  { code: 'BJ', name: 'Benin', callingCode: '229' },
  { code: 'BT', name: 'Bhutan', callingCode: '975' },
  { code: 'BO', name: 'Bolivia', callingCode: '591' },
  { code: 'BA', name: 'Bosnia and Herzegovina', callingCode: '387' },
  { code: 'BW', name: 'Botswana', callingCode: '267' },
  { code: 'BR', name: 'Brazil', callingCode: '55' },
  { code: 'BN', name: 'Brunei', callingCode: '673' },
  { code: 'BG', name: 'Bulgaria', callingCode: '359' },
  { code: 'BF', name: 'Burkina Faso', callingCode: '226' },
  { code: 'BI', name: 'Burundi', callingCode: '257' },

  { code: 'KH', name: 'Cambodia', callingCode: '855' },
  { code: 'CM', name: 'Cameroon', callingCode: '237' },
  { code: 'CA', name: 'Canada', callingCode: '1' },
  { code: 'CV', name: 'Cape Verde', callingCode: '238' },
  { code: 'CF', name: 'Central African Republic', callingCode: '236' },
  { code: 'TD', name: 'Chad', callingCode: '235' },
  { code: 'CL', name: 'Chile', callingCode: '56' },
  { code: 'CN', name: 'China', callingCode: '86' },
  { code: 'CO', name: 'Colombia', callingCode: '57' },
  { code: 'KM', name: 'Comoros', callingCode: '269' },
  { code: 'CG', name: 'Congo', callingCode: '242' },
  { code: 'CR', name: 'Costa Rica', callingCode: '506' },
  { code: 'HR', name: 'Croatia', callingCode: '385' },
  { code: 'CU', name: 'Cuba', callingCode: '53' },
  { code: 'CY', name: 'Cyprus', callingCode: '357' },
  { code: 'CZ', name: 'Czech Republic', callingCode: '420' },

  { code: 'DK', name: 'Denmark', callingCode: '45' },
  { code: 'DJ', name: 'Djibouti', callingCode: '253' },
  { code: 'DM', name: 'Dominica', callingCode: '1-767' },
  { code: 'DO', name: 'Dominican Republic', callingCode: '1-809' },

  { code: 'EC', name: 'Ecuador', callingCode: '593' },
  { code: 'EG', name: 'Egypt', callingCode: '20' },
  { code: 'SV', name: 'El Salvador', callingCode: '503' },
  { code: 'GQ', name: 'Equatorial Guinea', callingCode: '240' },
  { code: 'ER', name: 'Eritrea', callingCode: '291' },
  { code: 'EE', name: 'Estonia', callingCode: '372' },
  { code: 'ET', name: 'Ethiopia', callingCode: '251' },

  { code: 'FJ', name: 'Fiji', callingCode: '679' },
  { code: 'FI', name: 'Finland', callingCode: '358' },
  { code: 'FR', name: 'France', callingCode: '33' },

  { code: 'GA', name: 'Gabon', callingCode: '241' },
  { code: 'GM', name: 'Gambia', callingCode: '220' },
  { code: 'GE', name: 'Georgia', callingCode: '995' },
  { code: 'DE', name: 'Germany', callingCode: '49' },
  { code: 'GR', name: 'Greece', callingCode: '30' },
  { code: 'GD', name: 'Grenada', callingCode: '1-473' },
  { code: 'GT', name: 'Guatemala', callingCode: '502' },
  { code: 'GN', name: 'Guinea', callingCode: '224' },
  { code: 'GW', name: 'Guinea-Bissau', callingCode: '245' },
  { code: 'GY', name: 'Guyana', callingCode: '592' },

  { code: 'HT', name: 'Haiti', callingCode: '509' },
  { code: 'HN', name: 'Honduras', callingCode: '504' },
  { code: 'HU', name: 'Hungary', callingCode: '36' },

  { code: 'IS', name: 'Iceland', callingCode: '354' },
  { code: 'IN', name: 'India', callingCode: '91' },
  { code: 'ID', name: 'Indonesia', callingCode: '62' },
  { code: 'IR', name: 'Iran', callingCode: '98' },
  { code: 'IQ', name: 'Iraq', callingCode: '964' },
  { code: 'IE', name: 'Ireland', callingCode: '353' },
  { code: 'IL', name: 'Israel', callingCode: '972' },
  { code: 'IT', name: 'Italy', callingCode: '39' },

  { code: 'JM', name: 'Jamaica', callingCode: '1-876' },
  { code: 'JP', name: 'Japan', callingCode: '81' },
  { code: 'JO', name: 'Jordan', callingCode: '962' },

  { code: 'KZ', name: 'Kazakhstan', callingCode: '7' },
  { code: 'KE', name: 'Kenya', callingCode: '254' },
  { code: 'KW', name: 'Kuwait', callingCode: '965' },

  { code: 'LV', name: 'Latvia', callingCode: '371' },
  { code: 'LB', name: 'Lebanon', callingCode: '961' },
  { code: 'LS', name: 'Lesotho', callingCode: '266' },
  { code: 'LR', name: 'Liberia', callingCode: '231' },
  { code: 'LY', name: 'Libya', callingCode: '218' },
  { code: 'LT', name: 'Lithuania', callingCode: '370' },
  { code: 'LU', name: 'Luxembourg', callingCode: '352' },

  { code: 'MG', name: 'Madagascar', callingCode: '261' },
  { code: 'MW', name: 'Malawi', callingCode: '265' },
  { code: 'MY', name: 'Malaysia', callingCode: '60' },
  { code: 'ML', name: 'Mali', callingCode: '223' },
  { code: 'MT', name: 'Malta', callingCode: '356' },
  { code: 'MU', name: 'Mauritius', callingCode: '230' },
  { code: 'MX', name: 'Mexico', callingCode: '52' },
  { code: 'MA', name: 'Morocco', callingCode: '212' },
  { code: 'MZ', name: 'Mozambique', callingCode: '258' },

  { code: 'NA', name: 'Namibia', callingCode: '264' },
  { code: 'NP', name: 'Nepal', callingCode: '977' },
  { code: 'NL', name: 'Netherlands', callingCode: '31' },
  { code: 'NZ', name: 'New Zealand', callingCode: '64' },
  { code: 'NE', name: 'Niger', callingCode: '227' },
  { code: 'NO', name: 'Norway', callingCode: '47' },

  { code: 'OM', name: 'Oman', callingCode: '968' },

  { code: 'PK', name: 'Pakistan', callingCode: '92' },
  { code: 'PA', name: 'Panama', callingCode: '507' },
  { code: 'PE', name: 'Peru', callingCode: '51' },
  { code: 'PH', name: 'Philippines', callingCode: '63' },
  { code: 'PL', name: 'Poland', callingCode: '48' },
  { code: 'PT', name: 'Portugal', callingCode: '351' },

  { code: 'QA', name: 'Qatar', callingCode: '974' },

  { code: 'RO', name: 'Romania', callingCode: '40' },
  { code: 'RU', name: 'Russia', callingCode: '7' },

  { code: 'SA', name: 'Saudi Arabia', callingCode: '966' },
  { code: 'SN', name: 'Senegal', callingCode: '221' },
  { code: 'RS', name: 'Serbia', callingCode: '381' },
  { code: 'SG', name: 'Singapore', callingCode: '65' },
  { code: 'ZA', name: 'South Africa', callingCode: '27' },
  { code: 'ES', name: 'Spain', callingCode: '34' },
  { code: 'LK', name: 'Sri Lanka', callingCode: '94' },
  { code: 'SE', name: 'Sweden', callingCode: '46' },
  { code: 'CH', name: 'Switzerland', callingCode: '41' },

  { code: 'TZ', name: 'Tanzania', callingCode: '255' },
  { code: 'TH', name: 'Thailand', callingCode: '66' },
  { code: 'TG', name: 'Togo', callingCode: '228' },
  { code: 'TN', name: 'Tunisia', callingCode: '216' },
  { code: 'TR', name: 'Turkey', callingCode: '90' },

  { code: 'UG', name: 'Uganda', callingCode: '256' },
  { code: 'UA', name: 'Ukraine', callingCode: '380' },
  { code: 'AE', name: 'United Arab Emirates', callingCode: '971' },
  { code: 'UY', name: 'Uruguay', callingCode: '598' },

  { code: 'VE', name: 'Venezuela', callingCode: '58' },
  { code: 'VN', name: 'Vietnam', callingCode: '84' },

  { code: 'ZM', name: 'Zambia', callingCode: '260' },
  { code: 'ZW', name: 'Zimbabwe', callingCode: '263' },
];


type CountryOption = (typeof COUNTRIES)[number];

type SignupGuestResponse = {
  signupGuest: {
    user: { id: string } | null;
    errors: unknown;
    nextStep: string | null;
  } | null;
};

type SignupGuestVariables = {
  signupGuest: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    referralCode?: string | null;
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

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const referralInputRef = useRef<TextInput>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
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

  const [signupGuest] = useMutation<SignupGuestResponse, SignupGuestVariables>(SIGNUP_GUEST);

  const [countryCode, setCountryCode] = useState('NG');
  const [callingCode, setCallingCode] = useState('234');
  const [countryName, setCountryName] = useState('Nigeria');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const modalMaxHeight = Math.min(560, Dimensions.get('window').height * 0.7);

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

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showListener = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardInset(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const focusInput = (inputRef: RefObject<TextInput>) => {
    if (Platform.OS !== 'android') return;
    const target = inputRef.current ? findNodeHandle(inputRef.current) : null;
    const scrollResponder = scrollViewRef.current?.getScrollResponder();
    if (!target || !scrollResponder) return;
    scrollResponder.scrollResponderScrollNativeHandleToKeyboard(target, 80, true);
  };

  const handleSelectCountry = (country: CountryOption) => {
    setCountryCode(country.code);
    setCallingCode(country.callingCode);
    setCountryName(country.name);
    setPickerVisible(false);
    setCountrySearch('');
  };

  const handleCreateAccount = async () => {
    if (!isFormValid || isSubmitting) {
      if (!isFormValid) {
        setErrorMessages(['Please complete all required fields.']);
      }
      return;
    }

    setIsSubmitting(true);
    setServerError(null);
    setErrorMessages([]);

    const trimmedEmail = email.trim().toLowerCase();
    const normalizedPhone = phoneNumber.replace(/[^\d]/g, '');
    const fullPhoneNumber = `+${callingCode}${normalizedPhone}`;

    try {
      const { data } = await signupGuest({
        variables: {
          signupGuest: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: trimmedEmail,
            password: password.trim(),
            phone: fullPhoneNumber,
            referralCode: referralCode.trim().length > 0 ? referralCode.trim() : null,
          },
        },
      });
      const response = data?.signupGuest;
      const errors = normalizeErrors(response?.errors);
      const nextStep = response?.nextStep ?? null;

      if (nextStep === 'otp') {
        router.replace({ pathname: '/auth/otp', params: { email: trimmedEmail } });
        return;
      }

      if (nextStep === 'login') {
        const errorMessage = errors.join(' ');
        router.replace(
          errorMessage
            ? { pathname: '/auth/login', params: { error: errorMessage } }
            : { pathname: '/auth/login' }
        );
        return;
      }

      if (errors.length) {
        if (errors.length === 1) {
          setServerError(errors[0]);
        } else {
          setErrorMessages(errors);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create account right now.';
      setServerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputWrapperClass = 'rounded-2xl border border-slate-200 bg-slate-50/50 px-4';
  const normalizedSearch = countrySearch.trim().toLowerCase();
  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) return COUNTRIES;
    return COUNTRIES.filter((country) => {
      const name = country.name.toLowerCase();
      const code = country.code.toLowerCase();
      const calling = country.callingCode.replace(/[^0-9]/g, '');
      const queryDigits = normalizedSearch.replace(/[^0-9]/g, '');
      return (
        name.includes(normalizedSearch) ||
        code.includes(normalizedSearch) ||
        (queryDigits && calling.includes(queryDigits))
      );
    });
  }, [normalizedSearch]);

  const keyboardOffset = Platform.OS === 'ios' ? insets.top : 0;
  const scrollPaddingBottom =
    40 + insets.bottom + (Platform.OS === 'android' ? keyboardInset : 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
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
                placeholder="John"
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
                placeholder="Franklin"
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
                  ref={passwordInputRef}
                  value={password}
                  onFocus={() => focusInput(passwordInputRef)}
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
                ref={referralInputRef}
                value={referralCode}
                onFocus={() => focusInput(referralInputRef)}
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
        <KeyboardAvoidingView
          className="flex-1 justify-end bg-black/30"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}>
          <View
            className="rounded-t-3xl bg-white px-6 pb-8 pt-4"
            style={{ maxHeight: modalMaxHeight }}>
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-slate-900">Select country</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <Text className="text-sm font-semibold text-blue-600">Close</Text>
              </Pressable>
            </View>
            <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4">
              <TextInput
                className="py-3 text-sm text-slate-900"
                placeholder="Search country or code"
                placeholderTextColor="#94a3b8"
                value={countrySearch}
                onChangeText={setCountrySearch}
              />
            </View>
            <ScrollView
              className="mt-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
              {filteredCountries.length === 0 ? (
                <View className="items-center rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-6">
                  <Text className="text-sm font-semibold text-slate-600">
                    No matches found.
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Try another country name or dialing code.
                  </Text>
                </View>
              ) : (
                filteredCountries.map((country) => (
                  <Pressable
                    key={country.code}
                    className="flex-row items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
                    onPress={() => handleSelectCountry(country)}>
                    <View>
                      <Text className="text-sm font-semibold text-slate-900">
                        {country.name}
                      </Text>
                      <Text className="text-xs text-slate-500">+{country.callingCode}</Text>
                    </View>
                    <Text className="text-sm font-semibold text-blue-600">{country.code}</Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
