import React, { ComponentProps } from 'react';
import { cssInterop } from 'nativewind';
import { SafeAreaView as BaseSafeAreaView } from 'react-native-safe-area-context';

const StyledSafeAreaView = cssInterop(BaseSafeAreaView, { className: 'style' });

type TabSafeAreaViewProps = ComponentProps<typeof StyledSafeAreaView>;

export function SafeAreaView({ edges, ...props }: TabSafeAreaViewProps) {
  return <StyledSafeAreaView edges={edges ?? ['top', 'left', 'right']} {...props} />;
}
