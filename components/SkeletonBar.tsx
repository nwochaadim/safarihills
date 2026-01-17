import { Animated, ViewStyle } from 'react-native';

type SkeletonBarProps = {
  pulse: Animated.Value;
  className?: string;
  style?: ViewStyle;
};

export function SkeletonBar({ pulse, className, style }: SkeletonBarProps) {
  return (
    <Animated.View
      className={`bg-slate-200 ${className ?? ''}`}
      style={[style, { opacity: pulse }]}
    />
  );
}
