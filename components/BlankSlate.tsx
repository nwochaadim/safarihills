import { Feather } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type BlankSlateAction = {
  label: string;
  onPress: () => void;
};

type BlankSlateProps = {
  title: string;
  description?: string;
  iconName?: keyof typeof Feather.glyphMap;
  primaryAction?: BlankSlateAction;
  secondaryAction?: BlankSlateAction;
};

export function BlankSlate({
  title,
  description,
  iconName = 'calendar',
  primaryAction,
  secondaryAction,
}: BlankSlateProps) {
  return (
    <View className="items-center rounded-3xl border border-blue-100 bg-white px-6 py-10 shadow-sm shadow-blue-100">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-blue-100">
        <Feather name={iconName} size={24} color="#1d4ed8" />
      </View>
      <Text className="mt-6 text-center text-2xl font-bold text-slate-900">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-slate-500">{description}</Text>
      ) : null}
      {primaryAction ? (
        <Pressable
          className="mt-6 w-full items-center justify-center rounded-full border border-blue-500/30 bg-blue-600 px-6 py-4 shadow-sm shadow-blue-200"
          onPress={primaryAction.onPress}>
          <Text className="text-base font-semibold text-white">{primaryAction.label}</Text>
        </Pressable>
      ) : null}
      {secondaryAction ? (
        <Pressable
          className="mt-3 w-full items-center justify-center rounded-full border border-blue-200 bg-white px-6 py-4 shadow-sm shadow-slate-100"
          onPress={secondaryAction.onPress}>
          <Text className="text-base font-semibold text-blue-700">{secondaryAction.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
