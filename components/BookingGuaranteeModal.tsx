import { Feather } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BookingGuaranteeModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function BookingGuaranteeModal({
  visible,
  onClose,
}: BookingGuaranteeModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      animationType="fade"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}>
      <View
        className="flex-1 bg-slate-950/65 px-5"
        style={{
          paddingTop: Math.max(insets.top + 12, 24),
          paddingBottom: Math.max(insets.bottom + 12, 24),
        }}>
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="flex-1 items-center justify-center">
          <View className="w-full max-w-[420px] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <View className="absolute -right-12 -top-10 h-32 w-32 rounded-full bg-blue-100" />
            <View className="absolute -left-10 top-28 h-28 w-28 rounded-full bg-emerald-100" />
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 24 }}>
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <View className="self-start rounded-full bg-slate-900 px-3 py-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                      Book with confidence
                    </Text>
                  </View>
                  <Text className="mt-4 text-[28px] font-bold leading-8 text-slate-950">
                    Your payment and stay are protected
                  </Text>
                  <Text className="mt-3 text-sm leading-6 text-slate-600">
                    Before you pay, here are the two promises that protect every SafariHills
                    booking.
                  </Text>
                </View>
                <Pressable
                  className="h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/90"
                  onPress={onClose}>
                  <Feather name="x" size={18} color="#0f172a" />
                </Pressable>
              </View>

              <View className="mt-6 gap-4">
                <View className="rounded-[26px] border border-blue-200 bg-blue-50 p-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Feather name="shield" size={18} color="#1d4ed8" />
                  </View>
                  <Text className="mt-4 text-base font-semibold text-slate-950">
                    Secure payment through Paystack
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    Pay securely with Paystack — your details are fully protected, and your payment is processed smoothly without interruptions.
                  </Text>
                </View>

                <View className="rounded-[26px] border border-emerald-200 bg-emerald-50 p-4">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white">
                    <Feather name="check-circle" size={18} color="#047857" />
                  </View>
                  <Text className="mt-4 text-base font-semibold text-slate-950">
                    Refund protection if the stay is not as promised
                  </Text>
                  <Text className="mt-2 text-sm leading-6 text-slate-600">
                    If your apartment doesn’t match the listing or essential amenities (power, water, security, AC) aren’t available at check-in, you’ll get a refund.
                  </Text>
                </View>
              </View>

              <View className="mt-6 rounded-2xl bg-slate-100 px-4 py-3">
                <Text className="text-xs leading-5 text-slate-500">
                  If the apartment matches the listing and all amenities are provided, change-of-mind cancellations aren’t refundable—but may be rescheduled in line with our policy.
                </Text>
              </View>

              <Pressable
                className="mt-6 items-center justify-center rounded-full bg-blue-600 px-5 py-4"
                onPress={onClose}>
                <Text className="text-base font-semibold text-white">
                  Continue to secure checkout
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}
