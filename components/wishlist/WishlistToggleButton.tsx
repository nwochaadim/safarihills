import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, Text, View } from 'react-native';

type WishlistToggleButtonProps = {
  active: boolean;
  onPress: () => void;
  label?: string;
  variant?: 'overlay' | 'footer' | 'card';
};

export function WishlistToggleButton({
  active,
  onPress,
  label,
  variant = 'overlay',
}: WishlistToggleButtonProps) {
  const sizeClasses = label ? 'px-3.5 py-2.5' : 'h-10 w-10 items-center justify-center';
  const classes =
    variant === 'footer'
      ? active
        ? 'border-rose-200 bg-rose-50'
        : 'border-slate-200 bg-white'
      : variant === 'card'
        ? active
          ? 'border-rose-200 bg-white'
          : 'border-white/60 bg-white/90'
        : active
          ? 'border-rose-400 bg-rose-600'
          : 'border-white/60 bg-white/90';

  const iconColor =
    variant === 'overlay' ? (active ? '#ffffff' : '#be123c') : active ? '#be123c' : '#475569';
  const textColor = active ? '#be123c' : '#334155';

  return (
    <Pressable
      className={`rounded-full border shadow-sm shadow-slate-200 ${sizeClasses} ${classes}`}
      hitSlop={8}
      onPress={(event) => {
        event.stopPropagation();
        void Haptics.impactAsync(
          active ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
        );
        onPress();
      }}>
      <View className="flex-row items-center justify-center gap-2">
        <Feather name="heart" size={16} color={iconColor} />
        {label ? (
          <Text className="text-sm font-semibold" style={{ color: textColor }}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
