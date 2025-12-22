import { Feather } from '@expo/vector-icons';
import { Pressable } from 'react-native';

type BackButtonProps = {
  onPress: () => void;
};

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      className="h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-white/90"
      onPress={onPress}>
      <Feather name="arrow-left" size={16} color="#0f172a" />
    </Pressable>
  );
}
